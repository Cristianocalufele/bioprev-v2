import { randomUUID } from "node:crypto";
import { cloudinaryDatasheetUrl, cloudinaryImageUrl } from "./storeMedia";
import {
  ensureStoreSchema,
  getStoreClient,
  initialProducts,
  isStoreConfigured,
  isStoreSchemaMissing,
  storeSetupRequiredError,
  StoreError,
} from "./storeDatabase";
import type {
  ProductSpecItem,
  ProductStockMode,
  ProductStockStatus,
  StoreCatalog,
  StoreCategory,
  StoreCustomer,
  StoreMetrics,
  StoreMetricsPeriod,
  StoreOrder,
  StoreOrderItem,
  StoreOrderSource,
  StoreOrderStatus,
  StoreProduct,
  StoreProductImage,
} from "../shared/store";

type DatabaseRow = Record<string, string | number | bigint | ArrayBuffer | null>;

const nowIso = () => new Date().toISOString();

const memoryCategories: StoreCategory[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    name: "Monitorização",
    slug: "monitorizacao",
    description: "Artigos de apoio à monitorização de espaços.",
    isActive: true,
    sortOrder: 10,
    productCount: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    name: "Limpeza",
    slug: "limpeza",
    description: "Equipamentos e utensílios para rotinas de limpeza.",
    isActive: true,
    sortOrder: 20,
    productCount: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    name: "Protecção",
    slug: "protecao",
    description: "Artigos de protecção individual e segurança.",
    isActive: true,
    sortOrder: 30,
    productCount: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

function computeStockStatus(
  stockMode: ProductStockMode,
  stockQuantity: number,
  lowStockThreshold: number,
): ProductStockStatus {
  if (stockMode === "por_encomenda") return "por_encomenda";
  if (stockQuantity <= 0) return "esgotado";
  if (stockQuantity <= lowStockThreshold) return "stock_reduzido";
  return "em_stock";
}

const categoryMapBySlug = new Map(memoryCategories.map((c) => [c.slug, c]));

const memoryProducts: StoreProduct[] = initialProducts.map((seed, index) => {
  const category = categoryMapBySlug.get(seed.category) ?? memoryCategories[0];
  return {
    id: `22222222-2222-4222-8222-22222222220${index + 1}`,
    name: seed.name,
    slug: seed.slug,
    sku: seed.sku,
    categoryId: category.id,
    categoryName: category.name,
    categorySlug: category.slug,
    shortDescription: seed.short,
    description: seed.description,
    priceAoa: seed.priceAoa,
    unitLabel: seed.unitLabel,
    stockQuantity: seed.stockQuantity,
    lowStockThreshold: seed.lowStockThreshold,
    stockMode: seed.stockMode,
    stockStatus: computeStockStatus(seed.stockMode, seed.stockQuantity, seed.lowStockThreshold),
    isFeatured: seed.isFeatured,
    specs: seed.specs,
    imagePublicId: null,
    imageUrl: null,
    galleryImages: [],
    datasheetPublicId: null,
    datasheetExternalUrl: "",
    datasheetUrl: null,
    orderCount: 0,
    isActive: true,
    sortOrder: seed.sortOrder,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
});

const memoryOrders: StoreOrder[] = [];
const memoryCustomers: StoreCustomer[] = [];

function syncMemoryCounts() {
  for (const category of memoryCategories) {
    category.productCount = memoryProducts.filter((p) => p.categoryId === category.id).length;
  }
  const counts = new Map<string, number>();
  for (const order of memoryOrders) {
    if (order.status === "cancelado") continue;
    for (const item of order.items) {
      if (item.productId) {
        counts.set(item.productId, (counts.get(item.productId) ?? 0) + item.quantity);
      }
    }
  }
  for (const product of memoryProducts) {
    product.orderCount = counts.get(product.id) ?? 0;
    product.stockStatus = computeStockStatus(product.stockMode, product.stockQuantity, product.lowStockThreshold);
  }
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("9")) {
    return `244${digits}`;
  }
  return digits;
}

function generateOrderReference(): string {
  const year = new Date().getFullYear();
  const short = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `BP-${year}-${short}`;
}

function text(value: DatabaseRow[string] | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function nullableText(value: DatabaseRow[string] | undefined): string | null {
  return value === null || value === undefined || value === "" ? null : String(value);
}

function numberValue(value: DatabaseRow[string] | undefined): number {
  return Number(value ?? 0);
}

function nullableInt(value: DatabaseRow[string] | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function booleanValue(value: DatabaseRow[string] | undefined): boolean {
  return Number(value ?? 0) === 1;
}

function parseSpecsJson(raw: DatabaseRow[string] | undefined): ProductSpecItem[] {
  const s = text(raw).trim();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is ProductSpecItem => Boolean(item && typeof item.label === "string" && typeof item.value === "string"))
      .map((item) => ({ label: item.label.trim(), value: item.value.trim() }))
      .filter((item) => item.label.length > 0 && item.value.length > 0);
  } catch {
    return [];
  }
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

function isCommittedStatus(status: StoreOrderStatus): boolean {
  return status === "confirmado" || status === "entregue";
}

function summarizeOrderItems(items: Array<{ productName: string; quantity: number; unitPriceAoa: number | null }>) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const first = items[0];
  const summaryName =
    items.length <= 1
      ? first?.productName ?? "Pedido"
      : `${first.productName} (+${items.length - 1} ${items.length - 1 === 1 ? "artigo" : "artigos"})`;

  let pricedSum = 0;
  let hasPriced = false;
  let hasConsultationItems = false;

  for (const item of items) {
    if (item.unitPriceAoa !== null && item.unitPriceAoa !== undefined) {
      pricedSum += item.unitPriceAoa * item.quantity;
      hasPriced = true;
    } else {
      hasConsultationItems = true;
    }
  }

  return {
    productName: summaryName,
    quantity: Math.max(1, totalQuantity),
    totalAoa: hasPriced ? pricedSum : null,
    hasConsultationItems,
  };
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

function mapProduct(
  row: DatabaseRow,
  galleryByProduct?: Map<string, StoreProductImage[]>,
  orderCounts?: Map<string, number>,
): StoreProduct {
  const id = text(row.id);
  const imagePublicId = nullableText(row.image_public_id);
  const datasheetPublicId = nullableText(row.datasheet_public_id);
  const datasheetExternalUrl = text(row.datasheet_external_url);
  const stockMode = (text(row.stock_mode) === "stock" ? "stock" : "por_encomenda") as ProductStockMode;
  const stockQuantity = Math.max(0, numberValue(row.stock_quantity));
  const lowStockThreshold = Math.max(0, numberValue(row.low_stock_threshold ?? 5));

  return {
    id,
    name: text(row.name),
    slug: text(row.slug),
    sku: text(row.sku),
    categoryId: text(row.category_id),
    categoryName: text(row.category_name),
    categorySlug: text(row.category_slug),
    shortDescription: text(row.short_description),
    description: text(row.description),
    priceAoa: nullableInt(row.price_aoa),
    unitLabel: text(row.unit_label) || "unidade",
    stockQuantity,
    lowStockThreshold,
    stockMode,
    stockStatus: computeStockStatus(stockMode, stockQuantity, lowStockThreshold),
    isFeatured: booleanValue(row.is_featured),
    specs: parseSpecsJson(row.specs_json),
    imagePublicId,
    imageUrl: imagePublicId ? cloudinaryImageUrl(imagePublicId) : null,
    galleryImages: galleryByProduct?.get(id) ?? [],
    datasheetPublicId,
    datasheetExternalUrl,
    datasheetUrl:
      (datasheetPublicId ? cloudinaryDatasheetUrl(datasheetPublicId) : null) ||
      (datasheetExternalUrl || null),
    orderCount: orderCounts?.get(id) ?? numberValue(row.order_count),
    isActive: booleanValue(row.is_active),
    sortOrder: numberValue(row.sort_order),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function mapOrder(row: DatabaseRow, itemsByOrder?: Map<string, StoreOrderItem[]>): StoreOrder {
  const id = text(row.id);
  const items = itemsByOrder?.get(id) ?? [
    {
      id: `${id}-primary`,
      productId: nullableText(row.product_id),
      productName: text(row.product_name),
      sku: "",
      quantity: Math.max(1, numberValue(row.quantity)),
      unitPriceAoa: null,
      unitLabel: "unidade",
      subtotalAoa: null,
    },
  ];
  return {
    id,
    reference: text(row.reference),
    customerId: nullableText(row.customer_id),
    productId: nullableText(row.product_id),
    productName: text(row.product_name),
    quantity: Math.max(1, numberValue(row.quantity)),
    items,
    totalAoa: nullableInt(row.total_aoa),
    hasConsultationItems: booleanValue(row.has_consultation_items),
    stockDeducted: booleanValue(row.stock_deducted),
    customerName: text(row.customer_name),
    telephone: text(row.telephone),
    address: text(row.address),
    city: text(row.city),
    deliveryNotes: text(row.delivery_notes),
    status: text(row.status) as StoreOrderStatus,
    source: text(row.source) as StoreOrderSource,
    adminNotes: text(row.admin_notes),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function mapCustomer(row: DatabaseRow): StoreCustomer {
  return {
    id: text(row.id),
    name: text(row.name),
    telephone: text(row.telephone),
    normalizedPhone: text(row.normalized_phone),
    email: text(row.email),
    nif: text(row.nif),
    defaultAddress: text(row.default_address),
    defaultCity: text(row.default_city),
    notes: text(row.notes),
    orderCount: numberValue(row.order_count),
    totalSpentAoa: numberValue(row.total_spent_aoa),
    lastOrderAt: nullableText(row.last_order_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

async function query<T>(operation: (db: ReturnType<typeof getStoreClient>) => Promise<T>): Promise<T> {
  try {
    await ensureStoreSchema();
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
  SELECT p.id, p.name, p.slug, p.sku, p.category_id, c.name AS category_name,
         c.slug AS category_slug, p.short_description, p.description,
         p.price_aoa, p.unit_label, p.stock_quantity, p.low_stock_threshold,
         p.stock_mode, p.is_featured, p.specs_json, p.image_public_id,
         p.datasheet_public_id, p.datasheet_external_url,
         p.is_active, p.sort_order, p.created_at, p.updated_at
  FROM store_products p
  JOIN store_categories c ON c.id = p.category_id
`;

const orderSelect = `
  SELECT id, reference, customer_id, product_id, product_name, quantity,
         total_aoa, has_consultation_items, stock_deducted, customer_name,
         telephone, address, city, delivery_notes, status, source, admin_notes,
         created_at, updated_at
  FROM store_orders
`;

async function fetchGalleryImagesMap(db: ReturnType<typeof getStoreClient>, productIds?: string[]) {
  const map = new Map<string, StoreProductImage[]>();
  const result = productIds && productIds.length > 0
    ? await db.execute({
        sql: `SELECT id, product_id, image_public_id, alt_text, sort_order
              FROM store_product_images
              WHERE product_id IN (${productIds.map(() => "?").join(",")})
              ORDER BY sort_order, created_at`,
        args: productIds,
      })
    : await db.execute(`SELECT id, product_id, image_public_id, alt_text, sort_order FROM store_product_images ORDER BY sort_order, created_at`);

  for (const raw of result.rows) {
    const row = raw as DatabaseRow;
    const productId = text(row.product_id);
    const imagePublicId = text(row.image_public_id);
    const list = map.get(productId) ?? [];
    list.push({
      id: text(row.id),
      imagePublicId,
      imageUrl: cloudinaryImageUrl(imagePublicId),
      altText: text(row.alt_text),
      sortOrder: numberValue(row.sort_order),
    });
    map.set(productId, list);
  }
  return map;
}

async function fetchProductOrderCountsMap(db: ReturnType<typeof getStoreClient>) {
  const map = new Map<string, number>();
  const result = await db.execute(`
    SELECT oi.product_id, SUM(oi.quantity) AS total_units
    FROM store_order_items oi
    JOIN store_orders o ON o.id = oi.order_id
    WHERE oi.product_id IS NOT NULL AND o.status != 'cancelado'
    GROUP BY oi.product_id
  `);
  for (const raw of result.rows) {
    const row = raw as DatabaseRow;
    if (row.product_id) {
      map.set(text(row.product_id), numberValue(row.total_units));
    }
  }
  return map;
}

async function fetchOrderItemsMap(db: ReturnType<typeof getStoreClient>, orderIds?: string[]) {
  const map = new Map<string, StoreOrderItem[]>();
  const result = orderIds && orderIds.length > 0
    ? await db.execute({
        sql: `SELECT id, order_id, product_id, product_name, sku, quantity, unit_price_aoa, unit_label, subtotal_aoa
              FROM store_order_items
              WHERE order_id IN (${orderIds.map(() => "?").join(",")})
              ORDER BY created_at`,
        args: orderIds,
      })
    : await db.execute(`SELECT id, order_id, product_id, product_name, sku, quantity, unit_price_aoa, unit_label, subtotal_aoa FROM store_order_items ORDER BY created_at`);

  for (const raw of result.rows) {
    const row = raw as DatabaseRow;
    const orderId = text(row.order_id);
    const list = map.get(orderId) ?? [];
    list.push({
      id: text(row.id),
      productId: nullableText(row.product_id),
      productName: text(row.product_name),
      sku: text(row.sku),
      quantity: Math.max(1, numberValue(row.quantity)),
      unitPriceAoa: nullableInt(row.unit_price_aoa),
      unitLabel: text(row.unit_label) || "unidade",
      subtotalAoa: nullableInt(row.subtotal_aoa),
    });
    map.set(orderId, list);
  }
  return map;
}

export async function getPublicStoreCatalog(): Promise<StoreCatalog> {
  if (!isStoreConfigured()) {
    syncMemoryCounts();
    const activeCategoryIds = new Set(memoryCategories.filter((c) => c.isActive).map((c) => c.id));
    return {
      categories: memoryCategories
        .filter((c) => c.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
      products: memoryProducts
        .filter((p) => p.isActive && activeCategoryIds.has(p.categoryId))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    };
  }

  return query(async (db) => {
    const [categoryResult, productResult, galleryMap, orderCounts] = await Promise.all([
      db.execute(`${categorySelect} WHERE c.is_active = 1 GROUP BY c.id ORDER BY c.sort_order, c.name`),
      db.execute(`${productSelect} WHERE p.is_active = 1 AND c.is_active = 1 ORDER BY p.sort_order, p.name`),
      fetchGalleryImagesMap(db),
      fetchProductOrderCountsMap(db),
    ]);
    return {
      categories: categoryResult.rows.map((row) => mapCategory(row as DatabaseRow)),
      products: productResult.rows.map((row) => mapProduct(row as DatabaseRow, galleryMap, orderCounts)),
    };
  });
}

export async function getPublicProductBySlug(slug: string): Promise<{
  product: StoreProduct;
  relatedProducts: StoreProduct[];
} | null> {
  const catalog = await getPublicStoreCatalog();
  const product = catalog.products.find((item) => item.slug === slug);
  if (!product) return null;

  const sameCategory = catalog.products.filter(
    (item) => item.id !== product.id && item.categoryId === product.categoryId,
  );
  const others = catalog.products.filter(
    (item) => item.id !== product.id && item.categoryId !== product.categoryId,
  );
  const relatedProducts = [...sameCategory, ...others].slice(0, 3);
  return { product, relatedProducts };
}

export async function getAdminStoreCatalog(): Promise<StoreCatalog> {
  if (!isStoreConfigured()) {
    syncMemoryCounts();
    return {
      categories: [...memoryCategories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
      products: [...memoryProducts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name)),
    };
  }

  return query(async (db) => {
    const [categoryResult, productResult, galleryMap, orderCounts] = await Promise.all([
      db.execute(`${categorySelect} GROUP BY c.id ORDER BY c.sort_order, c.name`),
      db.execute(`${productSelect} ORDER BY p.updated_at DESC, p.name`),
      fetchGalleryImagesMap(db),
      fetchProductOrderCountsMap(db),
    ]);
    return {
      categories: categoryResult.rows.map((row) => mapCategory(row as DatabaseRow)),
      products: productResult.rows.map((row) => mapProduct(row as DatabaseRow, galleryMap, orderCounts)),
    };
  });
}

export async function createCategory(input: {
  name: string; slug: string; description: string; isActive: boolean; sortOrder: number;
}): Promise<StoreCategory> {
  if (!isStoreConfigured()) {
    const timestamp = nowIso();
    const category: StoreCategory = {
      id: randomUUID(),
      name: input.name,
      slug: slugify(input.slug || input.name),
      description: input.description,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      productCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    memoryCategories.push(category);
    return category;
  }

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
  if (!isStoreConfigured()) {
    const category = memoryCategories.find((item) => item.id === id);
    if (!category) return null;
    category.name = input.name;
    category.slug = slugify(input.slug || input.name);
    category.description = input.description;
    category.isActive = input.isActive;
    category.sortOrder = input.sortOrder;
    category.updatedAt = nowIso();
    for (const product of memoryProducts) {
      if (product.categoryId === id) {
        product.categoryName = category.name;
        product.categorySlug = category.slug;
      }
    }
    syncMemoryCounts();
    return category;
  }

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
  if (!isStoreConfigured()) {
    if (memoryProducts.some((p) => p.categoryId === id)) {
      const error = new Error("Category is in use");
      Object.assign(error, { code: "SQLITE_CONSTRAINT_FOREIGNKEY" });
      throw error;
    }
    const idx = memoryCategories.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    memoryCategories.splice(idx, 1);
    return true;
  }

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

export type ProductUpsertInput = {
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  priceAoa: number | null;
  unitLabel: string;
  stockQuantity: number;
  lowStockThreshold: number;
  stockMode: ProductStockMode;
  isFeatured: boolean;
  specs: ProductSpecItem[];
  imagePublicId: string | null;
  galleryImages: Array<{ imagePublicId: string; altText: string; sortOrder: number }>;
  datasheetPublicId: string | null;
  datasheetExternalUrl: string;
  isActive: boolean;
  sortOrder: number;
};

export async function createProduct(input: ProductUpsertInput): Promise<StoreProduct> {
  if (!isStoreConfigured()) {
    const category = memoryCategories.find((c) => c.id === input.categoryId);
    if (!category) throw new Error("Category not found");
    const timestamp = nowIso();
    const product: StoreProduct = {
      id: randomUUID(),
      name: input.name,
      slug: slugify(input.slug || input.name),
      sku: input.sku,
      categoryId: category.id,
      categoryName: category.name,
      categorySlug: category.slug,
      shortDescription: input.shortDescription,
      description: input.description,
      priceAoa: input.priceAoa,
      unitLabel: input.unitLabel || "unidade",
      stockQuantity: input.stockQuantity,
      lowStockThreshold: input.lowStockThreshold,
      stockMode: input.stockMode,
      stockStatus: computeStockStatus(input.stockMode, input.stockQuantity, input.lowStockThreshold),
      isFeatured: input.isFeatured,
      specs: input.specs,
      imagePublicId: input.imagePublicId,
      imageUrl: input.imagePublicId ? cloudinaryImageUrl(input.imagePublicId) : null,
      galleryImages: input.galleryImages.map((img, idx) => ({
        id: randomUUID(),
        imagePublicId: img.imagePublicId,
        imageUrl: cloudinaryImageUrl(img.imagePublicId),
        altText: img.altText,
        sortOrder: img.sortOrder ?? idx,
      })),
      datasheetPublicId: input.datasheetPublicId,
      datasheetExternalUrl: input.datasheetExternalUrl,
      datasheetUrl:
        (input.datasheetPublicId ? cloudinaryDatasheetUrl(input.datasheetPublicId) : null) ||
        (input.datasheetExternalUrl || null),
      orderCount: 0,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    memoryProducts.push(product);
    syncMemoryCounts();
    return product;
  }

  const id = randomUUID();
  await query(async (db) => {
    await db.execute({
      sql: `INSERT INTO store_products
              (id, name, slug, sku, category_id, short_description, description,
               price_aoa, unit_label, stock_quantity, low_stock_threshold, stock_mode,
               is_featured, specs_json, image_public_id, datasheet_public_id,
               datasheet_external_url, is_active, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        input.name,
        slugify(input.slug || input.name),
        input.sku,
        input.categoryId,
        input.shortDescription,
        input.description,
        input.priceAoa,
        input.unitLabel || "unidade",
        input.stockQuantity,
        input.lowStockThreshold,
        input.stockMode,
        input.isFeatured ? 1 : 0,
        JSON.stringify(input.specs ?? []),
        input.imagePublicId,
        input.datasheetPublicId,
        input.datasheetExternalUrl,
        input.isActive ? 1 : 0,
        input.sortOrder,
      ],
    });

    for (let i = 0; i < input.galleryImages.length; i++) {
      const img = input.galleryImages[i];
      await db.execute({
        sql: `INSERT INTO store_product_images (id, product_id, image_public_id, alt_text, sort_order)
              VALUES (?, ?, ?, ?, ?)`,
        args: [randomUUID(), id, img.imagePublicId, img.altText ?? "", img.sortOrder ?? i],
      });
    }
  });

  const catalog = await getAdminStoreCatalog();
  const product = catalog.products.find((item) => item.id === id);
  if (!product) throw new Error("Product creation did not return a record");
  return product;
}

export async function updateProduct(
  id: string,
  input: ProductUpsertInput,
): Promise<{
  product: StoreProduct;
  removedImagePublicIds: string[];
  previousDatasheetPublicId: string | null;
} | null> {
  if (!isStoreConfigured()) {
    const product = memoryProducts.find((item) => item.id === id);
    if (!product) return null;
    const category = memoryCategories.find((c) => c.id === input.categoryId);
    if (!category) throw new Error("Category not found");

    const previousGalleryIds = product.galleryImages.map((g) => g.imagePublicId);
    const nextGalleryIds = new Set(input.galleryImages.map((g) => g.imagePublicId));
    const removedImagePublicIds = [
      ...(product.imagePublicId && product.imagePublicId !== input.imagePublicId ? [product.imagePublicId] : []),
      ...previousGalleryIds.filter((pid) => !nextGalleryIds.has(pid) && pid !== input.imagePublicId),
    ];
    const previousDatasheetPublicId =
      product.datasheetPublicId && product.datasheetPublicId !== input.datasheetPublicId
        ? product.datasheetPublicId
        : null;

    product.name = input.name;
    product.slug = slugify(input.slug || input.name);
    product.sku = input.sku;
    product.categoryId = category.id;
    product.categoryName = category.name;
    product.categorySlug = category.slug;
    product.shortDescription = input.shortDescription;
    product.description = input.description;
    product.priceAoa = input.priceAoa;
    product.unitLabel = input.unitLabel || "unidade";
    product.stockQuantity = input.stockQuantity;
    product.lowStockThreshold = input.lowStockThreshold;
    product.stockMode = input.stockMode;
    product.stockStatus = computeStockStatus(input.stockMode, input.stockQuantity, input.lowStockThreshold);
    product.isFeatured = input.isFeatured;
    product.specs = input.specs;
    product.imagePublicId = input.imagePublicId;
    product.imageUrl = input.imagePublicId ? cloudinaryImageUrl(input.imagePublicId) : null;
    product.galleryImages = input.galleryImages.map((img, idx) => ({
      id: randomUUID(),
      imagePublicId: img.imagePublicId,
      imageUrl: cloudinaryImageUrl(img.imagePublicId),
      altText: img.altText,
      sortOrder: img.sortOrder ?? idx,
    }));
    product.datasheetPublicId = input.datasheetPublicId;
    product.datasheetExternalUrl = input.datasheetExternalUrl;
    product.datasheetUrl =
      (input.datasheetPublicId ? cloudinaryDatasheetUrl(input.datasheetPublicId) : null) ||
      (input.datasheetExternalUrl || null);
    product.isActive = input.isActive;
    product.sortOrder = input.sortOrder;
    product.updatedAt = nowIso();
    syncMemoryCounts();
    return { product, removedImagePublicIds, previousDatasheetPublicId };
  }

  return query(async (db) => {
    const currentRes = await db.execute({
      sql: "SELECT image_public_id, datasheet_public_id FROM store_products WHERE id = ?",
      args: [id],
    });
    if (!currentRes.rows[0]) return null;
    const currentRow = currentRes.rows[0] as DatabaseRow;
    const previousPrimaryImage = nullableText(currentRow.image_public_id);
    const previousDatasheet = nullableText(currentRow.datasheet_public_id);

    const existingGalleryRes = await db.execute({
      sql: "SELECT image_public_id FROM store_product_images WHERE product_id = ?",
      args: [id],
    });
    const previousGalleryIds = existingGalleryRes.rows.map((r) => text((r as DatabaseRow).image_public_id));

    await db.execute({
      sql: `UPDATE store_products
            SET name = ?, slug = ?, sku = ?, category_id = ?, short_description = ?, description = ?,
                price_aoa = ?, unit_label = ?, stock_quantity = ?, low_stock_threshold = ?, stock_mode = ?,
                is_featured = ?, specs_json = ?, image_public_id = ?, datasheet_public_id = ?,
                datasheet_external_url = ?, is_active = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        input.name,
        slugify(input.slug || input.name),
        input.sku,
        input.categoryId,
        input.shortDescription,
        input.description,
        input.priceAoa,
        input.unitLabel || "unidade",
        input.stockQuantity,
        input.lowStockThreshold,
        input.stockMode,
        input.isFeatured ? 1 : 0,
        JSON.stringify(input.specs ?? []),
        input.imagePublicId,
        input.datasheetPublicId,
        input.datasheetExternalUrl,
        input.isActive ? 1 : 0,
        input.sortOrder,
        id,
      ],
    });

    await db.execute({ sql: "DELETE FROM store_product_images WHERE product_id = ?", args: [id] });
    for (let i = 0; i < input.galleryImages.length; i++) {
      const img = input.galleryImages[i];
      await db.execute({
        sql: `INSERT INTO store_product_images (id, product_id, image_public_id, alt_text, sort_order)
              VALUES (?, ?, ?, ?, ?)`,
        args: [randomUUID(), id, img.imagePublicId, img.altText ?? "", img.sortOrder ?? i],
      });
    }

    const retainedIds = new Set<string>([
      ...(input.imagePublicId ? [input.imagePublicId] : []),
      ...input.galleryImages.map((g) => g.imagePublicId),
    ]);
    const removedImagePublicIds = [
      ...(previousPrimaryImage && !retainedIds.has(previousPrimaryImage) ? [previousPrimaryImage] : []),
      ...previousGalleryIds.filter((pid) => !retainedIds.has(pid)),
    ];
    const previousDatasheetPublicId =
      previousDatasheet && previousDatasheet !== input.datasheetPublicId ? previousDatasheet : null;

    const catalog = await getAdminStoreCatalog();
    const product = catalog.products.find((item) => item.id === id);
    if (!product) throw new Error("Product update did not return a record");
    return { product, removedImagePublicIds, previousDatasheetPublicId };
  });
}

export async function deleteProduct(id: string): Promise<{
  deleted: boolean;
  imagePublicIds: string[];
  datasheetPublicId: string | null;
}> {
  if (!isStoreConfigured()) {
    const idx = memoryProducts.findIndex((item) => item.id === id);
    if (idx === -1) return { deleted: false, imagePublicIds: [], datasheetPublicId: null };
    const [removed] = memoryProducts.splice(idx, 1);
    syncMemoryCounts();
    const imagePublicIds = [
      ...(removed.imagePublicId ? [removed.imagePublicId] : []),
      ...removed.galleryImages.map((g) => g.imagePublicId),
    ];
    return { deleted: true, imagePublicIds, datasheetPublicId: removed.datasheetPublicId };
  }

  return query(async (db) => {
    const current = await db.execute({
      sql: "SELECT image_public_id, datasheet_public_id FROM store_products WHERE id = ?",
      args: [id],
    });
    if (!current.rows[0]) return { deleted: false, imagePublicIds: [], datasheetPublicId: null };
    const row = current.rows[0] as DatabaseRow;
    const primaryImage = nullableText(row.image_public_id);
    const datasheetPublicId = nullableText(row.datasheet_public_id);
    const gallery = await db.execute({
      sql: "SELECT image_public_id FROM store_product_images WHERE product_id = ?",
      args: [id],
    });
    const imagePublicIds = [
      ...(primaryImage ? [primaryImage] : []),
      ...gallery.rows.map((r) => text((r as DatabaseRow).image_public_id)),
    ];

    const result = await db.execute({ sql: "DELETE FROM store_products WHERE id = ?", args: [id] });
    return { deleted: result.rowsAffected > 0, imagePublicIds, datasheetPublicId };
  });
}

function upsertMemoryCustomer(input: {
  name: string;
  telephone: string;
  address: string;
  city: string;
}): string | null {
  const normalizedPhone = normalizePhone(input.telephone);
  if (!normalizedPhone) return null;
  const existing = memoryCustomers.find((c) => c.normalizedPhone === normalizedPhone);
  const timestamp = nowIso();
  if (existing) {
    if (input.name && !existing.name) existing.name = input.name;
    if (input.address) existing.defaultAddress = input.address;
    if (input.city) existing.defaultCity = input.city;
    existing.telephone = input.telephone;
    existing.updatedAt = timestamp;
    return existing.id;
  }
  const id = randomUUID();
  memoryCustomers.push({
    id,
    name: input.name || "Cliente sem nome",
    telephone: input.telephone,
    normalizedPhone,
    email: "",
    nif: "",
    defaultAddress: input.address,
    defaultCity: input.city,
    notes: "",
    orderCount: 0,
    totalSpentAoa: 0,
    lastOrderAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return id;
}

async function upsertDbCustomer(
  db: ReturnType<typeof getStoreClient>,
  input: { name: string; telephone: string; address: string; city: string },
): Promise<string | null> {
  const normalizedPhone = normalizePhone(input.telephone);
  if (!normalizedPhone) return null;

  const existing = await db.execute({
    sql: "SELECT id, name, default_address, default_city FROM store_customers WHERE normalized_phone = ?",
    args: [normalizedPhone],
  });

  if (existing.rows[0]) {
    const row = existing.rows[0] as DatabaseRow;
    const customerId = text(row.id);
    const nextName = text(row.name) || input.name || "Cliente";
    const nextAddress = input.address || text(row.default_address);
    const nextCity = input.city || text(row.default_city);
    await db.execute({
      sql: `UPDATE store_customers
            SET name = ?, telephone = ?, default_address = ?, default_city = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [nextName, input.telephone, nextAddress, nextCity, customerId],
    });
    return customerId;
  }

  const customerId = randomUUID();
  await db.execute({
    sql: `INSERT INTO store_customers (id, name, telephone, normalized_phone, default_address, default_city)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [customerId, input.name || "Cliente", input.telephone, normalizedPhone, input.address, input.city],
  });
  return customerId;
}

export async function createPublicOrder(input: {
  items?: Array<{ productId: string; quantity: number }>;
  productId?: string;
  quantity?: number;
  customerName: string;
  telephone: string;
  address: string;
  city: string;
  deliveryNotes: string;
}): Promise<StoreOrder> {
  const requestedRaw =
    input.items && input.items.length > 0
      ? input.items
      : input.productId
        ? [{ productId: input.productId, quantity: input.quantity ?? 1 }]
        : [];

  // Merge duplicate productIds cleanly
  const merged = new Map<string, number>();
  for (const entry of requestedRaw) {
    merged.set(entry.productId, Math.min(10000, (merged.get(entry.productId) ?? 0) + entry.quantity));
  }
  const requestedItems = Array.from(merged.entries()).map(([productId, quantity]) => ({ productId, quantity }));
  if (requestedItems.length === 0) {
    throw new StoreError("Seleccione pelo menos um artigo para encomendar.", 400, "ORDER_EMPTY");
  }

  const id = randomUUID();
  const reference = generateOrderReference();

  if (!isStoreConfigured()) {
    const resolvedItems: StoreOrderItem[] = [];
    for (const reqItem of requestedItems) {
      const product = memoryProducts.find((item) => item.id === reqItem.productId && item.isActive);
      if (!product) {
        throw new StoreError("Um dos artigos seleccionados já não está disponível no catálogo.", 404, "PRODUCT_NOT_FOUND");
      }
      if (product.stockMode === "stock" && product.stockQuantity <= 0) {
        throw new StoreError(`O artigo “${product.name}” encontra-se temporariamente esgotado.`, 409, "PRODUCT_OUT_OF_STOCK");
      }
      resolvedItems.push({
        id: randomUUID(),
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: reqItem.quantity,
        unitPriceAoa: product.priceAoa,
        unitLabel: product.unitLabel,
        subtotalAoa: product.priceAoa !== null ? product.priceAoa * reqItem.quantity : null,
      });
    }

    const summary = summarizeOrderItems(resolvedItems);
    const customerId = upsertMemoryCustomer({
      name: input.customerName,
      telephone: input.telephone,
      address: input.address,
      city: input.city,
    });
    const timestamp = nowIso();
    const order: StoreOrder = {
      id,
      reference,
      customerId,
      productId: resolvedItems[0]?.productId ?? null,
      productName: summary.productName,
      quantity: summary.quantity,
      items: resolvedItems,
      totalAoa: summary.totalAoa,
      hasConsultationItems: summary.hasConsultationItems,
      stockDeducted: false,
      customerName: input.customerName,
      telephone: input.telephone,
      address: input.address,
      city: input.city,
      deliveryNotes: input.deliveryNotes,
      status: "novo",
      source: "loja_whatsapp",
      adminNotes: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    memoryOrders.unshift(order);
    syncMemoryCounts();
    return order;
  }

  return query(async (db) => {
    const resolvedItems: StoreOrderItem[] = [];
    for (const reqItem of requestedItems) {
      const productRes = await db.execute({
        sql: `SELECT p.id, p.name, p.sku, p.price_aoa, p.unit_label, p.stock_mode, p.stock_quantity
              FROM store_products p
              JOIN store_categories c ON c.id = p.category_id
              WHERE p.id = ? AND p.is_active = 1 AND c.is_active = 1`,
        args: [reqItem.productId],
      });
      const productRow = productRes.rows[0] as DatabaseRow | undefined;
      if (!productRow) {
        throw new StoreError("Um dos artigos seleccionados já não está disponível no catálogo.", 404, "PRODUCT_NOT_FOUND");
      }
      const stockMode = text(productRow.stock_mode);
      const stockQty = numberValue(productRow.stock_quantity);
      const pName = text(productRow.name);
      if (stockMode === "stock" && stockQty <= 0) {
        throw new StoreError(`O artigo “${pName}” encontra-se temporariamente esgotado.`, 409, "PRODUCT_OUT_OF_STOCK");
      }
      const unitPriceAoa = nullableInt(productRow.price_aoa);
      resolvedItems.push({
        id: randomUUID(),
        productId: text(productRow.id),
        productName: pName,
        sku: text(productRow.sku),
        quantity: reqItem.quantity,
        unitPriceAoa,
        unitLabel: text(productRow.unit_label) || "unidade",
        subtotalAoa: unitPriceAoa !== null ? unitPriceAoa * reqItem.quantity : null,
      });
    }

    const summary = summarizeOrderItems(resolvedItems);
    const customerId = await upsertDbCustomer(db, {
      name: input.customerName,
      telephone: input.telephone,
      address: input.address,
      city: input.city,
    });

    await db.execute({
      sql: `INSERT INTO store_orders
              (id, reference, customer_id, product_id, product_name, quantity,
               total_aoa, has_consultation_items, stock_deducted, customer_name,
               telephone, address, city, delivery_notes, status, source, admin_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'novo', 'loja_whatsapp', '')`,
      args: [
        id,
        reference,
        customerId,
        resolvedItems[0]?.productId ?? null,
        summary.productName,
        summary.quantity,
        summary.totalAoa,
        summary.hasConsultationItems ? 1 : 0,
        input.customerName,
        input.telephone,
        input.address,
        input.city,
        input.deliveryNotes,
      ],
    });

    for (const item of resolvedItems) {
      await db.execute({
        sql: `INSERT INTO store_order_items
                (id, order_id, product_id, product_name, sku, quantity, unit_price_aoa, unit_label, subtotal_aoa)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          item.id,
          id,
          item.productId,
          item.productName,
          item.sku,
          item.quantity,
          item.unitPriceAoa,
          item.unitLabel,
          item.subtotalAoa,
        ],
      });
    }

    const [createdRes, itemsMap] = await Promise.all([
      db.execute({ sql: `${orderSelect} WHERE id = ?`, args: [id] }),
      fetchOrderItemsMap(db, [id]),
    ]);
    return mapOrder(createdRes.rows[0] as DatabaseRow, itemsMap);
  });
}

export async function listAdminOrders(): Promise<StoreOrder[]> {
  if (!isStoreConfigured()) {
    return [...memoryOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return query(async (db) => {
    const [result, itemsMap] = await Promise.all([
      db.execute(`${orderSelect} ORDER BY created_at DESC`),
      fetchOrderItemsMap(db),
    ]);
    return result.rows.map((row) => mapOrder(row as DatabaseRow, itemsMap));
  });
}

type AdminOrderItemPayload = {
  productId: string | null;
  productName: string;
  sku?: string;
  quantity: number;
  unitPriceAoa?: number | null;
  unitLabel?: string;
};

async function applyDbStockDelta(
  db: ReturnType<typeof getStoreClient>,
  items: StoreOrderItem[],
  direction: "deduct" | "restore",
) {
  for (const item of items) {
    if (!item.productId) continue;
    const pRes = await db.execute({
      sql: "SELECT stock_mode, stock_quantity FROM store_products WHERE id = ?",
      args: [item.productId],
    });
    const pRow = pRes.rows[0] as DatabaseRow | undefined;
    if (!pRow || text(pRow.stock_mode) !== "stock") continue;
    const current = Math.max(0, numberValue(pRow.stock_quantity));
    const nextQty = direction === "deduct" ? Math.max(0, current - item.quantity) : current + item.quantity;
    await db.execute({
      sql: "UPDATE store_products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [nextQty, item.productId],
    });
  }
}

function applyMemoryStockDelta(items: StoreOrderItem[], direction: "deduct" | "restore") {
  for (const item of items) {
    if (!item.productId) continue;
    const product = memoryProducts.find((p) => p.id === item.productId);
    if (!product || product.stockMode !== "stock") continue;
    product.stockQuantity =
      direction === "deduct"
        ? Math.max(0, product.stockQuantity - item.quantity)
        : product.stockQuantity + item.quantity;
    product.stockStatus = computeStockStatus(product.stockMode, product.stockQuantity, product.lowStockThreshold);
  }
}

export async function createAdminOrder(input: {
  items?: AdminOrderItemPayload[];
  productId: string | null;
  productName: string;
  quantity: number;
  customerId?: string | null;
  customerName: string;
  telephone: string;
  address: string;
  city: string;
  deliveryNotes: string;
  status: StoreOrderStatus;
  source: StoreOrderSource;
  adminNotes: string;
}): Promise<StoreOrder> {
  const id = randomUUID();
  const reference = generateOrderReference();
  const rawItems: AdminOrderItemPayload[] =
    input.items && input.items.length > 0
      ? input.items
      : [
          {
            productId: input.productId,
            productName: input.productName,
            quantity: input.quantity,
          },
        ];

  const shouldDeduct = isCommittedStatus(input.status);

  if (!isStoreConfigured()) {
    const resolvedItems: StoreOrderItem[] = rawItems.map((raw) => {
      const matched = raw.productId ? memoryProducts.find((p) => p.id === raw.productId) : undefined;
      const unitPrice = raw.unitPriceAoa !== undefined ? raw.unitPriceAoa : matched?.priceAoa ?? null;
      return {
        id: randomUUID(),
        productId: matched?.id ?? null,
        productName: matched?.name ?? raw.productName,
        sku: raw.sku || matched?.sku || "",
        quantity: raw.quantity,
        unitPriceAoa: unitPrice,
        unitLabel: raw.unitLabel || matched?.unitLabel || "unidade",
        subtotalAoa: unitPrice !== null ? unitPrice * raw.quantity : null,
      };
    });

    const summary = summarizeOrderItems(resolvedItems);
    const customerId =
      input.customerId ??
      upsertMemoryCustomer({
        name: input.customerName,
        telephone: input.telephone,
        address: input.address,
        city: input.city,
      });

    if (shouldDeduct) {
      applyMemoryStockDelta(resolvedItems, "deduct");
    }

    const timestamp = nowIso();
    const order: StoreOrder = {
      id,
      reference,
      customerId,
      productId: resolvedItems[0]?.productId ?? null,
      productName: summary.productName,
      quantity: summary.quantity,
      items: resolvedItems,
      totalAoa: summary.totalAoa,
      hasConsultationItems: summary.hasConsultationItems,
      stockDeducted: shouldDeduct,
      customerName: input.customerName,
      telephone: input.telephone,
      address: input.address,
      city: input.city,
      deliveryNotes: input.deliveryNotes,
      status: input.status,
      source: input.source,
      adminNotes: input.adminNotes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    memoryOrders.unshift(order);
    syncMemoryCounts();
    return order;
  }

  return query(async (db) => {
    const resolvedItems: StoreOrderItem[] = [];
    for (const raw of rawItems) {
      let resolvedId: string | null = null;
      let resolvedName = raw.productName;
      let resolvedSku = raw.sku ?? "";
      let resolvedPrice: number | null = raw.unitPriceAoa ?? null;
      let resolvedUnit = raw.unitLabel || "unidade";

      if (raw.productId) {
        const pRes = await db.execute({
          sql: "SELECT id, name, sku, price_aoa, unit_label FROM store_products WHERE id = ?",
          args: [raw.productId],
        });
        const pRow = pRes.rows[0] as DatabaseRow | undefined;
        if (pRow) {
          resolvedId = text(pRow.id);
          resolvedName = text(pRow.name);
          resolvedSku = resolvedSku || text(pRow.sku);
          if (raw.unitPriceAoa === undefined) resolvedPrice = nullableInt(pRow.price_aoa);
          if (!raw.unitLabel) resolvedUnit = text(pRow.unit_label) || "unidade";
        }
      }

      resolvedItems.push({
        id: randomUUID(),
        productId: resolvedId,
        productName: resolvedName,
        sku: resolvedSku,
        quantity: raw.quantity,
        unitPriceAoa: resolvedPrice,
        unitLabel: resolvedUnit,
        subtotalAoa: resolvedPrice !== null ? resolvedPrice * raw.quantity : null,
      });
    }

    const summary = summarizeOrderItems(resolvedItems);
    const customerId =
      input.customerId ??
      (await upsertDbCustomer(db, {
        name: input.customerName,
        telephone: input.telephone,
        address: input.address,
        city: input.city,
      }));

    await db.execute({
      sql: `INSERT INTO store_orders
              (id, reference, customer_id, product_id, product_name, quantity,
               total_aoa, has_consultation_items, stock_deducted, customer_name,
               telephone, address, city, delivery_notes, status, source, admin_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        reference,
        customerId,
        resolvedItems[0]?.productId ?? null,
        summary.productName,
        summary.quantity,
        summary.totalAoa,
        summary.hasConsultationItems ? 1 : 0,
        shouldDeduct ? 1 : 0,
        input.customerName,
        input.telephone,
        input.address,
        input.city,
        input.deliveryNotes,
        input.status,
        input.source,
        input.adminNotes,
      ],
    });

    for (const item of resolvedItems) {
      await db.execute({
        sql: `INSERT INTO store_order_items
                (id, order_id, product_id, product_name, sku, quantity, unit_price_aoa, unit_label, subtotal_aoa)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          item.id,
          id,
          item.productId,
          item.productName,
          item.sku,
          item.quantity,
          item.unitPriceAoa,
          item.unitLabel,
          item.subtotalAoa,
        ],
      });
    }

    if (shouldDeduct) {
      await applyDbStockDelta(db, resolvedItems, "deduct");
    }

    const [created, itemsMap] = await Promise.all([
      db.execute({ sql: `${orderSelect} WHERE id = ?`, args: [id] }),
      fetchOrderItemsMap(db, [id]),
    ]);
    return mapOrder(created.rows[0] as DatabaseRow, itemsMap);
  });
}

export async function updateAdminOrder(
  id: string,
  input: Partial<{
    items: AdminOrderItemPayload[];
    productId: string | null;
    productName: string;
    quantity: number;
    customerId: string | null;
    customerName: string;
    telephone: string;
    address: string;
    city: string;
    deliveryNotes: string;
    status: StoreOrderStatus;
    source: StoreOrderSource;
    adminNotes: string;
  }>,
): Promise<StoreOrder | null> {
  if (!isStoreConfigured()) {
    const order = memoryOrders.find((item) => item.id === id);
    if (!order) return null;

    const wasDeducted = order.stockDeducted;
    if (wasDeducted && (input.items !== undefined || (input.status !== undefined && !isCommittedStatus(input.status)))) {
      applyMemoryStockDelta(order.items, "restore");
      order.stockDeducted = false;
    }

    if (input.items && input.items.length > 0) {
      order.items = input.items.map((raw) => {
        const matched = raw.productId ? memoryProducts.find((p) => p.id === raw.productId) : undefined;
        const unitPrice = raw.unitPriceAoa !== undefined ? raw.unitPriceAoa : matched?.priceAoa ?? null;
        return {
          id: randomUUID(),
          productId: matched?.id ?? null,
          productName: matched?.name ?? raw.productName,
          sku: raw.sku || matched?.sku || "",
          quantity: raw.quantity,
          unitPriceAoa: unitPrice,
          unitLabel: raw.unitLabel || matched?.unitLabel || "unidade",
          subtotalAoa: unitPrice !== null ? unitPrice * raw.quantity : null,
        };
      });
    } else if (input.productId !== undefined || input.productName !== undefined || input.quantity !== undefined) {
      const matched = input.productId ? memoryProducts.find((p) => p.id === input.productId) : null;
      const first = order.items[0] ?? {
        id: randomUUID(),
        productId: order.productId,
        productName: order.productName,
        sku: "",
        quantity: order.quantity,
        unitPriceAoa: null,
        unitLabel: "unidade",
        subtotalAoa: null,
      };
      if (input.productId !== undefined) {
        first.productId = matched?.id ?? null;
        if (matched) {
          first.productName = matched.name;
          first.sku = matched.sku;
          first.unitPriceAoa = matched.priceAoa;
          first.unitLabel = matched.unitLabel;
        }
      }
      if (input.productName !== undefined) first.productName = input.productName;
      if (input.quantity !== undefined) first.quantity = input.quantity;
      first.subtotalAoa = first.unitPriceAoa !== null ? first.unitPriceAoa * first.quantity : null;
      order.items = [first, ...order.items.slice(1)];
    }

    const summary = summarizeOrderItems(order.items);
    order.productId = order.items[0]?.productId ?? null;
    order.productName = summary.productName;
    order.quantity = summary.quantity;
    order.totalAoa = summary.totalAoa;
    order.hasConsultationItems = summary.hasConsultationItems;

    if (input.customerName !== undefined) order.customerName = input.customerName;
    if (input.telephone !== undefined) order.telephone = input.telephone;
    if (input.address !== undefined) order.address = input.address;
    if (input.city !== undefined) order.city = input.city;
    if (input.deliveryNotes !== undefined) order.deliveryNotes = input.deliveryNotes;
    if (input.status !== undefined) order.status = input.status;
    if (input.source !== undefined) order.source = input.source;
    if (input.adminNotes !== undefined) order.adminNotes = input.adminNotes;

    if (!order.stockDeducted && isCommittedStatus(order.status)) {
      applyMemoryStockDelta(order.items, "deduct");
      order.stockDeducted = true;
    }

    order.updatedAt = nowIso();
    syncMemoryCounts();
    return order;
  }

  return query(async (db) => {
    const [existingRes, itemsMap] = await Promise.all([
      db.execute({ sql: `${orderSelect} WHERE id = ?`, args: [id] }),
      fetchOrderItemsMap(db, [id]),
    ]);
    const row = existingRes.rows[0] as DatabaseRow | undefined;
    if (!row) return null;
    const current = mapOrder(row, itemsMap);

    const nextStatus = input.status ?? current.status;
    let nextItems = current.items;

    // Restore stock before mutating items or if moving out of committed status
    let stockDeducted = current.stockDeducted;
    if (stockDeducted && (input.items !== undefined || !isCommittedStatus(nextStatus))) {
      await applyDbStockDelta(db, current.items, "restore");
      stockDeducted = false;
    }

    if (input.items && input.items.length > 0) {
      nextItems = [];
      for (const raw of input.items) {
        let resolvedId: string | null = null;
        let resolvedName = raw.productName;
        let resolvedSku = raw.sku ?? "";
        let resolvedPrice: number | null = raw.unitPriceAoa ?? null;
        let resolvedUnit = raw.unitLabel || "unidade";
        if (raw.productId) {
          const pRes = await db.execute({
            sql: "SELECT id, name, sku, price_aoa, unit_label FROM store_products WHERE id = ?",
            args: [raw.productId],
          });
          const pRow = pRes.rows[0] as DatabaseRow | undefined;
          if (pRow) {
            resolvedId = text(pRow.id);
            resolvedName = text(pRow.name);
            resolvedSku = resolvedSku || text(pRow.sku);
            if (raw.unitPriceAoa === undefined) resolvedPrice = nullableInt(pRow.price_aoa);
            if (!raw.unitLabel) resolvedUnit = text(pRow.unit_label) || "unidade";
          }
        }
        nextItems.push({
          id: randomUUID(),
          productId: resolvedId,
          productName: resolvedName,
          sku: resolvedSku,
          quantity: raw.quantity,
          unitPriceAoa: resolvedPrice,
          unitLabel: resolvedUnit,
          subtotalAoa: resolvedPrice !== null ? resolvedPrice * raw.quantity : null,
        });
      }

      await db.execute({ sql: "DELETE FROM store_order_items WHERE order_id = ?", args: [id] });
      for (const item of nextItems) {
        await db.execute({
          sql: `INSERT INTO store_order_items
                  (id, order_id, product_id, product_name, sku, quantity, unit_price_aoa, unit_label, subtotal_aoa)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            item.id, id, item.productId, item.productName, item.sku,
            item.quantity, item.unitPriceAoa, item.unitLabel, item.subtotalAoa,
          ],
        });
      }
    }

    const summary = summarizeOrderItems(nextItems);

    if (!stockDeducted && isCommittedStatus(nextStatus)) {
      await applyDbStockDelta(db, nextItems, "deduct");
      stockDeducted = true;
    }

    await db.execute({
      sql: `UPDATE store_orders
            SET product_id = ?, product_name = ?, quantity = ?, total_aoa = ?,
                has_consultation_items = ?, stock_deducted = ?, customer_name = ?,
                telephone = ?, address = ?, city = ?, delivery_notes = ?,
                status = ?, source = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        nextItems[0]?.productId ?? null,
        summary.productName,
        summary.quantity,
        summary.totalAoa,
        summary.hasConsultationItems ? 1 : 0,
        stockDeducted ? 1 : 0,
        input.customerName ?? current.customerName,
        input.telephone ?? current.telephone,
        input.address ?? current.address,
        input.city ?? current.city,
        input.deliveryNotes ?? current.deliveryNotes,
        nextStatus,
        input.source ?? current.source,
        input.adminNotes ?? current.adminNotes,
        id,
      ],
    });

    const [updated, updatedItemsMap] = await Promise.all([
      db.execute({ sql: `${orderSelect} WHERE id = ?`, args: [id] }),
      fetchOrderItemsMap(db, [id]),
    ]);
    return updated.rows[0] ? mapOrder(updated.rows[0] as DatabaseRow, updatedItemsMap) : null;
  });
}

export async function deleteAdminOrder(id: string): Promise<boolean> {
  if (!isStoreConfigured()) {
    const idx = memoryOrders.findIndex((item) => item.id === id);
    if (idx === -1) return false;
    const [removed] = memoryOrders.splice(idx, 1);
    if (removed.stockDeducted) {
      applyMemoryStockDelta(removed.items, "restore");
    }
    syncMemoryCounts();
    return true;
  }
  return query(async (db) => {
    const [existingRes, itemsMap] = await Promise.all([
      db.execute({ sql: `${orderSelect} WHERE id = ?`, args: [id] }),
      fetchOrderItemsMap(db, [id]),
    ]);
    if (existingRes.rows[0]) {
      const current = mapOrder(existingRes.rows[0] as DatabaseRow, itemsMap);
      if (current.stockDeducted) {
        await applyDbStockDelta(db, current.items, "restore");
      }
    }
    const result = await db.execute({ sql: "DELETE FROM store_orders WHERE id = ?", args: [id] });
    return result.rowsAffected > 0;
  });
}

export async function listAdminCustomers(): Promise<StoreCustomer[]> {
  if (!isStoreConfigured()) {
    return memoryCustomers
      .map((c) => {
        const custOrders = memoryOrders.filter(
          (o) => o.customerId === c.id || normalizePhone(o.telephone) === c.normalizedPhone,
        );
        const totalSpentAoa = custOrders
          .filter((o) => o.status !== "cancelado")
          .reduce((sum, o) => sum + (o.totalAoa ?? 0), 0);
        const lastOrderAt = custOrders[0]?.createdAt ?? null;
        return {
          ...c,
          orderCount: custOrders.length,
          totalSpentAoa,
          lastOrderAt,
        };
      })
      .sort((a, b) => b.orderCount - a.orderCount || b.updatedAt.localeCompare(a.updatedAt));
  }

  return query(async (db) => {
    // Backfill any pre-existing orders that aren't yet linked to store_customers
    const unlinked = await db.execute(
      "SELECT id, customer_name, telephone, address, city FROM store_orders WHERE customer_id IS NULL",
    );
    for (const raw of unlinked.rows) {
      const r = raw as DatabaseRow;
      const cid = await upsertDbCustomer(db, {
        name: text(r.customer_name),
        telephone: text(r.telephone),
        address: text(r.address),
        city: text(r.city),
      });
      if (cid) {
        await db.execute({
          sql: "UPDATE store_orders SET customer_id = ? WHERE id = ?",
          args: [cid, text(r.id)],
        });
      }
    }

    const res = await db.execute(`
      SELECT c.id, c.name, c.telephone, c.normalized_phone, c.email, c.nif,
             c.default_address, c.default_city, c.notes, c.created_at, c.updated_at,
             COUNT(o.id) AS order_count,
             COALESCE(SUM(CASE WHEN o.status != 'cancelado' THEN COALESCE(o.total_aoa, 0) ELSE 0 END), 0) AS total_spent_aoa,
             MAX(o.created_at) AS last_order_at
      FROM store_customers c
      LEFT JOIN store_orders o ON o.customer_id = c.id
      GROUP BY c.id
      ORDER BY order_count DESC, COALESCE(last_order_at, c.updated_at) DESC
    `);
    return res.rows.map((r) => mapCustomer(r as DatabaseRow));
  });
}

export async function createAdminCustomer(input: {
  name: string;
  telephone: string;
  email: string;
  nif: string;
  defaultAddress: string;
  defaultCity: string;
  notes: string;
}): Promise<StoreCustomer> {
  const normalizedPhone = normalizePhone(input.telephone);
  if (!normalizedPhone || normalizedPhone.length < 6) {
    throw new StoreError("Indique um número de telefone válido.", 400, "INVALID_PHONE");
  }

  if (!isStoreConfigured()) {
    if (memoryCustomers.some((c) => c.normalizedPhone === normalizedPhone)) {
      throw new StoreError("Já existe um cliente registado com este telefone.", 409, "CUSTOMER_EXISTS");
    }
    const timestamp = nowIso();
    const customer: StoreCustomer = {
      id: randomUUID(),
      name: input.name,
      telephone: input.telephone,
      normalizedPhone,
      email: input.email,
      nif: input.nif,
      defaultAddress: input.defaultAddress,
      defaultCity: input.defaultCity,
      notes: input.notes,
      orderCount: 0,
      totalSpentAoa: 0,
      lastOrderAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    memoryCustomers.unshift(customer);
    return customer;
  }

  const id = randomUUID();
  await query(async (db) => {
    await db.execute({
      sql: `INSERT INTO store_customers
              (id, name, telephone, normalized_phone, email, nif, default_address, default_city, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, input.name, input.telephone, normalizedPhone,
        input.email, input.nif, input.defaultAddress, input.defaultCity, input.notes,
      ],
    });
  });

  const all = await listAdminCustomers();
  const created = all.find((c) => c.id === id);
  if (!created) throw new Error("Customer creation did not return a record");
  return created;
}

export async function updateAdminCustomer(
  id: string,
  input: Partial<{
    name: string;
    telephone: string;
    email: string;
    nif: string;
    defaultAddress: string;
    defaultCity: string;
    notes: string;
  }>,
): Promise<StoreCustomer | null> {
  if (!isStoreConfigured()) {
    const customer = memoryCustomers.find((c) => c.id === id);
    if (!customer) return null;
    if (input.name !== undefined) customer.name = input.name;
    if (input.telephone !== undefined) {
      const norm = normalizePhone(input.telephone);
      if (norm.length < 6) throw new StoreError("Indique um número de telefone válido.", 400, "INVALID_PHONE");
      customer.telephone = input.telephone;
      customer.normalizedPhone = norm;
    }
    if (input.email !== undefined) customer.email = input.email;
    if (input.nif !== undefined) customer.nif = input.nif;
    if (input.defaultAddress !== undefined) customer.defaultAddress = input.defaultAddress;
    if (input.defaultCity !== undefined) customer.defaultCity = input.defaultCity;
    if (input.notes !== undefined) customer.notes = input.notes;
    customer.updatedAt = nowIso();
    const list = await listAdminCustomers();
    return list.find((c) => c.id === id) ?? customer;
  }

  return query(async (db) => {
    const existing = await db.execute({ sql: "SELECT * FROM store_customers WHERE id = ?", args: [id] });
    const row = existing.rows[0] as DatabaseRow | undefined;
    if (!row) return null;

    const nextTel = input.telephone ?? text(row.telephone);
    const nextNorm = normalizePhone(nextTel);
    await db.execute({
      sql: `UPDATE store_customers
            SET name = ?, telephone = ?, normalized_phone = ?, email = ?, nif = ?,
                default_address = ?, default_city = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        input.name ?? text(row.name),
        nextTel,
        nextNorm,
        input.email ?? text(row.email),
        input.nif ?? text(row.nif),
        input.defaultAddress ?? text(row.default_address),
        input.defaultCity ?? text(row.default_city),
        input.notes ?? text(row.notes),
        id,
      ],
    });
    const list = await listAdminCustomers();
    return list.find((c) => c.id === id) ?? null;
  });
}

export async function getAdminCustomerOrders(customerId: string): Promise<StoreOrder[]> {
  const orders = await listAdminOrders();
  return orders.filter((o) => o.customerId === customerId);
}

export async function getAdminStoreMetrics(period: StoreMetricsPeriod): Promise<StoreMetrics> {
  const [orders, catalog, customers] = await Promise.all([
    listAdminOrders(),
    getAdminStoreCatalog(),
    listAdminCustomers(),
  ]);

  const now = Date.now();
  const cutoffMs =
    period === "7d"
      ? now - 7 * 24 * 60 * 60 * 1000
      : period === "30d"
        ? now - 30 * 24 * 60 * 60 * 1000
        : 0;

  const filteredOrders = orders.filter((order) => {
    if (cutoffMs === 0) return true;
    const t = new Date(order.createdAt).getTime();
    return Number.isNaN(t) || t >= cutoffMs;
  });

  const totalOrders = filteredOrders.length;
  const newOrders = filteredOrders.filter((o) => o.status === "novo").length;
  const confirmedOrDeliveredOrders = filteredOrders.filter(
    (o) => o.status === "confirmado" || o.status === "entregue",
  ).length;
  const deliveredOrders = filteredOrders.filter((o) => o.status === "entregue").length;
  const cancelledOrders = filteredOrders.filter((o) => o.status === "cancelado").length;
  const fulfillmentRatePercent =
    totalOrders > 0 ? Math.round((confirmedOrDeliveredOrders / totalOrders) * 100) : 0;

  const activeOrders = filteredOrders.filter((o) => o.status !== "cancelado");
  const estimatedRevenueAoa = activeOrders.reduce((sum, o) => sum + (o.totalAoa ?? 0), 0);
  const totalUnitsOrdered = activeOrders.reduce((sum, o) => sum + o.quantity, 0);

  const lowStockCount = catalog.products.filter((p) => p.stockStatus === "stock_reduzido").length;
  const outOfStockCount = catalog.products.filter((p) => p.stockStatus === "esgotado").length;

  // Orders by day (last 14 days for compact visual)
  const dayBuckets = new Map<string, { count: number; revenueAoa: number }>();
  const daysToShow = period === "7d" ? 7 : 14;
  for (let i = daysToShow - 1; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayBuckets.set(key, { count: 0, revenueAoa: 0 });
  }
  for (const order of filteredOrders) {
    const d = new Date(order.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10);
    const bucket = dayBuckets.get(key);
    if (bucket) {
      bucket.count += 1;
      if (order.status !== "cancelado") bucket.revenueAoa += order.totalAoa ?? 0;
    }
  }
  const ordersByDay = Array.from(dayBuckets.entries()).map(([date, info]) => ({
    date,
    label: date.slice(8, 10) + "/" + date.slice(5, 7),
    count: info.count,
    revenueAoa: info.revenueAoa,
  }));

  const statusCounts = new Map<StoreOrderStatus, number>();
  const sourceCounts = new Map<StoreOrderSource, number>();
  const cityCounts = new Map<string, { count: number; revenueAoa: number }>();
  const productCounts = new Map<string, { productName: string; productId: string | null; units: number; orders: number; revenueAoa: number }>();

  for (const order of filteredOrders) {
    statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1);
    sourceCounts.set(order.source, (sourceCounts.get(order.source) ?? 0) + 1);

    const cityKey = order.city.trim() || "Sem cidade indicada";
    const cityEntry = cityCounts.get(cityKey) ?? { count: 0, revenueAoa: 0 };
    cityEntry.count += 1;
    if (order.status !== "cancelado") cityEntry.revenueAoa += order.totalAoa ?? 0;
    cityCounts.set(cityKey, cityEntry);

    if (order.status !== "cancelado") {
      const seenInOrder = new Set<string>();
      for (const item of order.items) {
        const key = item.productId || item.productName;
        const entry = productCounts.get(key) ?? {
          productName: item.productName,
          productId: item.productId,
          units: 0,
          orders: 0,
          revenueAoa: 0,
        };
        entry.units += item.quantity;
        if (!seenInOrder.has(key)) {
          entry.orders += 1;
          seenInOrder.add(key);
        }
        entry.revenueAoa += item.subtotalAoa ?? 0;
        productCounts.set(key, entry);
      }
    }
  }

  return {
    period,
    totalOrders,
    newOrders,
    confirmedOrDeliveredOrders,
    deliveredOrders,
    cancelledOrders,
    fulfillmentRatePercent,
    estimatedRevenueAoa,
    totalUnitsOrdered,
    uniqueCustomers: customers.length,
    lowStockCount,
    outOfStockCount,
    ordersByDay,
    ordersByStatus: (["novo", "em_contacto", "confirmado", "entregue", "cancelado"] as StoreOrderStatus[]).map(
      (status) => ({ status, count: statusCounts.get(status) ?? 0 }),
    ),
    ordersBySource: (["loja_whatsapp", "whatsapp_direto", "admin"] as StoreOrderSource[]).map(
      (source) => ({ source, count: sourceCounts.get(source) ?? 0 }),
    ),
    topCities: Array.from(cityCounts.entries())
      .map(([city, info]) => ({ city, count: info.count, revenueAoa: info.revenueAoa }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    topProducts: Array.from(productCounts.values())
      .sort((a, b) => b.units - a.units || b.orders - a.orders)
      .slice(0, 6),
  };
}
