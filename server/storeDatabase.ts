import { createClient, type Client } from "@libsql/client";
import { randomUUID } from "node:crypto";
import type { ProductSpecItem, ProductStockMode } from "../shared/store";

export class StoreError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

let client: Client | undefined;
let schemaReadyPromise: Promise<void> | undefined;

export function isStoreConfigured(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL?.trim() && process.env.TURSO_AUTH_TOKEN?.trim());
}

export async function verifyTursoHealth(): Promise<{
  configured: boolean;
  connected: boolean;
  latencyMs?: number;
  error?: string;
}> {
  if (!isStoreConfigured()) {
    return {
      configured: false,
      connected: false,
      error: "Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN nas variáveis de ambiente.",
    };
  }

  const startedAt = Date.now();
  try {
    const db = getStoreClient();
    await db.execute("SELECT 1 AS ok");
    return {
      configured: true,
      connected: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      error: error instanceof Error ? error.message : "Não foi possível estabelecer ligação ao Turso.",
    };
  }
}

export function getStoreClient(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url || !authToken) {
    throw new StoreError(
      "A ligação à base da loja ainda não está configurada. Consulte o guia de configuração.",
      503,
      "STORE_CONFIGURATION_REQUIRED",
    );
  }

  try {
    client = createClient({ url, authToken });
    return client;
  } catch {
    throw new StoreError(
      "Não foi possível inicializar a ligação à base da loja. Verifique a configuração do Turso.",
      503,
      "STORE_CONNECTION_FAILED",
    );
  }
}

export const initialCategories = [
  { name: "Monitorização", slug: "monitorizacao", description: "Artigos de apoio à monitorização de espaços.", sortOrder: 10 },
  { name: "Limpeza", slug: "limpeza", description: "Equipamentos e utensílios para rotinas de limpeza.", sortOrder: 20 },
  { name: "Protecção", slug: "protecao", description: "Artigos de protecção individual e segurança.", sortOrder: 30 },
];

export type InitialProductSeed = {
  name: string;
  slug: string;
  sku: string;
  category: string;
  short: string;
  description: string;
  priceAoa: number | null;
  unitLabel: string;
  stockQuantity: number;
  lowStockThreshold: number;
  stockMode: ProductStockMode;
  isFeatured: boolean;
  specs: ProductSpecItem[];
  sortOrder: number;
};

export const initialProducts: InitialProductSeed[] = [
  {
    name: "Estação de monitorização",
    slug: "estacao-monitorizacao",
    sku: "BP-MON-001",
    category: "monitorizacao",
    short: "Equipamento de apoio à observação e monitorização regular de espaços.",
    description: "Referência técnica de alta resistência com sistema de fechadura de segurança para apoiar a observação contínua de áreas comerciais, industriais e logísticas.",
    priceAoa: null,
    unitLabel: "unidade",
    stockQuantity: 0,
    lowStockThreshold: 5,
    stockMode: "por_encomenda",
    isFeatured: true,
    specs: [
      { label: "Material", value: "Polipropileno de alta densidade (UV)" },
      { label: "Fecho", value: "Chave de segurança anti-violação" },
      { label: "Aplicação", value: "Interior e exterior" },
      { label: "Conformidade", value: "Controlo de Pragas HACCP / ISO" },
    ],
    sortOrder: 10,
  },
  {
    name: "Armadilha de monitorização",
    slug: "armadilha-monitorizacao",
    sku: "BP-MON-002",
    category: "monitorizacao",
    short: "Uma opção de referência para acompanhar sinais em espaços residenciais ou profissionais.",
    description: "Dispositivo de monitorização discreto para registo de actividade em zonas sensíveis, armazéns alimentares e escritórios.",
    priceAoa: 14500,
    unitLabel: "conjunto (5 unid.)",
    stockQuantity: 28,
    lowStockThreshold: 6,
    stockMode: "stock",
    isFeatured: true,
    specs: [
      { label: "Apresentação", value: "Embalagem com 5 unidades" },
      { label: "Tipo", value: "Monitorização passiva sem químicos" },
      { label: "Utilização", value: "Zonas alimentares, escritórios e casas" },
    ],
    sortOrder: 20,
  },
  {
    name: "Pulverizador manual",
    slug: "pulverizador-manual",
    sku: "BP-LMP-001",
    category: "limpeza",
    short: "Equipamento de apoio para tarefas de limpeza e manutenção do dia a dia.",
    description: "Pulverizador manual de pressão prévia com bico regulável e vedantes resistentes, indicado para higienização e aplicação uniforme de soluções.",
    priceAoa: 28500,
    unitLabel: "unidade",
    stockQuantity: 16,
    lowStockThreshold: 5,
    stockMode: "stock",
    isFeatured: true,
    specs: [
      { label: "Capacidade útil", value: "5 Litros" },
      { label: "Pressão máxima", value: "3 bar com válvula de segurança" },
      { label: "Bico", value: "Latão / polipropileno regulável" },
      { label: "Alça", value: "Transporte ergonómico ao ombro" },
    ],
    sortOrder: 30,
  },
  {
    name: "Utensílio de limpeza manual",
    slug: "utensilio-limpeza",
    sku: "BP-LMP-002",
    category: "limpeza",
    short: "Uma referência para complementar as rotinas de limpeza em casa ou no local de trabalho.",
    description: "Conjunto técnico de escovagem e remoção com fibras resistentes para rotinas profissionais de higienização de superfícies.",
    priceAoa: 9800,
    unitLabel: "unidade",
    stockQuantity: 4,
    lowStockThreshold: 5,
    stockMode: "stock",
    isFeatured: false,
    specs: [
      { label: "Cabo", value: "Polímero ergonómico antiderrapante" },
      { label: "Cerdas", value: "Poliéster de média rigidez" },
      { label: "Higienização", value: "Lavável até 80 °C" },
    ],
    sortOrder: 40,
  },
  {
    name: "Luvas de protecção",
    slug: "luvas-protecao",
    sku: "BP-EPI-001",
    category: "protecao",
    short: "Artigo de protecção individual para tarefas de higiene e limpeza.",
    description: "Luvas de nitrilo de elevada resistência química e mecânica para manuseamento seguro durante acções de limpeza e desinfestação.",
    priceAoa: 11500,
    unitLabel: "caixa (100 unid.)",
    stockQuantity: 42,
    lowStockThreshold: 10,
    stockMode: "stock",
    isFeatured: false,
    specs: [
      { label: "Material", value: "Nitrilo sem pó (alta densidade)" },
      { label: "Apresentação", value: "Caixa dispensadora com 100 unidades" },
      { label: "Norma", value: "EN ISO 374" },
    ],
    sortOrder: 50,
  },
  {
    name: "Óculos de protecção",
    slug: "oculos-protecao",
    sku: "BP-EPI-002",
    category: "protecao",
    short: "Artigo de protecção individual para actividades de limpeza e manutenção.",
    description: "Óculos panorâmicos com tratamento anti-embaciamento e protecção lateral contra salpicos e poeiras em operações técnicas.",
    priceAoa: 7500,
    unitLabel: "unidade",
    stockQuantity: 22,
    lowStockThreshold: 5,
    stockMode: "stock",
    isFeatured: false,
    specs: [
      { label: "Lente", value: "Policarbonato transparente anti-risco" },
      { label: "Protecção", value: "UV e salpicos laterais" },
      { label: "Norma", value: "EN 166" },
    ],
    sortOrder: 60,
  },
];

async function ensureColumns(
  db: Client,
  tableName: "store_products" | "store_orders",
  columns: Array<{ name: string; definition: string }>,
) {
  const info = await db.execute(`PRAGMA table_info(${tableName})`);
  const existing = new Set(info.rows.map((r) => String((r as Record<string, unknown>).name)));
  for (const col of columns) {
    if (!existing.has(col.name)) {
      await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.definition}`);
    }
  }
}

export async function ensureStoreSchema(): Promise<void> {
  if (!isStoreConfigured()) return;
  if (schemaReadyPromise) return schemaReadyPromise;

  schemaReadyPromise = (async () => {
    const db = getStoreClient();
    await db.executeMultiple(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS store_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS store_products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        sku TEXT NOT NULL DEFAULT '',
        category_id TEXT NOT NULL REFERENCES store_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        short_description TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        price_aoa INTEGER,
        unit_label TEXT NOT NULL DEFAULT 'unidade',
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        stock_mode TEXT NOT NULL DEFAULT 'por_encomenda',
        is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
        specs_json TEXT NOT NULL DEFAULT '[]',
        image_public_id TEXT,
        datasheet_public_id TEXT,
        datasheet_external_url TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS store_products_category_idx ON store_products(category_id);
      CREATE INDEX IF NOT EXISTS store_products_active_order_idx ON store_products(is_active, sort_order);

      CREATE TABLE IF NOT EXISTS store_product_images (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES store_products(id) ON UPDATE CASCADE ON DELETE CASCADE,
        image_public_id TEXT NOT NULL,
        alt_text TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS store_product_images_product_idx ON store_product_images(product_id, sort_order);

      CREATE TABLE IF NOT EXISTS store_customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        telephone TEXT NOT NULL,
        normalized_phone TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL DEFAULT '',
        nif TEXT NOT NULL DEFAULT '',
        default_address TEXT NOT NULL DEFAULT '',
        default_city TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS store_customers_phone_idx ON store_customers(normalized_phone);

      CREATE TABLE IF NOT EXISTS store_orders (
        id TEXT PRIMARY KEY,
        reference TEXT NOT NULL UNIQUE,
        customer_id TEXT REFERENCES store_customers(id) ON UPDATE CASCADE ON DELETE SET NULL,
        product_id TEXT REFERENCES store_products(id) ON UPDATE CASCADE ON DELETE SET NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
        total_aoa INTEGER,
        has_consultation_items INTEGER NOT NULL DEFAULT 1 CHECK (has_consultation_items IN (0, 1)),
        stock_deducted INTEGER NOT NULL DEFAULT 0 CHECK (stock_deducted IN (0, 1)),
        customer_name TEXT NOT NULL DEFAULT '',
        telephone TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL DEFAULT '',
        delivery_notes TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'novo',
        source TEXT NOT NULL DEFAULT 'loja_whatsapp',
        admin_notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS store_orders_status_created_idx ON store_orders(status, created_at);

      CREATE TABLE IF NOT EXISTS store_order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES store_orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
        product_id TEXT REFERENCES store_products(id) ON UPDATE CASCADE ON DELETE SET NULL,
        product_name TEXT NOT NULL,
        sku TEXT NOT NULL DEFAULT '',
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
        unit_price_aoa INTEGER,
        unit_label TEXT NOT NULL DEFAULT 'unidade',
        subtotal_aoa INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS store_order_items_order_idx ON store_order_items(order_id);
      CREATE INDEX IF NOT EXISTS store_order_items_product_idx ON store_order_items(product_id);

      CREATE TABLE IF NOT EXISTS store_admin_auth (
        key TEXT PRIMARY KEY,
        passcode_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS store_setup_state (
        key TEXT PRIMARY KEY,
        completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Upgrade pre-existing Turso tables safely with any newly added columns
    await ensureColumns(db, "store_products", [
      { name: "sku", definition: "TEXT NOT NULL DEFAULT ''" },
      { name: "price_aoa", definition: "INTEGER" },
      { name: "unit_label", definition: "TEXT NOT NULL DEFAULT 'unidade'" },
      { name: "stock_quantity", definition: "INTEGER NOT NULL DEFAULT 0" },
      { name: "low_stock_threshold", definition: "INTEGER NOT NULL DEFAULT 5" },
      { name: "stock_mode", definition: "TEXT NOT NULL DEFAULT 'por_encomenda'" },
      { name: "is_featured", definition: "INTEGER NOT NULL DEFAULT 0" },
      { name: "specs_json", definition: "TEXT NOT NULL DEFAULT '[]'" },
      { name: "datasheet_public_id", definition: "TEXT" },
      { name: "datasheet_external_url", definition: "TEXT NOT NULL DEFAULT ''" },
    ]);

    await ensureColumns(db, "store_orders", [
      { name: "customer_id", definition: "TEXT" },
      { name: "total_aoa", definition: "INTEGER" },
      { name: "has_consultation_items", definition: "INTEGER NOT NULL DEFAULT 1" },
      { name: "stock_deducted", definition: "INTEGER NOT NULL DEFAULT 0" },
    ]);

    // Backfill store_order_items for any legacy single-item orders without item rows
    await db.execute(`
      INSERT INTO store_order_items (id, order_id, product_id, product_name, sku, quantity, unit_price_aoa, unit_label, subtotal_aoa)
      SELECT lower(hex(randomblob(16))), o.id, o.product_id, o.product_name, COALESCE(p.sku, ''), o.quantity,
             p.price_aoa, COALESCE(p.unit_label, 'unidade'),
             CASE WHEN p.price_aoa IS NOT NULL THEN p.price_aoa * o.quantity ELSE NULL END
      FROM store_orders o
      LEFT JOIN store_products p ON p.id = o.product_id
      WHERE NOT EXISTS (SELECT 1 FROM store_order_items oi WHERE oi.order_id = o.id)
    `);

    const seedState = await db.execute("SELECT key FROM store_setup_state WHERE key = 'initial_catalog_v1'");
    if (seedState.rows.length === 0) {
      const categoryIds = new Map<string, string>();
      for (const category of initialCategories) {
        await db.execute({
          sql: `INSERT INTO store_categories (id, name, slug, description, sort_order)
                VALUES (?, ?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING`,
          args: [randomUUID(), category.name, category.slug, category.description, category.sortOrder],
        });
        const stored = await db.execute({ sql: "SELECT id FROM store_categories WHERE slug = ?", args: [category.slug] });
        if (stored.rows[0]) {
          categoryIds.set(category.slug, String(stored.rows[0].id));
        }
      }
      for (const product of initialProducts) {
        const categoryId = categoryIds.get(product.category);
        if (!categoryId) continue;
        await db.execute({
          sql: `INSERT INTO store_products
                  (id, name, slug, sku, category_id, short_description, description,
                   price_aoa, unit_label, stock_quantity, low_stock_threshold, stock_mode,
                   is_featured, specs_json, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING`,
          args: [
            randomUUID(),
            product.name,
            product.slug,
            product.sku,
            categoryId,
            product.short,
            product.description,
            product.priceAoa,
            product.unitLabel,
            product.stockQuantity,
            product.lowStockThreshold,
            product.stockMode,
            product.isFeatured ? 1 : 0,
            JSON.stringify(product.specs),
            product.sortOrder,
          ],
        });
      }
      await db.execute("INSERT OR IGNORE INTO store_setup_state (key) VALUES ('initial_catalog_v1')");
    }
  })().catch((error) => {
    schemaReadyPromise = undefined;
    throw error;
  });

  return schemaReadyPromise;
}

export function isStoreSchemaMissing(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("no such table") || message.includes("does not exist");
}

export function storeSetupRequiredError(): StoreError {
  return new StoreError(
    "A base da loja existe, mas ainda não foi inicializada. Depois de configurar o Turso, execute npm run db:store:setup.",
    503,
    "STORE_SETUP_REQUIRED",
  );
}
