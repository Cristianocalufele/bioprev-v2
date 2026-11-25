import { randomUUID } from "node:crypto";
import { cloudinaryImageUrl } from "./storeMedia";
import {
  ensureStoreSchema,
  getStoreClient,
  isStoreConfigured,
  isStoreSchemaMissing,
  storeSetupRequiredError,
  StoreError,
} from "./storeDatabase";
import type {
  StoreCatalog,
  StoreCategory,
  StoreOrder,
  StoreOrderSource,
  StoreOrderStatus,
  StoreProduct,
} from "../shared/store";

type DatabaseRow = Record<string, string | number | bigint | ArrayBuffer | null>;

// In-memory fallback store used when TURSO_DATABASE_URL / TURSO_AUTH_TOKEN are not configured
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

const memoryProducts: StoreProduct[] = [
  {
    id: "22222222-2222-4222-8222-222222222201",
    name: "Estação de monitorização",
    slug: "estacao-monitorizacao",
    categoryId: "11111111-1111-4111-8111-111111111101",
    categoryName: "Monitorização",
    categorySlug: "monitorizacao",
    shortDescription: "Equipamento de apoio à observação e monitorização regular de espaços.",
    description: "Referência de equipamento para apoiar a observação de áreas e o acompanhamento de sinais de actividade.",
    imagePublicId: null,
    imageUrl: null,
    isActive: true,
    sortOrder: 10,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222202",
    name: "Armadilha de monitorização",
    slug: "armadilha-monitorizacao",
    categoryId: "11111111-1111-4111-8111-111111111101",
    categoryName: "Monitorização",
    categorySlug: "monitorizacao",
    shortDescription: "Uma opção de referência para acompanhar sinais em espaços residenciais ou profissionais.",
    description: "As características adequadas dependem do espaço e da necessidade. Fale com a equipa para confirmar a opção disponível.",
    imagePublicId: null,
    imageUrl: null,
    isActive: true,
    sortOrder: 20,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222203",
    name: "Pulverizador manual",
    slug: "pulverizador-manual",
    categoryId: "11111111-1111-4111-8111-111111111102",
    categoryName: "Limpeza",
    categorySlug: "limpeza",
    shortDescription: "Equipamento de apoio para tarefas de limpeza e manutenção do dia a dia.",
    description: "Artigo de referência. A equipa poderá esclarecer a disponibilidade e os detalhes do equipamento antes de qualquer pedido.",
    imagePublicId: null,
    imageUrl: null,
    isActive: true,
    sortOrder: 30,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222204",
    name: "Utensílio de limpeza manual",
    slug: "utensilio-limpeza",
    categoryId: "11111111-1111-4111-8111-111111111102",
    categoryName: "Limpeza",
    categorySlug: "limpeza",
    shortDescription: "Uma referência para complementar as rotinas de limpeza em casa ou no local de trabalho.",
    description: "A escolha do utensílio depende da utilização pretendida. Consulte a equipa sobre as opções disponíveis.",
    imagePublicId: null,
    imageUrl: null,
    isActive: true,
    sortOrder: 40,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222205",
    name: "Luvas de protecção",
    slug: "luvas-protecao",
    categoryId: "11111111-1111-4111-8111-111111111103",
    categoryName: "Protecção",
    categorySlug: "protecao",
    shortDescription: "Artigo de protecção individual para tarefas de higiene e limpeza.",
    description: "Consulte a equipa para confirmar as opções disponíveis e verificar se correspondem à utilização pretendida.",
    imagePublicId: null,
    imageUrl: null,
    isActive: true,
    sortOrder: 50,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222206",
    name: "Óculos de protecção",
    slug: "oculos-protecao",
    categoryId: "11111111-1111-4111-8111-111111111103",
    categoryName: "Protecção",
    categorySlug: "protecao",
    shortDescription: "Artigo de protecção individual para actividades de limpeza e manutenção.",
    description: "As opções e características devem ser confirmadas com a equipa antes de avançar com o pedido.",
    imagePublicId: null,
    imageUrl: null,
    isActive: true,
    sortOrder: 60,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const memoryOrders: StoreOrder[] = [];

function syncMemoryCounts() {
  for (const category of memoryCategories) {
    category.productCount = memoryProducts.filter((p) => p.categoryId === category.id).length;
  }
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

function mapOrder(row: DatabaseRow): StoreOrder {
  return {
    id: text(row.id),
    reference: text(row.reference),
    productId: nullableText(row.product_id),
    productName: text(row.product_name),
    quantity: numberValue(row.quantity),
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
  SELECT p.id, p.name, p.slug, p.category_id, c.name AS category_name,
         c.slug AS category_slug, p.short_description, p.description,
         p.image_public_id, p.is_active, p.sort_order, p.created_at, p.updated_at
  FROM store_products p
  JOIN store_categories c ON c.id = p.category_id
`;

const orderSelect = `
  SELECT id, reference, product_id, product_name, quantity, customer_name,
         telephone, address, city, delivery_notes, status, source, admin_notes,
         created_at, updated_at
  FROM store_orders
`;

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
  if (!isStoreConfigured()) {
    syncMemoryCounts();
    return {
      categories: [...memoryCategories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
      products: [...memoryProducts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name)),
    };
  }

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

export async function createProduct(input: {
  name: string; slug: string; categoryId: string; shortDescription: string; description: string;
  imagePublicId: string | null; isActive: boolean; sortOrder: number;
}): Promise<StoreProduct> {
  if (!isStoreConfigured()) {
    const category = memoryCategories.find((c) => c.id === input.categoryId);
    if (!category) throw new Error("Category not found");
    const timestamp = nowIso();
    const product: StoreProduct = {
      id: randomUUID(),
      name: input.name,
      slug: slugify(input.slug || input.name),
      categoryId: category.id,
      categoryName: category.name,
      categorySlug: category.slug,
      shortDescription: input.shortDescription,
      description: input.description,
      imagePublicId: input.imagePublicId,
      imageUrl: input.imagePublicId ? cloudinaryImageUrl(input.imagePublicId) : null,
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
  if (!isStoreConfigured()) {
    const product = memoryProducts.find((item) => item.id === id);
    if (!product) return null;
    const category = memoryCategories.find((c) => c.id === input.categoryId);
    if (!category) throw new Error("Category not found");
    const previousImagePublicId = product.imagePublicId;
    product.name = input.name;
    product.slug = slugify(input.slug || input.name);
    product.categoryId = category.id;
    product.categoryName = category.name;
    product.categorySlug = category.slug;
    product.shortDescription = input.shortDescription;
    product.description = input.description;
    product.imagePublicId = input.imagePublicId;
    product.imageUrl = input.imagePublicId ? cloudinaryImageUrl(input.imagePublicId) : null;
    product.isActive = input.isActive;
    product.sortOrder = input.sortOrder;
    product.updatedAt = nowIso();
    syncMemoryCounts();
    return { product, previousImagePublicId };
  }

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
  if (!isStoreConfigured()) {
    const idx = memoryProducts.findIndex((item) => item.id === id);
    if (idx === -1) return { deleted: false, imagePublicId: null };
    const [removed] = memoryProducts.splice(idx, 1);
    syncMemoryCounts();
    return { deleted: true, imagePublicId: removed.imagePublicId };
  }

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

export async function createPublicOrder(input: {
  productId: string;
  quantity: number;
  customerName: string;
  telephone: string;
  address: string;
  city: string;
  deliveryNotes: string;
}): Promise<StoreOrder> {
  const id = randomUUID();
  const reference = generateOrderReference();

  if (!isStoreConfigured()) {
    const product = memoryProducts.find((item) => item.id === input.productId && item.isActive);
    if (!product) {
      throw new StoreError("O artigo seleccionado já não está disponível no catálogo.", 404, "PRODUCT_NOT_FOUND");
    }
    const timestamp = nowIso();
    const order: StoreOrder = {
      id,
      reference,
      productId: product.id,
      productName: product.name,
      quantity: input.quantity,
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
    return order;
  }

  return query(async (db) => {
    const productRes = await db.execute({
      sql: `SELECT p.id, p.name
            FROM store_products p
            JOIN store_categories c ON c.id = p.category_id
            WHERE p.id = ? AND p.is_active = 1 AND c.is_active = 1`,
      args: [input.productId],
    });
    const productRow = productRes.rows[0] as DatabaseRow | undefined;
    if (!productRow) {
      throw new StoreError("O artigo seleccionado já não está disponível no catálogo.", 404, "PRODUCT_NOT_FOUND");
    }
    const productName = text(productRow.name);

    await db.execute({
      sql: `INSERT INTO store_orders
              (id, reference, product_id, product_name, quantity, customer_name,
               telephone, address, city, delivery_notes, status, source, admin_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'novo', 'loja_whatsapp', '')`,
      args: [
        id, reference, input.productId, productName, input.quantity,
        input.customerName, input.telephone, input.address, input.city, input.deliveryNotes,
      ],
    });

    const created = await db.execute({ sql: `${orderSelect} WHERE id = ?`, args: [id] });
    return mapOrder(created.rows[0] as DatabaseRow);
  });
}

export async function listAdminOrders(): Promise<StoreOrder[]> {
  if (!isStoreConfigured()) {
    return [...memoryOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return query(async (db) => {
    const result = await db.execute(`${orderSelect} ORDER BY created_at DESC`);
    return result.rows.map((row) => mapOrder(row as DatabaseRow));
  });
}

export async function createAdminOrder(input: {
  productId: string | null;
  productName: string;
  quantity: number;
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

  if (!isStoreConfigured()) {
    const matchedProduct = input.productId ? memoryProducts.find((item) => item.id === input.productId) : undefined;
    const timestamp = nowIso();
    const order: StoreOrder = {
      id,
      reference,
      productId: matchedProduct?.id ?? null,
      productName: matchedProduct?.name ?? input.productName,
      quantity: input.quantity,
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
    return order;
  }

  return query(async (db) => {
    let resolvedProductId: string | null = null;
    let resolvedProductName = input.productName;
    if (input.productId) {
      const productRes = await db.execute({ sql: "SELECT id, name FROM store_products WHERE id = ?", args: [input.productId] });
      const row = productRes.rows[0] as DatabaseRow | undefined;
      if (row) {
        resolvedProductId = text(row.id);
        resolvedProductName = text(row.name);
      }
    }

    await db.execute({
      sql: `INSERT INTO store_orders
              (id, reference, product_id, product_name, quantity, customer_name,
               telephone, address, city, delivery_notes, status, source, admin_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, reference, resolvedProductId, resolvedProductName, input.quantity,
        input.customerName, input.telephone, input.address, input.city, input.deliveryNotes,
        input.status, input.source, input.adminNotes,
      ],
    });
    const created = await db.execute({ sql: `${orderSelect} WHERE id = ?`, args: [id] });
    return mapOrder(created.rows[0] as DatabaseRow);
  });
}

export async function updateAdminOrder(
  id: string,
  input: Partial<{
    productId: string | null;
    productName: string;
    quantity: number;
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
    if (input.productId !== undefined) {
      const matched = input.productId ? memoryProducts.find((p) => p.id === input.productId) : null;
      order.productId = matched?.id ?? null;
      if (matched) order.productName = matched.name;
    }
    if (input.productName !== undefined) order.productName = input.productName;
    if (input.quantity !== undefined) order.quantity = input.quantity;
    if (input.customerName !== undefined) order.customerName = input.customerName;
    if (input.telephone !== undefined) order.telephone = input.telephone;
    if (input.address !== undefined) order.address = input.address;
    if (input.city !== undefined) order.city = input.city;
    if (input.deliveryNotes !== undefined) order.deliveryNotes = input.deliveryNotes;
    if (input.status !== undefined) order.status = input.status;
    if (input.source !== undefined) order.source = input.source;
    if (input.adminNotes !== undefined) order.adminNotes = input.adminNotes;
    order.updatedAt = nowIso();
    return order;
  }

  return query(async (db) => {
    const existingRes = await db.execute({ sql: `${orderSelect} WHERE id = ?`, args: [id] });
    const row = existingRes.rows[0] as DatabaseRow | undefined;
    if (!row) return null;
    const current = mapOrder(row);

    let nextProductId = input.productId !== undefined ? input.productId : current.productId;
    let nextProductName = input.productName !== undefined ? input.productName : current.productName;
    if (input.productId) {
      const pRes = await db.execute({ sql: "SELECT id, name FROM store_products WHERE id = ?", args: [input.productId] });
      const pRow = pRes.rows[0] as DatabaseRow | undefined;
      if (pRow) {
        nextProductId = text(pRow.id);
        nextProductName = text(pRow.name);
      }
    }

    await db.execute({
      sql: `UPDATE store_orders
            SET product_id = ?, product_name = ?, quantity = ?, customer_name = ?,
                telephone = ?, address = ?, city = ?, delivery_notes = ?,
                status = ?, source = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        nextProductId,
        nextProductName,
        input.quantity ?? current.quantity,
        input.customerName ?? current.customerName,
        input.telephone ?? current.telephone,
        input.address ?? current.address,
        input.city ?? current.city,
        input.deliveryNotes ?? current.deliveryNotes,
        input.status ?? current.status,
        input.source ?? current.source,
        input.adminNotes ?? current.adminNotes,
        id,
      ],
    });

    const updated = await db.execute({ sql: `${orderSelect} WHERE id = ?`, args: [id] });
    return updated.rows[0] ? mapOrder(updated.rows[0] as DatabaseRow) : null;
  });
}

export async function deleteAdminOrder(id: string): Promise<boolean> {
  if (!isStoreConfigured()) {
    const idx = memoryOrders.findIndex((item) => item.id === id);
    if (idx === -1) return false;
    memoryOrders.splice(idx, 1);
    return true;
  }
  return query(async (db) => {
    const result = await db.execute({ sql: "DELETE FROM store_orders WHERE id = ?", args: [id] });
    return result.rowsAffected > 0;
  });
}
