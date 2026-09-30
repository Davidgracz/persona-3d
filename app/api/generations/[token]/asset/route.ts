import { env } from "cloudflare:workers";
import { getOrderByToken } from "../../../../../lib/generation-pipeline";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token) || !env.BUCKET) {
    return new Response("Nie znaleziono pliku.", { status: 404 });
  }

  const format = new URL(request.url).searchParams.get("format");
  if (format !== "glb" && format !== "stl") {
    return new Response("Nieprawidłowy format.", { status: 400 });
  }

  const order = await getOrderByToken(token);
  if (!order || order.generationStatus !== "ready") {
    return new Response("Model nie jest jeszcze gotowy.", { status: 404 });
  }
  const key = format === "glb" ? order.glbKey : order.stlKey;
  if (!key) return new Response("Nie znaleziono pliku.", { status: 404 });

  const object = await env.BUCKET.get(key);
  if (!object) return new Response("Nie znaleziono pliku.", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", format === "glb" ? "model/gltf-binary" : "model/stl");
  headers.set(
    "Content-Disposition",
    `${format === "glb" ? "inline" : "attachment"}; filename="persona-3d-${order.id}.${format}"`,
  );
  headers.set("Cache-Control", "private, max-age=3600");
  headers.set("X-Content-Type-Options", "nosniff");
  if (object.httpEtag) headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}
