import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";
import { StoreError } from "./storeDatabase";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const maximumImageBytes = 5 * 1024 * 1024;
const maximumPdfBytes = 10 * 1024 * 1024;

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
    process.env.CLOUDINARY_API_KEY?.trim() &&
    process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new StoreError(
      "O envio de ficheiros ainda não está configurado. Consulte o guia de configuração da loja.",
      503,
      "MEDIA_CONFIGURATION_REQUIRED",
    );
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return cloudName;
}

export async function verifyCloudinaryHealth(): Promise<{
  configured: boolean;
  connected: boolean;
  error?: string;
}> {
  if (!isCloudinaryConfigured()) {
    return {
      configured: false,
      connected: false,
      error: "Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET nas variáveis de ambiente.",
    };
  }

  try {
    cloudinaryConfig();
    await cloudinary.api.ping();
    return { configured: true, connected: true };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      error: error instanceof Error ? error.message : "Não foi possível validar a ligação à Cloudinary.",
    };
  }
}

function hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/webp") return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (mimeType === "image/avif") {
    return buffer.toString("ascii", 4, 8) === "ftyp" && /^(avif|avis)$/.test(buffer.toString("ascii", 8, 12));
  }
  return false;
}

function hasValidPdfSignature(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

export function assertImageUpload(buffer: Buffer, mimeType: string) {
  if (!allowedMimeTypes.has(mimeType) || !hasValidImageSignature(buffer, mimeType)) {
    throw new StoreError("Formato de imagem não aceite. Use JPG, PNG, WebP ou AVIF.", 415, "INVALID_IMAGE_FORMAT");
  }
  if (buffer.length === 0 || buffer.length > maximumImageBytes) {
    throw new StoreError("A imagem tem de ter entre 1 byte e 5 MB.", 413, "IMAGE_SIZE_LIMIT");
  }
}

export function assertPdfUpload(buffer: Buffer, mimeType: string) {
  if (mimeType !== "application/pdf" || !hasValidPdfSignature(buffer)) {
    throw new StoreError("Envie um documento em formato PDF válido.", 415, "INVALID_PDF_FORMAT");
  }
  if (buffer.length === 0 || buffer.length > maximumPdfBytes) {
    throw new StoreError("A ficha técnica PDF não pode exceder 10 MB.", 413, "PDF_SIZE_LIMIT");
  }
}

export function cloudinaryImageUrl(publicId: string): string | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName || !publicId.startsWith("bioprev/products/")) return null;
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/upload/f_auto,q_auto,w_900,c_limit/${publicId.split("/").map(encodeURIComponent).join("/")}`;
}

export function cloudinaryDatasheetUrl(publicId: string): string | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName || !publicId.startsWith("bioprev/datasheets/")) return null;
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/raw/upload/${publicId.split("/").map(encodeURIComponent).join("/")}`;
}

export async function uploadProductImage(buffer: Buffer, mimeType: string): Promise<{ publicId: string; imageUrl: string }> {
  const cloudName = cloudinaryConfig();
  assertImageUpload(buffer, mimeType);
  const publicId = `bioprev/products/${randomUUID()}`;
  const uploaded = await new Promise<{ public_id: string; secure_url: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "bioprev/products",
        public_id: publicId.split("/").at(-1),
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
        overwrite: false,
        transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error || !result) return reject(new StoreError("A Cloudinary não conseguiu guardar a imagem.", 502, "MEDIA_UPLOAD_FAILED"));
        resolve(result);
      },
    ).end(buffer);
  });

  if (!uploaded.public_id.startsWith("bioprev/products/") || !uploaded.secure_url.startsWith(`https://res.cloudinary.com/${cloudName}/`)) {
    try {
      await deleteProductImage(uploaded.public_id);
    } catch {
      // Do not expose provider errors; this asset can be removed from Cloudinary later.
    }
    throw new StoreError("A resposta do serviço de imagens não passou na validação.", 502, "MEDIA_UPLOAD_INVALID_RESPONSE");
  }
  return { publicId: uploaded.public_id, imageUrl: uploaded.secure_url };
}

export async function deleteProductImage(publicId: string): Promise<void> {
  if (!publicId.startsWith("bioprev/products/") || publicId.includes("..")) {
    throw new StoreError("A imagem indicada não pertence ao catálogo da loja.", 400, "INVALID_IMAGE_ID");
  }
  cloudinaryConfig();
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new StoreError("Não foi possível remover a imagem da Cloudinary.", 502, "MEDIA_DELETE_FAILED");
  }
}

export async function uploadProductDatasheet(buffer: Buffer, mimeType: string): Promise<{ publicId: string; datasheetUrl: string }> {
  const cloudName = cloudinaryConfig();
  assertPdfUpload(buffer, mimeType);
  const fileKey = `${randomUUID()}.pdf`;
  const uploaded = await new Promise<{ public_id: string; secure_url: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "bioprev/datasheets",
        public_id: fileKey,
        resource_type: "raw",
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) return reject(new StoreError("A Cloudinary não conseguiu guardar o PDF da ficha técnica.", 502, "DATASHEET_UPLOAD_FAILED"));
        resolve(result);
      },
    ).end(buffer);
  });

  if (!uploaded.public_id.startsWith("bioprev/datasheets/") || !uploaded.secure_url.startsWith(`https://res.cloudinary.com/${cloudName}/`)) {
    try {
      await deleteProductDatasheet(uploaded.public_id);
    } catch {
      // Ignore cleanup failure
    }
    throw new StoreError("A resposta do serviço de ficheiros não passou na validação.", 502, "DATASHEET_INVALID_RESPONSE");
  }
  return { publicId: uploaded.public_id, datasheetUrl: uploaded.secure_url };
}

export async function deleteProductDatasheet(publicId: string): Promise<void> {
  if (!publicId.startsWith("bioprev/datasheets/") || publicId.includes("..")) {
    throw new StoreError("A ficha técnica indicada não pertence ao catálogo da loja.", 400, "INVALID_DATASHEET_ID");
  }
  cloudinaryConfig();
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: "raw", invalidate: true });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new StoreError("Não foi possível remover a ficha técnica da Cloudinary.", 502, "DATASHEET_DELETE_FAILED");
  }
}
