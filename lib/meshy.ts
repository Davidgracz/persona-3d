import { env } from "cloudflare:workers";

const MESHY_API = "https://api.meshy.ai";

type MeshyCreateResponse = { result: string };

export type MeshyTask = {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED";
  progress?: number;
  model_urls?: Record<string, string | undefined>;
  thumbnail_url?: string;
  image_urls?: string[];
  task_error?: { message?: string } | null;
};

function meshyKey() {
  const value = env.MESHY_API_KEY?.trim();
  if (!value) throw new Error("Brak konfiguracji MESHY_API_KEY.");
  return value;
}

async function meshyRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${MESHY_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${meshyKey()}`,
      ...(init?.headers ?? {}),
    },
  });
  const raw = await response.text();
  let payload: T & { message?: string };
  try {
    payload = JSON.parse(raw) as T & { message?: string };
  } catch {
    payload = { message: raw } as T & { message?: string };
  }
  if (!response.ok) {
    throw new Error(payload.message || `Meshy zwrócił błąd ${response.status}.`);
  }
  return payload;
}

export async function createRealisticModel(imageUrls: string[]) {
  const response = await meshyRequest<MeshyCreateResponse>("/openapi/v1/multi-image-to-3d", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_urls: imageUrls,
      ai_model: "latest",
      geometry_resolution: "standard",
      should_texture: true,
      enable_pbr: true,
      texture_resolution: "2k",
      target_formats: ["glb", "stl"],
      moderation: true,
    }),
  });
  return response.result;
}

export async function getRealisticModel(taskId: string) {
  return meshyRequest<MeshyTask>(
    `/openapi/v1/multi-image-to-3d/${encodeURIComponent(taskId)}`,
  );
}

export async function createFigurePrototype(imageUrl: string) {
  const response = await meshyRequest<MeshyCreateResponse>(
    "/openapi/creative-lab/figure/v1/prototype",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, remove_background: true }),
    },
  );
  return response.result;
}

export async function getFigurePrototype(taskId: string) {
  return meshyRequest<MeshyTask>(
    `/openapi/creative-lab/figure/v1/prototype/${encodeURIComponent(taskId)}`,
  );
}

export async function createFigureBuild(prototypeTaskId: string) {
  const response = await meshyRequest<MeshyCreateResponse>(
    "/openapi/creative-lab/figure/v1/build",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input_task_id: prototypeTaskId }),
    },
  );
  return response.result;
}

export async function getFigureBuild(taskId: string) {
  return meshyRequest<MeshyTask>(
    `/openapi/creative-lab/figure/v1/build/${encodeURIComponent(taskId)}`,
  );
}

export async function createStlConversion(inputTaskId: string) {
  const response = await meshyRequest<MeshyCreateResponse>("/openapi/v1/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input_task_id: inputTaskId, target_formats: ["stl"] }),
  });
  return response.result;
}

export async function getConversion(taskId: string) {
  return meshyRequest<MeshyTask>(`/openapi/v1/convert/${encodeURIComponent(taskId)}`);
}
