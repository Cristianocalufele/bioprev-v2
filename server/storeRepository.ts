import { randomUUID } from "node:crypto";
import { cloudinaryImageUrl } from "./storeMedia";
import { getStoreClient, isStoreSchemaMissing, storeSetupRequiredError } from "./storeDatabase";
import type { StoreCatalog, StoreCategory, StoreProduct } from "@shared/store";

type DatabaseRow = Record<string, string | number | bigint | ArrayBuffer | null>;

function text(value: DatabaseRow[string] | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function nullableText(value: DatabaseRow[string] | undefined): string | null {
  return value === null || value === undefined || value === "" ? null : String(value);
}

function numberValue(value: DatabaseRow[string] | undefined): number {
  return Number(value ?? 0);
}

function booleanValue(value: DatabaseRow[string] | undefined): boolean {
  return Number(value ?? 0) === 1;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function mapCategory(row: DatabaseRow): StoreCategory {
  return {
    id: text(row.id),
    name: text(row.name),
    slug: text(row.slug),
    description: text(row.description),
    isActive: booleanValue(row.is_active),
    sortOrder: numberValue(row.sort_order),
    productCount: numberValue(row.product_count),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function mapProduct(row: DatabaseRow): StoreProduct {
  const imagePublicId = nullableText(row.image_public_id);
  return {
    id: text(row.id),
    name: text(row.name),
    slug: text(row.slug),
    categoryId: text(row.category_id),
    categoryName: text(row.category_name),
    categorySlug: text(row.category_slug),
    shortDescription: text(row.short_description),
    description: text(row.description),
    imagePublicId,
    imageUrl: imagePublicId ? cloudinaryImageUrl(imagePublicId) : null,
    isActive: booleanValue(row.is_active),
    sortOrder: numberValue(row.sort_order),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

async function query<T>(operation: (db: ReturnType<typeof getStoreClient>) => Promise<T>): Promise<T> {
  try {
    return await operation(getStoreClient());
  } catch (error) {
    if (isStoreSchemaMissing(error)) throw storeSetupRequiredError();
    throw error;
  }
}

const categorySelect = `
  SELECT c.id, c.name, c.slug, c.description, c.is_active, c.sort_order,
         c.created_at, c.updated_at, COUNT(p.id) AS product_count
  FROM store_categories c
  LEFT JOIN store_products p ON p.category_id = c.id
`;

const productSelect = `
  SELECT p.id, p.name, p.slug, p.category_id, c.name AS category_name,
         c.slug AS category_slug, p.short_description, p.description,
         p.image_public_id, p.is_active, p.sort_order, p.created_at, p.updated_at
  FROM store_products p
  JOIN store_categories c ON c.id = p.category_id
`;

export async function getPublicStoreCatalog(): Promise<StoreCatalog> {
  return query(async (db) => {
    const [categoryResult, productResult] = await Promise.all([
      db.execute(`${categorySelect} WHERE c.is_active = 1 GROUP BY c.id ORDER BY c.sort_order, c.name`),
      db.execute(`${productSelect} WHERE p.is_active = 1 AND c.is_active = 1 ORDER BY p.sort_order, p.name`),
    ]);
    return {
      categories: categoryResult.rows.map((row) => mapCategory(row as DatabaseRow)),
      products: productResult.rows.map((row) => mapProduct(row as DatabaseRow)),
    };
  });
}

export async function getAdminStoreCatalog(): Promise<StoreCatalog> {
  return query(async (db) => {
    const [categoryResult, productResult] = await Promise.all([
      db.execute(`${categorySelect} GROUP BY c.id ORDER BY c.sort_order, c.name`),
      db.execute(`${productSelect} ORDER BY p.updated_at DESC, p.name`),
    ]);
    return {
      categories: categoryResult.rows.map((row) => mapCategory(row as DatabaseRow)),
      products: productResult.rows.map((row) => mapProduct(row as DatabaseRow)),
    };
  });
}

export async function createCategory(input: {
  name: string; slug: string; description: string; isActive: boolean; sortOrder: number;
}): Promise<StoreCategory> {
  const id = randomUUID();
  const slug = slugify(input.slug || input.name);
  await query(async (db) => db.execute({
    sql: `INSERT INTO store_categories (id, name, slug, description, is_active, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, input.name, slug, input.description, input.isActive ? 1 : 0, input.sortOrder],
  }));
  const result = await getAdminStoreCatalog();
  const category = result.categories.find((item) => item.id === id);
  if (!category) throw new Error("Category creation did not return a record");
  return category;
}

export async function updateCategory(
  id: string,
  input: { name: string; slug: string; description: string; isActive: boolean; sortOrder: number },
): Promise<StoreCategory | null> {
  const result = await query((db) => db.execute({
    sql: `UPDATE store_categories
          SET name = ?, slug = ?, description = ?, is_active = ?, sort_order = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [input.name, slugify(input.slug || input.name), input.description, input.isActive ? 1 : 0, input.sortOrder, id],
  }));
  if (result.rowsAffected === 0) return null;
  const catalog = await getAdminStoreCatalog();
  return catalog.categories.find((item) => item.id === id) ?? null;
}

export async function deleteCategory(id: string): Promise<boolean> {
  return query(async (db) => {
    const references = await db.execute({
      sql: "SELECT COUNT(*) AS count FROM store_products WHERE category_id = ?",
      args: [id],
    });
    if (numberValue((references.rows[0] as DatabaseRow | undefined)?.count) > 0) {
      const error = new Error("Category is in use");
      Object.assign(error, { code: "SQLITE_CONSTRAINT_FOREIGNKEY" });
      throw error;
    }
    const result = await db.execute({
    sql: "DELETE FROM store_categories WHERE id = ?",
    args: [id],
    });
    return result.rowsAffected > 0;
  });
}

export async function createProduct(input: {
  name: string; slug: string; categoryId: string; shortDescription: string; description: string;
  imagePublicId: string | null; isActive: boolean; sortOrder: number;
}): Promise<StoreProduct> {
  const id = randomUUID();
  await query(async (db) => db.execute({
    sql: `INSERT INTO store_products
            (id, name, slug, category_id, short_description, description, image_public_id, is_active, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, input.name, slugify(input.slug || input.name), input.categoryId, input.shortDescription,
      input.description, input.imagePublicId, input.isActive ? 1 : 0, input.sortOrder,
    ],
  }));
  const catalog = await getAdminStoreCatalog();
  const product = catalog.products.find((item) => item.id === id);
  if (!product) throw new Error("Product creation did not return a record");
  return product;
}

export async function updateProduct(
  id: string,
  input: {
    name: string; slug: string; categoryId: string; shortDescription: string; description: string;
    imagePublicId: string | null; isActive: boolean; sortOrder: number;
  },
): Promise<{ product: StoreProduct; previousImagePublicId: string | null } | null> {
  const current = await query((db) => db.execute({
    sql: "SELECT image_public_id FROM store_products WHERE id = ?",
    args: [id],
  }));
  if (!current.rows[0]) return null;
  const previousImagePublicId = nullableText((current.rows[0] as DatabaseRow).image_public_id);
  const result = await query((db) => db.execute({
    sql: `UPDATE store_products
          SET name = ?, slug = ?, category_id = ?, short_description = ?, description = ?,
              image_public_id = ?, is_active = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [
      input.name, slugify(input.slug || input.name), input.categoryId, input.shortDescription,
      input.description, input.imagePublicId, input.isActive ? 1 : 0, input.sortOrder, id,
    ],
  }));
  if (result.rowsAffected === 0) return null;
  const catalog = await getAdminStoreCatalog();
  const product = catalog.products.find((item) => item.id === id);
  if (!product) throw new Error("Product update did not return a record");
  return { product, previousImagePublicId };
}

export async function deleteProduct(id: string): Promise<{ deleted: boolean; imagePublicId: string | null }> {
  const current = await query((db) => db.execute({
    sql: "SELECT image_public_id FROM store_products WHERE id = ?",
    args: [id],
  }));
  if (!current.rows[0]) return { deleted: false, imagePublicId: null };
  const imagePublicId = nullableText((current.rows[0] as DatabaseRow).image_public_id);
  const result = await query((db) => db.execute({
    sql: "DELETE FROM store_products WHERE id = ?",
    args: [id],
  }));
  return { deleted: result.rowsAffected > 0, imagePublicId };
}
