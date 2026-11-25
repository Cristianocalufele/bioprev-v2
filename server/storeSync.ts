import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  ensureStoreSchema,
  getStoreClient,
  initialCategories,
  initialProducts,
  StoreError,
  verifyTursoHealth,
} from "./storeDatabase";
import {
  cloudinaryImageUrl,
  uploadProductImage,
  verifyCloudinaryHealth,
} from "./storeMedia";

const productSeedImageFiles: Record<string, string> = {
  "estacao-monitorizacao": "product_estacao_monitorizacao_1795612260086.jpg",
  "armadilha-monitorizacao": "product_armadilha_monitorizacao_1795612259680.jpg",
  "pulverizador-manual": "product_pulverizador_manual_1795612261116.jpg",
  "utensilio-limpeza": "product_utensilio_limpeza_1795612261651.jpg",
  "luvas-protecao": "product_luvas_protecao_1795612261099.jpg",
  "oculos-protecao": "product_oculos_protecao_1795612264528.jpg",
};

function resolveAssetsImagesDir(): string {
  return path.resolve(import.meta.dirname, "..", "client", "src", "assets", "images");
}

async function readLocalProductImage(slug: string): Promise<Buffer | null> {
  const filename = productSeedImageFiles[slug];
  if (!filename) return null;

  const baseDir = resolveAssetsImagesDir();
  const resolved = path.resolve(baseDir, filename);
  if (!resolved.startsWith(baseDir + path.sep)) {
    throw new StoreError("Caminho de imagem inválido.", 400, "INVALID_SEED_IMAGE_PATH");
  }

  try {
    return await fs.readFile(resolved);
  } catch {
    return null;
  }
}

export function getCodeCatalogSummary() {
  return {
    categories: initialCategories.length,
    products: initialProducts.length,
    productsWithLocalImages: initialProducts.filter((p) => Boolean(productSeedImageFiles[p.slug])).length,
  };
}

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

export async function syncCodeCatalogToTursoAndCloudinary(options?: {
  overwriteImages?: boolean;
}): Promise<StoreSyncResult> {
  const overwriteImages = Boolean(options?.overwriteImages);

  const [turso, cloudinary] = await Promise.all([
    verifyTursoHealth(),
    verifyCloudinaryHealth(),
  ]);

  if (!turso.connected || !cloudinary.connected) {
    throw new StoreError(
      "A sincronização requer que o Turso e a Cloudinary estejam 100% conectados e funcionais.",
      503,
      "SYNC_PREREQUISITES_NOT_MET",
    );
  }

  await ensureStoreSchema();
  const db = getStoreClient();

  let categoriesCreated = 0;
  let categoriesUpdated = 0;
  let productsCreated = 0;
  let productsUpdated = 0;
  let imagesUploaded = 0;
  let imagesAlreadyLinked = 0;

  const categoryIdBySlug = new Map<string, { id: string; name: string }>();

  for (const category of initialCategories) {
    const existing = await db.execute({
      sql: "SELECT id FROM store_categories WHERE slug = ?",
      args: [category.slug],
    });

    if (existing.rows[0]) {
      const existingId = String(existing.rows[0].id);
      await db.execute({
        sql: `UPDATE store_categories
              SET name = ?, description = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [category.name, category.description, category.sortOrder, existingId],
      });
      categoryIdBySlug.set(category.slug, { id: existingId, name: category.name });
      categoriesUpdated += 1;
    } else {
      const newId = randomUUID();
      await db.execute({
        sql: `INSERT INTO store_categories (id, name, slug, description, is_active, sort_order)
              VALUES (?, ?, ?, ?, 1, ?)`,
        args: [newId, category.name, category.slug, category.description, category.sortOrder],
      });
      categoryIdBySlug.set(category.slug, { id: newId, name: category.name });
      categoriesCreated += 1;
    }
  }

  const items: StoreSyncItemResult[] = [];

  for (const product of initialProducts) {
    const categoryRef = categoryIdBySlug.get(product.category);
    if (!categoryRef) continue;

    const existing = await db.execute({
      sql: "SELECT id, image_public_id, sku, price_aoa, stock_quantity, specs_json FROM store_products WHERE slug = ?",
      args: [product.slug],
    });

    const existingRow = existing.rows[0] as Record<string, unknown> | undefined;
    const existingPublicId =
      existingRow?.image_public_id && String(existingRow.image_public_id).startsWith("bioprev/products/")
        ? String(existingRow.image_public_id)
        : null;

    let finalPublicId = existingPublicId;
    let finalImageUrl = existingPublicId ? cloudinaryImageUrl(existingPublicId) : null;
    let imageStatus: StoreSyncItemResult["imageStatus"] = existingPublicId ? "ja_ligada" : "sem_imagem_local";

    if (!existingPublicId || overwriteImages) {
      const imageBuffer = await readLocalProductImage(product.slug);
      if (imageBuffer) {
        const uploaded = await uploadProductImage(imageBuffer, "image/jpeg");
        finalPublicId = uploaded.publicId;
        finalImageUrl = uploaded.imageUrl;
        imageStatus = "enviada_cloudinary";
        imagesUploaded += 1;
      } else if (existingPublicId) {
        imagesAlreadyLinked += 1;
      }
    } else {
      imagesAlreadyLinked += 1;
    }

    const specsJson = JSON.stringify(product.specs);

    if (existingRow) {
      const existingId = String(existingRow.id);
      const hasSku = Boolean(existingRow.sku && String(existingRow.sku).trim());
      const hasPrice = existingRow.price_aoa !== null && existingRow.price_aoa !== undefined;
      const hasStock = Number(existingRow.stock_quantity ?? 0) > 0;
      const hasSpecs = Boolean(existingRow.specs_json && String(existingRow.specs_json) !== "[]");

      await db.execute({
        sql: `UPDATE store_products
              SET name = ?,
                  category_id = ?,
                  short_description = ?,
                  description = ?,
                  image_public_id = ?,
                  sku = ?,
                  price_aoa = ?,
                  unit_label = ?,
                  stock_quantity = ?,
                  low_stock_threshold = ?,
                  stock_mode = ?,
                  is_featured = ?,
                  specs_json = ?,
                  sort_order = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [
          product.name,
          categoryRef.id,
          product.short,
          product.description,
          finalPublicId,
          hasSku ? String(existingRow.sku) : product.sku,
          hasPrice ? Number(existingRow.price_aoa) : product.priceAoa,
          product.unitLabel,
          hasStock ? Number(existingRow.stock_quantity) : product.stockQuantity,
          product.lowStockThreshold,
          hasStock ? "stock" : product.stockMode,
          product.isFeatured ? 1 : 0,
          hasSpecs ? String(existingRow.specs_json) : specsJson,
          product.sortOrder,
          existingId,
        ],
      });
      productsUpdated += 1;
      items.push({
        slug: product.slug,
        name: product.name,
        categorySlug: product.category,
        categoryName: categoryRef.name,
        action: "actualizado",
        imageStatus,
        imagePublicId: finalPublicId,
        imageUrl: finalImageUrl,
      });
    } else {
      const newProductId = randomUUID();
      await db.execute({
        sql: `INSERT INTO store_products
                (id, name, slug, sku, category_id, short_description, description,
                 price_aoa, unit_label, stock_quantity, low_stock_threshold, stock_mode,
                 is_featured, specs_json, image_public_id, is_active, sort_order)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        args: [
          newProductId,
          product.name,
          product.slug,
          product.sku,
          categoryRef.id,
          product.short,
          product.description,
          product.priceAoa,
          product.unitLabel,
          product.stockQuantity,
          product.lowStockThreshold,
          product.stockMode,
          product.isFeatured ? 1 : 0,
          specsJson,
          finalPublicId,
          product.sortOrder,
        ],
      });
      productsCreated += 1;
      items.push({
        slug: product.slug,
        name: product.name,
        categorySlug: product.category,
        categoryName: categoryRef.name,
        action: "criado",
        imageStatus,
        imagePublicId: finalPublicId,
        imageUrl: finalImageUrl,
      });
    }
  }

  await db.execute("INSERT OR IGNORE INTO store_setup_state (key) VALUES ('initial_catalog_v1')");

  return {
    syncedAt: new Date().toISOString(),
    categoriesCreated,
    categoriesUpdated,
    productsCreated,
    productsUpdated,
    imagesUploaded,
    imagesAlreadyLinked,
    items,
  };
}
