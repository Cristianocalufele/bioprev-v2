import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";
import { StoreError } from "./storeDatabase";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const maximumImageBytes = 5 * 1024 * 1024;

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new StoreError(
      "O envio de imagens ainda não está configurado. Consulte o guia de configuração da loja.",
      503,
      "MEDIA_CONFIGURATION_REQUIRED",
    );
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return cloudName;
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

export function assertImageUpload(buffer: Buffer, mimeType: string) {
  if (!allowedMimeTypes.has(mimeType) || !hasValidImageSignature(buffer, mimeType)) {
    throw new StoreError("Formato de imagem não aceite. Use JPG, PNG, WebP ou AVIF.", 415, "INVALID_IMAGE_FORMAT");
  }
  if (buffer.length === 0 || buffer.length > maximumImageBytes) {
    throw new StoreError("A imagem tem de ter entre 1 byte e 5 MB.", 413, "IMAGE_SIZE_LIMIT");
  }
}

export function cloudinaryImageUrl(publicId: string): string | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName || !publicId.startsWith("bioprev/products/")) return null;
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/upload/f_auto,q_auto,w_800,c_limit/${publicId.split("/").map(encodeURIComponent).join("/")}`;
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
