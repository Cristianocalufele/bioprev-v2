import type { StoreCatalog } from "@shared/store";

export type AdminAccess = { isAdmin: true; email: string };
export type StoreAdminConfig = { tursoConfigured: boolean; cloudinaryConfigured: boolean };
export type UploadedProductImage = { publicId: string; imageUrl: string };

export class StoreApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = "StoreApiError";
  }
}

async function responseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new StoreApiError(
      typeof data.message === "string" ? data.message : "Não foi possível concluir o pedido.",
      response.status,
      typeof data.code === "string" ? data.code : undefined,
    );
  }
  return data as T;
}

export async function storeApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body && !(init.body instanceof FormData) && !(init.body instanceof Blob)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  return responseJson<T>(response);
}

export async function publicStoreCatalog(): Promise<StoreCatalog> {
  return storeApi<StoreCatalog>("/api/store/catalog");
}

export async function uploadProductImage(file: File): Promise<UploadedProductImage> {
  if (file.size > 5 * 1024 * 1024) {
    throw new StoreApiError("A imagem não pode exceder 5 MB.", 413, "IMAGE_SIZE_LIMIT");
  }
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
    throw new StoreApiError("Use uma imagem JPG, PNG, WebP ou AVIF.", 415, "INVALID_IMAGE_FORMAT");
  }
  const response = await fetch("/api/admin/media", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": file.type },
    body: file,
  });
  return responseJson<UploadedProductImage>(response);
}
