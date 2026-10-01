import { env } from "cloudflare:workers";
import {
  GENERATION_CURRENCY,
  GENERATION_PRICE_CENTS,
  type GenerationStyle,
  styleLabel,
} from "./generator-config";

const STRIPE_API = "https://api.stripe.com/v1";

type StripeErrorPayload = {
  error?: { message?: string };
};

export type StripeCheckoutSession = {
  id: string;
  url?: string | null;
  client_reference_id?: string | null;
  customer_email?: string | null;
  payment_status?: "paid" | "unpaid" | "no_payment_required" | string;
  payment_intent?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  metadata?: Record<string, string> | null;
};

function stripeKey() {
  const value = env.STRIPE_SECRET_KEY?.trim();
  if (!value) throw new Error("Brak konfiguracji STRIPE_SECRET_KEY.");
  return value;
}

async function stripeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${STRIPE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json()) as T & StripeErrorPayload;
  if (!response.ok) {
    throw new Error(payload.error?.message || "Stripe odrzucił żądanie.");
  }
  return payload;
}

const LOCAL_DUMMY_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "terminal.local",
]);

export function dummyPaymentsConfigured() {
  return env.DUMMY_PAYMENTS?.trim().toLowerCase() === "true";
}

export function dummyPaymentsAllowed(requestUrl: string | URL) {
  if (!dummyPaymentsConfigured()) return false;

  try {
    const hostname = new URL(requestUrl).hostname.toLowerCase();
    const localHost =
      LOCAL_DUMMY_HOSTS.has(hostname) || hostname.endsWith(".localhost");
    const remoteTunnelAllowed =
      env.REMOTE_DUMMY_PAYMENTS?.trim().toLowerCase() === "true" &&
      hostname.endsWith(".trycloudflare.com");

    return localHost || remoteTunnelAllowed;
  } catch {
    return false;
  }
}

export function paymentIntegrationReady(requestUrl: string | URL) {
  if (dummyPaymentsAllowed(requestUrl)) return true;
  return Boolean(
    env.STRIPE_SECRET_KEY?.trim() &&
      env.STRIPE_WEBHOOK_SECRET?.trim() &&
      env.MESHY_API_KEY?.trim(),
  );
}

export async function createCheckoutSession(input: {
  orderId: string;
  publicToken: string;
  email: string;
  style: GenerationStyle;
  origin: string;
}) {
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("locale", "pl");
  body.set("payment_method_types[0]", "blik");
  body.set("customer_email", input.email);
  body.set("client_reference_id", input.orderId);
  body.set(
    "success_url",
    `${input.origin}/generator/${input.publicToken}?session_id={CHECKOUT_SESSION_ID}`,
  );
  body.set("cancel_url", `${input.origin}/generator?payment=cancelled`);
  body.set("line_items[0][price_data][currency]", GENERATION_CURRENCY);
  body.set(
    "line_items[0][price_data][product_data][name]",
    `Automatyczny model 3D — ${styleLabel(input.style)}`,
  );
  body.set(
    "line_items[0][price_data][product_data][description]",
    "Generowanie z fotografii, podgląd 3D oraz pliki GLB i STL do pobrania.",
  );
  body.set("line_items[0][price_data][unit_amount]", String(GENERATION_PRICE_CENTS));
  body.set("line_items[0][quantity]", "1");
  body.set("metadata[generation_id]", input.orderId);
  body.set("metadata[public_token]", input.publicToken);
  body.set("metadata[style]", input.style);
  body.set("payment_intent_data[metadata][generation_id]", input.orderId);
  body.set("payment_intent_data[metadata][public_token]", input.publicToken);

  return stripeRequest<StripeCheckoutSession>("/checkout/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `persona3d-checkout-${input.orderId}`,
    },
    body,
  });
}

export async function retrieveCheckoutSession(sessionId: string) {
  return stripeRequest<StripeCheckoutSession>(
    `/checkout/sessions/${encodeURIComponent(sessionId)}`,
  );
}

function hexToBytes(value: string) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export async function verifyStripeSignature(rawBody: string, signatureHeader: string | null) {
  const secret = env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;

  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;

  const timestampNumber = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(timestampNumber)) return false;
  if (Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${timestamp}.${rawBody}`),
    ),
  );

  return signatures.some((signature) => {
    const supplied = hexToBytes(signature);
    return supplied ? timingSafeEqual(expected, supplied) : false;
  });
}
