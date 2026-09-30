import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { generationOrders } from "../db/schema";
import type { GenerationStyle } from "./generator-config";
import {
  createFigureBuild,
  createFigurePrototype,
  createRealisticModel,
  createStlConversion,
  getConversion,
  getFigureBuild,
  getFigurePrototype,
  getRealisticModel,
  type MeshyTask,
} from "./meshy";
import {
  dummyPaymentsAllowed,
  retrieveCheckoutSession,
  type StripeCheckoutSession,
} from "./stripe";

type GenerationOrder = typeof generationOrders.$inferSelect;

type PhotoMetadata = {
  key: string;
  originalName: string;
  type: string;
  size: number;
};

export type PublicGenerationStatus = {
  id: string;
  style: GenerationStyle;
  paymentStatus: string;
  generationStatus: string;
  progress: number;
  message: string;
  ready: boolean;
  failed: boolean;
  glbUrl?: string;
  stlUrl?: string;
};

function now() {
  return new Date().toISOString();
}

function parsePhotos(value: string): PhotoMetadata[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is PhotoMetadata =>
            Boolean(
              item &&
                typeof item === "object" &&
                "key" in item &&
                typeof item.key === "string" &&
                "type" in item &&
                typeof item.type === "string",
            ),
        )
      : [];
  } catch {
    return [];
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + chunkSize)));
  }
  return btoa(chunks.join(""));
}

async function loadInputDataUris(order: GenerationOrder) {
  if (!env.BUCKET) throw new Error("Magazyn zdjęć jest niedostępny.");
  const photos = parsePhotos(order.photoMetadata);
  if (photos.length === 0) throw new Error("Nie znaleziono zdjęć źródłowych.");

  const dataUris: string[] = [];
  for (const photo of photos) {
    const object = await env.BUCKET.get(photo.key);
    if (!object) throw new Error("Nie znaleziono jednego ze zdjęć źródłowych.");
    const bytes = await object.arrayBuffer();
    dataUris.push(`data:${photo.type};base64,${arrayBufferToBase64(bytes)}`);
  }
  return dataUris;
}

async function getOrderById(id: string) {
  const [order] = await getDb()
    .select()
    .from(generationOrders)
    .where(eq(generationOrders.id, id))
    .limit(1);
  return order;
}

export async function getOrderByToken(token: string) {
  const [order] = await getDb()
    .select()
    .from(generationOrders)
    .where(eq(generationOrders.publicToken, token))
    .limit(1);
  return order;
}

async function failOrder(id: string, publicMessage: string, error: unknown) {
  console.error("3D generation pipeline failed", id, error);
  await getDb()
    .update(generationOrders)
    .set({
      generationStatus: "failed",
      errorMessage: publicMessage,
      updatedAt: now(),
    })
    .where(eq(generationOrders.id, id));
}

function taskFailed(task: MeshyTask) {
  return task.status === "FAILED" || task.status === "CANCELED";
}

function taskErrorMessage(task: MeshyTask) {
  const detail = task.task_error?.message?.trim();
  return detail
    ? `Meshy nie mógł utworzyć modelu: ${detail}`
    : "Meshy nie mógł utworzyć modelu z przesłanych zdjęć.";
}

function safeProgress(value: number | undefined, minimum: number, maximum: number) {
  const progress = Number.isFinite(value) ? Number(value) : 0;
  return Math.max(minimum, Math.min(maximum, Math.round(progress)));
}

function assertMeshyAssetUrl(value: string) {
  const url = new URL(value);
  const trustedHost = url.hostname === "meshy.ai" || url.hostname.endsWith(".meshy.ai");
  if (url.protocol !== "https:" || !trustedHost) {
    throw new Error("Meshy zwrócił nieprawidłowy adres pliku.");
  }
  return url.toString();
}

async function archiveAsset(url: string, key: string, contentType: string) {
  if (!env.BUCKET) throw new Error("Magazyn modeli jest niedostępny.");
  const response = await fetch(assertMeshyAssetUrl(url));
  if (!response.ok || !response.body) {
    throw new Error(`Nie udało się zapisać pliku modelu (${response.status}).`);
  }
  await env.BUCKET.put(key, response.body, {
    httpMetadata: { contentType },
    customMetadata: { source: "meshy", archivedAt: now() },
  });
  return key;
}

async function cleanupSourcePhotos(order: GenerationOrder) {
  if (!env.BUCKET) return;
  const photos = parsePhotos(order.photoMetadata);
  await Promise.allSettled(photos.map((photo) => env.BUCKET!.delete(photo.key)));
}

async function markReady(order: GenerationOrder, values: { glbKey: string; stlKey: string }) {
  await cleanupSourcePhotos(order);
  await getDb()
    .update(generationOrders)
    .set({
      ...values,
      generationStatus: "ready",
      progress: 100,
      errorMessage: null,
      photoMetadata: "[]",
      completedAt: now(),
      updatedAt: now(),
    })
    .where(eq(generationOrders.id, order.id));
}

async function startGeneration(orderId: string) {
  const db = getDb();
  const claimed = await db
    .update(generationOrders)
    .set({ generationStatus: "starting", progress: 2, updatedAt: now() })
    .where(
      and(
        eq(generationOrders.id, orderId),
        eq(generationOrders.paymentStatus, "paid"),
        eq(generationOrders.generationStatus, "queued"),
      ),
    )
    .returning({ id: generationOrders.id });
  if (claimed.length === 0) return;

  const order = await getOrderById(orderId);
  if (!order) return;

  try {
    const images = await loadInputDataUris(order);
    if (order.style === "chibi") {
      const taskId = await createFigurePrototype(images[0]);
      await db
        .update(generationOrders)
        .set({
          meshyPrototypeTaskId: taskId,
          generationStatus: "prototype",
          progress: 6,
          updatedAt: now(),
        })
        .where(eq(generationOrders.id, order.id));
    } else {
      const taskId = await createRealisticModel(images);
      await db
        .update(generationOrders)
        .set({
          meshyModelTaskId: taskId,
          generationStatus: "generating",
          progress: 6,
          updatedAt: now(),
        })
        .where(eq(generationOrders.id, order.id));
    }
  } catch (error) {
    await failOrder(
      order.id,
      "Nie udało się uruchomić generowania. Zachowaj numer zamówienia i skontaktuj się z obsługą.",
      error,
    );
  }
}

function validatePaidSession(order: GenerationOrder, session: StripeCheckoutSession) {
  return (
    session.id === order.stripeSessionId &&
    session.client_reference_id === order.id &&
    session.metadata?.public_token === order.publicToken &&
    session.amount_total === order.priceCents &&
    session.currency?.toLowerCase() === order.currency &&
    session.payment_status === "paid"
  );
}

async function markPaid(order: GenerationOrder, session: StripeCheckoutSession) {
  if (!validatePaidSession(order, session)) {
    throw new Error("Nie udało się potwierdzić zgodności płatności z zamówieniem.");
  }

  await getDb()
    .update(generationOrders)
    .set({
      paymentStatus: "paid",
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      generationStatus: "queued",
      paidAt: now(),
      updatedAt: now(),
    })
    .where(
      and(
        eq(generationOrders.id, order.id),
        eq(generationOrders.paymentStatus, "pending"),
      ),
    );
  await startGeneration(order.id);
}

export async function confirmCheckoutForToken(token: string, sessionId: string) {
  const order = await getOrderByToken(token);
  if (!order) return null;
  if (order.stripeSessionId !== sessionId) {
    throw new Error("Sesja płatności nie pasuje do tego zamówienia.");
  }
  if (order.paymentStatus === "paid") return order;

  const session = await retrieveCheckoutSession(sessionId);
  if (session.payment_status === "paid") {
    await markPaid(order, session);
  }
  return getOrderByToken(token);
}

export async function confirmDummyPayment(token: string, requestUrl: string) {
  if (!dummyPaymentsAllowed(requestUrl)) {
    throw new Error("Testowe płatności BLIK nie są dostępne pod tym adresem.");
  }

  const order = await getOrderByToken(token);
  if (!order) return null;
  if (!order.stripeSessionId?.startsWith("dummy_")) {
    throw new Error("To zamówienie nie zostało utworzone w trybie testowym.");
  }

  if (order.paymentStatus !== "paid") {
    await getDb()
      .update(generationOrders)
      .set({
        paymentStatus: "paid",
        stripePaymentIntentId: `dummy_payment_${order.id}`,
        generationStatus: "queued",
        paidAt: now(),
        updatedAt: now(),
      })
      .where(
        and(
          eq(generationOrders.id, order.id),
          eq(generationOrders.paymentStatus, "pending"),
        ),
      );
  }

  await startGeneration(order.id);
  return getOrderByToken(token);
}

export async function handlePaidCheckoutSession(session: StripeCheckoutSession) {
  if (!session.id || session.payment_status !== "paid") return;
  const db = getDb();
  let [order] = await db
    .select()
    .from(generationOrders)
    .where(eq(generationOrders.stripeSessionId, session.id))
    .limit(1);

  if (!order && session.client_reference_id) {
    [order] = await db
      .select()
      .from(generationOrders)
      .where(eq(generationOrders.id, session.client_reference_id))
      .limit(1);
    if (order && !order.stripeSessionId) {
      await db
        .update(generationOrders)
        .set({ stripeSessionId: session.id, updatedAt: now() })
        .where(eq(generationOrders.id, order.id));
      order = { ...order, stripeSessionId: session.id };
    }
  }
  if (!order) return;
  await markPaid(order, session);
}

async function advanceRealistic(order: GenerationOrder) {
  if (!order.meshyModelTaskId) return;
  const task = await getRealisticModel(order.meshyModelTaskId);
  if (taskFailed(task)) {
    await failOrder(order.id, taskErrorMessage(task), task.task_error);
    return;
  }
  if (task.status !== "SUCCEEDED") {
    await getDb()
      .update(generationOrders)
      .set({
        generationStatus: "generating",
        progress: safeProgress(task.progress, 6, 94),
        updatedAt: now(),
      })
      .where(eq(generationOrders.id, order.id));
    return;
  }

  const glbUrl = task.model_urls?.glb;
  const stlUrl = task.model_urls?.stl;
  if (!glbUrl || !stlUrl) throw new Error("Meshy nie zwrócił plików GLB i STL.");
  await getDb()
    .update(generationOrders)
    .set({ generationStatus: "archiving", progress: 96, updatedAt: now() })
    .where(eq(generationOrders.id, order.id));
  const glbKey = `generated-models/${order.id}/model.glb`;
  const stlKey = `generated-models/${order.id}/model.stl`;
  await Promise.all([
    archiveAsset(glbUrl, glbKey, "model/gltf-binary"),
    archiveAsset(stlUrl, stlKey, "model/stl"),
  ]);
  await markReady(order, { glbKey, stlKey });
}

async function advanceChibi(order: GenerationOrder) {
  const db = getDb();
  if (order.meshyPrototypeTaskId && !order.meshyModelTaskId) {
    const prototype = await getFigurePrototype(order.meshyPrototypeTaskId);
    if (taskFailed(prototype)) {
      await failOrder(order.id, taskErrorMessage(prototype), prototype.task_error);
      return;
    }
    if (prototype.status !== "SUCCEEDED") {
      await db
        .update(generationOrders)
        .set({
          generationStatus: "prototype",
          progress: 6 + Math.round(safeProgress(prototype.progress, 0, 100) * 0.24),
          updatedAt: now(),
        })
        .where(eq(generationOrders.id, order.id));
      return;
    }

    const buildTaskId = await createFigureBuild(order.meshyPrototypeTaskId);
    await db
      .update(generationOrders)
      .set({
        meshyModelTaskId: buildTaskId,
        generationStatus: "building",
        progress: 32,
        updatedAt: now(),
      })
      .where(eq(generationOrders.id, order.id));
    return;
  }

  if (order.meshyModelTaskId && !order.meshyConvertTaskId) {
    const build = await getFigureBuild(order.meshyModelTaskId);
    if (taskFailed(build)) {
      await failOrder(order.id, taskErrorMessage(build), build.task_error);
      return;
    }
    if (build.status !== "SUCCEEDED") {
      await db
        .update(generationOrders)
        .set({
          generationStatus: "building",
          progress: 32 + Math.round(safeProgress(build.progress, 0, 100) * 0.5),
          updatedAt: now(),
        })
        .where(eq(generationOrders.id, order.id));
      return;
    }

    const glbUrl = build.model_urls?.glb;
    if (!glbUrl) throw new Error("Meshy nie zwrócił pliku GLB.");
    const glbKey = `generated-models/${order.id}/model.glb`;
    await archiveAsset(glbUrl, glbKey, "model/gltf-binary");
    const convertTaskId = await createStlConversion(order.meshyModelTaskId);
    await db
      .update(generationOrders)
      .set({
        glbKey,
        meshyConvertTaskId: convertTaskId,
        generationStatus: "converting",
        progress: 84,
        updatedAt: now(),
      })
      .where(eq(generationOrders.id, order.id));
    return;
  }

  if (order.meshyConvertTaskId) {
    const conversion = await getConversion(order.meshyConvertTaskId);
    if (taskFailed(conversion)) {
      await failOrder(
        order.id,
        "Model powstał, ale nie udało się przygotować pliku STL. Skontaktuj się z obsługą.",
        conversion.task_error,
      );
      return;
    }
    if (conversion.status !== "SUCCEEDED") {
      await db
        .update(generationOrders)
        .set({
          generationStatus: "converting",
          progress: 84 + Math.round(safeProgress(conversion.progress, 0, 100) * 0.12),
          updatedAt: now(),
        })
        .where(eq(generationOrders.id, order.id));
      return;
    }

    const stlUrl = conversion.model_urls?.stl;
    if (!stlUrl || !order.glbKey) throw new Error("Meshy nie zwrócił pliku STL.");
    const stlKey = `generated-models/${order.id}/model.stl`;
    await archiveAsset(stlUrl, stlKey, "model/stl");
    await markReady(order, { glbKey: order.glbKey, stlKey });
  }
}

export async function advanceGeneration(token: string) {
  let order = await getOrderByToken(token);
  if (!order) return null;
  if (order.paymentStatus !== "paid") return toPublicStatus(order);

  if (order.generationStatus === "queued") {
    await startGeneration(order.id);
    order = (await getOrderByToken(token)) ?? order;
  }

  if (["ready", "failed", "starting"].includes(order.generationStatus)) {
    return toPublicStatus(order);
  }

  try {
    if (order.style === "chibi") await advanceChibi(order);
    else await advanceRealistic(order);
  } catch (error) {
    await failOrder(
      order.id,
      "Generowanie zostało przerwane. Zachowaj numer zamówienia i skontaktuj się z obsługą.",
      error,
    );
  }

  return toPublicStatus((await getOrderByToken(token)) ?? order);
}

export function toPublicStatus(order: GenerationOrder): PublicGenerationStatus {
  const ready = order.generationStatus === "ready" && Boolean(order.glbKey && order.stlKey);
  const failed = order.generationStatus === "failed";
  const messages: Record<string, string> = {
    awaiting_payment: "Oczekujemy na potwierdzenie płatności BLIK.",
    queued: "Płatność potwierdzona. Generator ustawia zadanie w kolejce.",
    starting: "Płatność potwierdzona. Przekazujemy zdjęcia do Meshy.",
    prototype: "Meshy przygotowuje chibi-prototyp na podstawie zdjęcia.",
    building: "Prototyp gotowy. Meshy buduje teksturowany model 3D.",
    generating: "Meshy odtwarza postać i generuje teksturowany model 3D.",
    archiving: "Model jest gotowy. Zapisujemy bezpieczną kopię do pobrania.",
    converting: "Model jest gotowy. Przygotowujemy dodatkowy plik STL do druku.",
    ready: "Gotowe — obróć model w podglądzie albo pobierz pliki.",
    failed: order.errorMessage || "Nie udało się dokończyć generowania.",
  };

  return {
    id: order.id,
    style: order.style === "chibi" ? "chibi" : "realistic",
    paymentStatus: order.paymentStatus,
    generationStatus: order.generationStatus,
    progress: ready ? 100 : Math.max(0, Math.min(99, order.progress)),
    message: messages[order.generationStatus] || "Przetwarzamy zamówienie.",
    ready,
    failed,
    ...(ready
      ? {
          glbUrl: `/api/generations/${order.publicToken}/asset?format=glb`,
          stlUrl: `/api/generations/${order.publicToken}/asset?format=stl`,
        }
      : {}),
  };
}
