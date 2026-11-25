import express, { Router, type Response } from "express";
import { z } from "zod";
import {
  adminOrderInputSchema,
  adminOrderUpdateSchema,
  categoryPayloadSchema,
  customerInputSchema,
  customerUpdateSchema,
  productPayloadSchema,
  publicOrderInputSchema,
  type StoreMetricsPeriod,
} from "../shared/store";
import {
  getAdminAuthStatus,
  requireStoreAdmin,
  setupInitialPasscode,
  verifyAdminPasscodeLogin,
  type AdminRequest,
} from "./storeAuth";
import { StoreError, verifyTursoHealth } from "./storeDatabase";
import {
  createAdminCustomer,
  createAdminOrder,
  createCategory,
  createProduct,
  createPublicOrder,
  deleteAdminOrder,
  deleteCategory,
  deleteProduct,
  getAdminCustomerOrders,
  getAdminStoreCatalog,
  getAdminStoreMetrics,
  getPublicProductBySlug,
  getPublicStoreCatalog,
  listAdminCustomers,
  listAdminOrders,
  updateAdminCustomer,
  updateAdminOrder,
  updateCategory,
  updateProduct,
} from "./storeRepository";
import {
  assertImageUpload,
  assertPdfUpload,
  deleteProductDatasheet,
  deleteProductImage,
  uploadProductDatasheet,
  uploadProductImage,
  verifyCloudinaryHealth,
} from "./storeMedia";
import {
  getCodeCatalogSummary,
  syncCodeCatalogToTursoAndCloudinary,
} from "./storeSync";

const router = Router();
const uuidSchema = z.string().uuid();
const slugSchema = z.string().trim().min(1).max(140).regex(/^[a-z0-9-]+$/i);
const passcodeSetupSchema = z.object({
  passcode: z.string().trim().min(6, "A palavra-passe deve ter pelo menos 6 caracteres.").max(128),
});
const passcodeLoginSchema = z.object({
  passcode: z.string().trim().min(1, "Indique a palavra-passe.").max(128),
});

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

router.get("/api/store/products/:slug", async (req, res) => {
  try {
    const slug = slugSchema.parse(req.params.slug);
    const result = await getPublicProductBySlug(slug);
    return result
      ? res.json(result)
      : res.status(404).json({ message: "O artigo não foi encontrado." });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/api/store/orders", async (req, res) => {
  try {
    const payload = publicOrderInputSchema.parse(req.body);
    const order = await createPublicOrder(payload);
    return res.status(201).json({ order });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/api/admin/auth/status", async (_req, res) => {
  return run(res, getAdminAuthStatus);
});

router.post("/api/admin/auth/setup", async (req, res) => {
  try {
    const { passcode } = passcodeSetupSchema.parse(req.body);
    const token = await setupInitialPasscode(passcode);
    return res.status(201).json({
      token,
      email: process.env.ADMIN_EMAIL?.trim() || "admin@bioprev.ao",
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/api/admin/auth/login", async (req, res) => {
  try {
    const { passcode } = passcodeLoginSchema.parse(req.body);
    const token = await verifyAdminPasscodeLogin(passcode);
    return res.json({
      token,
      email: process.env.ADMIN_EMAIL?.trim() || "admin@bioprev.ao",
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/api/admin/access", requireStoreAdmin, (req, res) => {
  return res.json({ isAdmin: true, email: (req as AdminRequest).storeAdminEmail });
});

const syncPayloadSchema = z.object({
  overwriteImages: z.boolean().optional().default(false),
});

router.get("/api/admin/config", requireStoreAdmin, async (_req, res) => {
  const [turso, cloudinary] = await Promise.all([
    verifyTursoHealth(),
    verifyCloudinaryHealth(),
  ]);

  return res.json({
    tursoConfigured: turso.configured,
    tursoConnected: turso.connected,
    tursoLatencyMs: turso.latencyMs ?? null,
    tursoError: turso.error ?? null,
    cloudinaryConfigured: cloudinary.configured,
    cloudinaryConnected: cloudinary.connected,
    cloudinaryError: cloudinary.error ?? null,
    syncReady: turso.connected && cloudinary.connected,
    secretPasscodeConfigured: Boolean(process.env.ADMIN_PASSCODE?.trim() || process.env.ADMIN_PASSWORD?.trim()),
    authMode: "passcode",
    codeCatalogSummary: getCodeCatalogSummary(),
  });
});

router.post("/api/admin/sync", requireStoreAdmin, async (req, res) => {
  try {
    const payload = syncPayloadSchema.parse(req.body ?? {});
    const result = await syncCodeCatalogToTursoAndCloudinary(payload);
    return res.json(result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/api/admin/catalog", requireStoreAdmin, async (_req, res) => {
  return run(res, getAdminStoreCatalog);
});

router.get("/api/admin/metrics", requireStoreAdmin, async (req, res) => {
  const rawPeriod = typeof req.query.period === "string" ? req.query.period : "30d";
  const period: StoreMetricsPeriod =
    rawPeriod === "7d" || rawPeriod === "30d" || rawPeriod === "all" ? rawPeriod : "30d";
  return run(res, () => getAdminStoreMetrics(period));
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

router.post(
  "/api/admin/datasheet",
  requireStoreAdmin,
  express.raw({
    type: ["application/pdf"],
    limit: "10mb",
  }),
  async (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body)) {
        throw new StoreError("Envie um documento PDF válido (máx. 10 MB).", 415, "INVALID_PDF_FORMAT");
      }
      const mimeType = req.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
      assertPdfUpload(req.body, mimeType);
      return res.status(201).json(await uploadProductDatasheet(req.body, mimeType));
    } catch (error) {
      return sendError(res, error);
    }
  },
);

router.delete("/api/admin/datasheet", requireStoreAdmin, async (req, res) => {
  try {
    const publicId = z.string().regex(/^bioprev\/datasheets\/[A-Za-z0-9_.-]+$/).parse(req.body?.publicId);
    await deleteProductDatasheet(publicId);
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

    let imageCleanupWarning = false;
    for (const oldImageId of result.removedImagePublicIds) {
      try {
        await deleteProductImage(oldImageId);
      } catch {
        imageCleanupWarning = true;
      }
    }
    if (result.previousDatasheetPublicId) {
      try {
        await deleteProductDatasheet(result.previousDatasheetPublicId);
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
    for (const imageId of result.imagePublicIds) {
      try {
        await deleteProductImage(imageId);
      } catch {
        imageCleanupWarning = true;
      }
    }
    if (result.datasheetPublicId) {
      try {
        await deleteProductDatasheet(result.datasheetPublicId);
      } catch {
        imageCleanupWarning = true;
      }
    }
    return res.json({ deleted: true, imageCleanupWarning });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/api/admin/orders", requireStoreAdmin, async (_req, res) => {
  return run(res, listAdminOrders);
});

router.post("/api/admin/orders", requireStoreAdmin, async (req, res) => {
  try {
    const payload = adminOrderInputSchema.parse(req.body);
    return res.status(201).json(await createAdminOrder(payload));
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch("/api/admin/orders/:id", requireStoreAdmin, async (req, res) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const payload = adminOrderUpdateSchema.parse(req.body);
    const updated = await updateAdminOrder(id, payload);
    return updated ? res.json(updated) : res.status(404).json({ message: "O pedido não foi encontrado." });
  } catch (error) {
    return sendError(res, error);
  }
});

router.delete("/api/admin/orders/:id", requireStoreAdmin, async (req, res) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const deleted = await deleteAdminOrder(id);
    return deleted ? res.status(204).end() : res.status(404).json({ message: "O pedido não foi encontrado." });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/api/admin/customers", requireStoreAdmin, async (_req, res) => {
  return run(res, listAdminCustomers);
});

router.post("/api/admin/customers", requireStoreAdmin, async (req, res) => {
  try {
    const payload = customerInputSchema.parse(req.body);
    return res.status(201).json(await createAdminCustomer(payload));
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch("/api/admin/customers/:id", requireStoreAdmin, async (req, res) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const payload = customerUpdateSchema.parse(req.body);
    const updated = await updateAdminCustomer(id, payload);
    return updated ? res.json(updated) : res.status(404).json({ message: "O cliente não foi encontrado." });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/api/admin/customers/:id/orders", requireStoreAdmin, async (req, res) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    return res.json(await getAdminCustomerOrders(id));
  } catch (error) {
    return sendError(res, error);
  }
});

export function registerStoreRoutes() {
  return router;
}
