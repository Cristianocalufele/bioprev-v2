import type {
  StoreCatalog,
  StoreCustomer,
  StoreMetrics,
  StoreMetricsPeriod,
  StoreOrder,
  StoreProduct,
} from "@shared/store";

export type AdminAccess = { isAdmin: true; email: string };
export type StoreAdminConfig = {
  tursoConfigured: boolean;
  tursoConnected: boolean;
  tursoLatencyMs: number | null;
  tursoError: string | null;
  cloudinaryConfigured: boolean;
  cloudinaryConnected: boolean;
  cloudinaryError: string | null;
  syncReady: boolean;
  secretPasscodeConfigured: boolean;
  authMode: "passcode";
  codeCatalogSummary: {
    categories: number;
    products: number;
    productsWithLocalImages: number;
  };
};
export type StoreSyncItemResult = {
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  action: "criado" | "actualizado";
  imageStatus: "enviada_cloudinary" | "ja_ligada" | "sem_imagem_local";
  imagePublicId: string | null;
  imageUrl: string | null;
};
export type StoreSyncResult = {
  syncedAt: string;
  categoriesCreated: number;
  categoriesUpdated: number;
  productsCreated: number;
  productsUpdated: number;
  imagesUploaded: number;
  imagesAlreadyLinked: number;
  items: StoreSyncItemResult[];
};
export type AdminAuthStatus = {
  mode: "passcode";
  configured: boolean;
  needsSetup: boolean;
  usingSecretEnv: boolean;
};
export type UploadedProductImage = { publicId: string; imageUrl: string };
export type UploadedProductDatasheet = { publicId: string; datasheetUrl: string };

let inMemoryAdminToken: string | null = null;

export function setAdminToken(token: string | null) {
  inMemoryAdminToken = token;
}

export function getAdminToken(): string | null {
  return inMemoryAdminToken;
}

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
  const authHeaders: Record<string, string> = {};
  if (inMemoryAdminToken && url.startsWith("/api/admin")) {
    authHeaders.Authorization = `Bearer ${inMemoryAdminToken}`;
  }

  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...authHeaders,
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

export async function publicProductBySlug(slug: string): Promise<{
  product: StoreProduct;
  relatedProducts: StoreProduct[];
}> {
  return storeApi<{ product: StoreProduct; relatedProducts: StoreProduct[] }>(
    `/api/store/products/${encodeURIComponent(slug)}`,
  );
}

export async function submitStoreOrder(payload: {
  items: Array<{ productId: string; quantity: number }>;
  customerName: string;
  telephone: string;
  address: string;
  city: string;
  deliveryNotes: string;
}): Promise<{ order: StoreOrder }> {
  return storeApi<{ order: StoreOrder }>("/api/store/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadProductImage(file: File): Promise<UploadedProductImage> {
  if (file.size > 5 * 1024 * 1024) {
    throw new StoreApiError("A imagem não pode exceder 5 MB.", 413, "IMAGE_SIZE_LIMIT");
  }
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
    throw new StoreApiError("Use uma imagem JPG, PNG, WebP ou AVIF.", 415, "INVALID_IMAGE_FORMAT");
  }
  const headers: Record<string, string> = { "Content-Type": file.type };
  if (inMemoryAdminToken) {
    headers.Authorization = `Bearer ${inMemoryAdminToken}`;
  }
  const response = await fetch("/api/admin/media", {
    method: "POST",
    credentials: "include",
    headers,
    body: file,
  });
  return responseJson<UploadedProductImage>(response);
}

export async function uploadProductDatasheet(file: File): Promise<UploadedProductDatasheet> {
  if (file.size > 10 * 1024 * 1024) {
    throw new StoreApiError("A ficha técnica PDF não pode exceder 10 MB.", 413, "PDF_SIZE_LIMIT");
  }
  if (file.type !== "application/pdf") {
    throw new StoreApiError("Seleccione um ficheiro em formato PDF.", 415, "INVALID_PDF_FORMAT");
  }
  const headers: Record<string, string> = { "Content-Type": "application/pdf" };
  if (inMemoryAdminToken) {
    headers.Authorization = `Bearer ${inMemoryAdminToken}`;
  }
  const response = await fetch("/api/admin/datasheet", {
    method: "POST",
    credentials: "include",
    headers,
    body: file,
  });
  return responseJson<UploadedProductDatasheet>(response);
}

export async function runStoreSync(overwriteImages = false): Promise<StoreSyncResult> {
  return storeApi<StoreSyncResult>("/api/admin/sync", {
    method: "POST",
    body: JSON.stringify({ overwriteImages }),
  });
}

export async function fetchAdminCustomers(): Promise<StoreCustomer[]> {
  return storeApi<StoreCustomer[]>("/api/admin/customers");
}

export async function fetchCustomerOrders(customerId: string): Promise<StoreOrder[]> {
  return storeApi<StoreOrder[]>(`/api/admin/customers/${encodeURIComponent(customerId)}/orders`);
}

export async function fetchAdminMetrics(period: StoreMetricsPeriod): Promise<StoreMetrics> {
  return storeApi<StoreMetrics>(`/api/admin/metrics?period=${encodeURIComponent(period)}`);
}
