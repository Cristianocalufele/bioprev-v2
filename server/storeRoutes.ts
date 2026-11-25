import express, { Router, type Response } from "express";
import { z } from "zod";
import { categoryPayloadSchema, productPayloadSchema } from "@shared/store";
import { requireStoreAdmin, type AdminRequest } from "./storeAuth";
import { StoreError } from "./storeDatabase";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getAdminStoreCatalog,
  getPublicStoreCatalog,
  updateCategory,
  updateProduct,
} from "./storeRepository";
import { assertImageUpload, deleteProductImage, uploadProductImage } from "./storeMedia";

const router = Router();
const uuidSchema = z.string().uuid();

function sendError(res: Response, error: unknown) {
  if (error instanceof StoreError) {
    return res.status(error.status).json({ message: error.message, code: error.code });
  }
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: error.issues[0]?.message ?? "Os dados enviados não são válidos.", code: "VALIDATION_ERROR" });
  }
  const errorCode = (error as { code?: string } | null)?.code;
  if (typeof errorCode === "string" && errorCode.includes("CONSTRAINT")) {
    return res.status(409).json({ message: "Já existe um registo com estes dados ou a categoria ainda está a ser utilizada.", code: "STORE_CONFLICT" });
  }
  return res.status(500).json({ message: "Não foi possível concluir esta operação. Tente novamente.", code: "STORE_OPERATION_FAILED" });
}

async function run(res: Response, action: () => Promise<unknown>, status = 200) {
  try {
    return res.status(status).json(await action());
  } catch (error) {
    return sendError(res, error);
  }
}

router.get("/api/store/catalog", async (_req, res) => {
  return run(res, getPublicStoreCatalog);
});

router.get("/api/admin/access", requireStoreAdmin, (req, res) => {
  return res.json({ isAdmin: true, email: (req as AdminRequest).storeAdminEmail });
});

router.get("/api/admin/config", requireStoreAdmin, (_req, res) => {
  return res.json({
    tursoConfigured: Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN),
    cloudinaryConfigured: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
    ),
  });
});

router.get("/api/admin/catalog", requireStoreAdmin, async (_req, res) => {
  return run(res, getAdminStoreCatalog);
});

router.post("/api/admin/categories", requireStoreAdmin, async (req, res) => {
  try {
    return res.status(201).json(await createCategory(categoryPayloadSchema.parse(req.body)));
  } catch (error) {
    return sendError(res, error);
  }
});

router.put("/api/admin/categories/:id", requireStoreAdmin, async (req, res) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const category = await updateCategory(id, categoryPayloadSchema.parse(req.body));
    return category ? res.json(category) : res.status(404).json({ message: "A categoria não foi encontrada." });
  } catch (error) {
    return sendError(res, error);
  }
});

router.delete("/api/admin/categories/:id", requireStoreAdmin, async (req, res) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const deleted = await deleteCategory(id);
    return deleted
      ? res.status(204).end()
      : res.status(404).json({ message: "A categoria não foi encontrada." });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post(
  "/api/admin/media",
  requireStoreAdmin,
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    limit: "5mb",
  }),
  async (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body)) {
        throw new StoreError("Envie um ficheiro de imagem JPG, PNG, WebP ou AVIF.", 415, "INVALID_IMAGE_FORMAT");
      }
      const mimeType = req.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
      assertImageUpload(req.body, mimeType);
      return res.status(201).json(await uploadProductImage(req.body, mimeType));
    } catch (error) {
      return sendError(res, error);
    }
  },
);

router.delete("/api/admin/media", requireStoreAdmin, async (req, res) => {
  try {
    const publicId = z.string().regex(/^bioprev\/products\/[A-Za-z0-9_-]+$/).parse(req.body?.publicId);
    await deleteProductImage(publicId);
    return res.status(204).end();
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/api/admin/products", requireStoreAdmin, async (req, res) => {
  try {
    return res.status(201).json(await createProduct(productPayloadSchema.parse(req.body)));
  } catch (error) {
    return sendError(res, error);
  }
});

router.put("/api/admin/products/:id", requireStoreAdmin, async (req, res) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const result = await updateProduct(id, productPayloadSchema.parse(req.body));
    if (!result) return res.status(404).json({ message: "O artigo não foi encontrado." });

    const imageChanged = result.previousImagePublicId !== result.product.imagePublicId;
    let imageCleanupWarning = false;
    if (imageChanged && result.previousImagePublicId) {
      try {
        await deleteProductImage(result.previousImagePublicId);
      } catch {
        imageCleanupWarning = true;
      }
    }
    return res.json({ ...result.product, imageCleanupWarning });
  } catch (error) {
    return sendError(res, error);
  }
});

router.delete("/api/admin/products/:id", requireStoreAdmin, async (req, res) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const result = await deleteProduct(id);
    if (!result.deleted) return res.status(404).json({ message: "O artigo não foi encontrado." });
    let imageCleanupWarning = false;
    if (result.imagePublicId) {
      try {
        await deleteProductImage(result.imagePublicId);
      } catch {
        imageCleanupWarning = true;
      }
    }
    return res.json({ deleted: true, imageCleanupWarning });
  } catch (error) {
    return sendError(res, error);
  }
});

export function registerStoreRoutes() {
  return router;
}
