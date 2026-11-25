// server/app.ts
import express2 from "express";
import cors from "cors";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  users;
  subscribers;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.subscribers = /* @__PURE__ */ new Map();
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async subscribeNewsletter(data) {
    const existing = await this.getNewsletterSubscriber(data.email);
    if (existing) return existing;
    const id = randomUUID();
    const subscriber = { id, email: data.email, subscribedAt: /* @__PURE__ */ new Date() };
    this.subscribers.set(data.email, subscriber);
    return subscriber;
  }
  async getNewsletterSubscriber(email) {
    return this.subscribers.get(email);
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull()
});
var insertNewsletterSchema = createInsertSchema(newsletterSubscribers).pick({
  email: true
});

// server/routes.ts
import { z as z3 } from "zod";

// server/storeRoutes.ts
import express, { Router } from "express";
import { z as z2 } from "zod";

// shared/store.ts
import { z } from "zod";
var stockModes = ["stock", "por_encomenda"];
var productSpecSchema = z.object({
  label: z.string().trim().min(1, "Indique o nome da especifica\xE7\xE3o.").max(80),
  value: z.string().trim().min(1, "Indique o valor da especifica\xE7\xE3o.").max(160)
});
var productGalleryImageInputSchema = z.object({
  imagePublicId: z.string().trim().regex(/^bioprev\/products\/[A-Za-z0-9_-]+$/, "A imagem da galeria n\xE3o \xE9 v\xE1lida."),
  altText: z.string().trim().max(160).optional().default(""),
  sortOrder: z.number().int().min(0).max(1e3).optional().default(0)
});
var categoryInputSchema = z.object({
  name: z.string().trim().min(2, "Indique um nome de categoria.").max(80),
  slug: z.string().trim().max(100).optional().default(""),
  description: z.string().trim().max(300).optional().default(""),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1e4).default(0)
});
var safeDatasheetUrlSchema = z.string().trim().max(500).refine(
  (val) => val === "" || /^https:\/\/.+/i.test(val),
  "O link da ficha t\xE9cnica deve come\xE7ar por https://."
);
var productInputSchema = z.object({
  name: z.string().trim().min(2, "Indique o nome do artigo.").max(120),
  slug: z.string().trim().max(140).optional().default(""),
  sku: z.string().trim().max(40).optional().default(""),
  categoryId: z.string().uuid("Seleccione uma categoria v\xE1lida."),
  shortDescription: z.string().trim().min(5, "Escreva uma descri\xE7\xE3o curta.").max(220),
  description: z.string().trim().max(3e3).optional().default(""),
  priceAoa: z.number().int().min(0).max(1e9).nullable().optional().default(null),
  unitLabel: z.string().trim().min(1).max(40).optional().default("unidade"),
  stockQuantity: z.number().int().min(0).max(1e6).optional().default(0),
  lowStockThreshold: z.number().int().min(0).max(1e5).optional().default(5),
  stockMode: z.enum(stockModes).optional().default("por_encomenda"),
  isFeatured: z.boolean().optional().default(false),
  specs: z.array(productSpecSchema).max(20).optional().default([]),
  imagePublicId: z.string().trim().regex(/^bioprev\/products\/[A-Za-z0-9_-]+$/, "A imagem n\xE3o \xE9 v\xE1lida.").nullable().optional().default(null),
  galleryImages: z.array(productGalleryImageInputSchema).max(10).optional().default([]),
  datasheetPublicId: z.string().trim().regex(/^bioprev\/datasheets\/[A-Za-z0-9_.-]+$/, "O ficheiro da ficha t\xE9cnica n\xE3o \xE9 v\xE1lido.").nullable().optional().default(null),
  datasheetExternalUrl: safeDatasheetUrlSchema.optional().default(""),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1e4).default(0)
});
var orderStatuses = [
  "novo",
  "em_contacto",
  "confirmado",
  "entregue",
  "cancelado"
];
var orderSources = [
  "loja_whatsapp",
  "whatsapp_direto",
  "admin"
];
var publicOrderItemInputSchema = z.object({
  productId: z.string().uuid("Artigo inv\xE1lido."),
  quantity: z.number().int().min(1, "A quantidade m\xEDnima \xE9 1.").max(1e4)
});
var publicOrderInputSchema = z.object({
  items: z.array(publicOrderItemInputSchema).min(1, "Adicione pelo menos um artigo.").max(50).optional(),
  productId: z.string().uuid("Artigo inv\xE1lido.").optional(),
  quantity: z.number().int().min(1, "A quantidade m\xEDnima \xE9 1.").max(1e4).optional(),
  customerName: z.string().trim().max(120).optional().default(""),
  telephone: z.string().trim().min(6, "Indique um n\xFAmero de telefone v\xE1lido.").max(40),
  address: z.string().trim().min(8, "Indique a morada completa de entrega.").max(500),
  city: z.string().trim().max(100).optional().default(""),
  deliveryNotes: z.string().trim().max(500).optional().default("")
}).refine(
  (data) => data.items && data.items.length > 0 || Boolean(data.productId),
  "Seleccione pelo menos um artigo para encomendar."
);
var adminOrderItemInputSchema = z.object({
  productId: z.string().uuid().nullable().optional().default(null),
  productName: z.string().trim().min(2, "Indique o nome do artigo.").max(160),
  sku: z.string().trim().max(40).optional().default(""),
  quantity: z.number().int().min(1, "A quantidade m\xEDnima \xE9 1.").max(1e4),
  unitPriceAoa: z.number().int().min(0).max(1e9).nullable().optional().default(null),
  unitLabel: z.string().trim().max(40).optional().default("unidade")
});
var adminOrderInputSchema = z.object({
  items: z.array(adminOrderItemInputSchema).min(1).max(50).optional(),
  productId: z.string().uuid().nullable().optional().default(null),
  productName: z.string().trim().max(160).optional().default(""),
  quantity: z.number().int().min(1).max(1e4).optional().default(1),
  customerId: z.string().uuid().nullable().optional().default(null),
  customerName: z.string().trim().max(120).optional().default(""),
  telephone: z.string().trim().min(6, "Indique um n\xFAmero de telefone v\xE1lido.").max(40),
  address: z.string().trim().min(4, "Indique a morada de entrega.").max(500),
  city: z.string().trim().max(100).optional().default(""),
  deliveryNotes: z.string().trim().max(500).optional().default(""),
  status: z.enum(orderStatuses).default("novo"),
  source: z.enum(orderSources).default("whatsapp_direto"),
  adminNotes: z.string().trim().max(1e3).optional().default("")
}).refine(
  (data) => data.items && data.items.length > 0 || data.productName.trim().length >= 2,
  "Indique pelo menos um artigo para o pedido."
);
var adminOrderUpdateSchema = z.object({
  items: z.array(adminOrderItemInputSchema).min(1).max(50).optional(),
  productId: z.string().uuid().nullable().optional(),
  productName: z.string().trim().min(2).max(160).optional(),
  quantity: z.number().int().min(1).max(1e4).optional(),
  customerId: z.string().uuid().nullable().optional(),
  customerName: z.string().trim().max(120).optional(),
  telephone: z.string().trim().min(6).max(40).optional(),
  address: z.string().trim().min(4).max(500).optional(),
  city: z.string().trim().max(100).optional(),
  deliveryNotes: z.string().trim().max(500).optional(),
  status: z.enum(orderStatuses).optional(),
  source: z.enum(orderSources).optional(),
  adminNotes: z.string().trim().max(1e3).optional()
});
var customerInputSchema = z.object({
  name: z.string().trim().min(2, "Indique o nome do cliente ou empresa.").max(120),
  telephone: z.string().trim().min(6, "Indique um telefone v\xE1lido.").max(40),
  email: z.string().trim().max(120).refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Indique um e-mail v\xE1lido.").optional().default(""),
  nif: z.string().trim().max(40).optional().default(""),
  defaultAddress: z.string().trim().max(500).optional().default(""),
  defaultCity: z.string().trim().max(100).optional().default(""),
  notes: z.string().trim().max(1e3).optional().default("")
});
var customerUpdateSchema = customerInputSchema.partial();
var categoryPayloadSchema = categoryInputSchema;
var productPayloadSchema = productInputSchema;

// server/storeAuth.ts
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// server/storeDatabase.ts
import { createClient } from "@libsql/client/web";
import { randomUUID as randomUUID2 } from "node:crypto";
var StoreError = class extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "StoreError";
  }
};
var client;
var schemaReadyPromise;
function isStoreConfigured() {
  return Boolean(process.env.TURSO_DATABASE_URL?.trim() && process.env.TURSO_AUTH_TOKEN?.trim());
}
async function verifyTursoHealth() {
  if (!isStoreConfigured()) {
    return {
      configured: false,
      connected: false,
      error: "Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN nas vari\xE1veis de ambiente."
    };
  }
  const startedAt = Date.now();
  try {
    const db = getStoreClient();
    await db.execute("SELECT 1 AS ok");
    return {
      configured: true,
      connected: true,
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      error: error instanceof Error ? error.message : "N\xE3o foi poss\xEDvel estabelecer liga\xE7\xE3o ao Turso."
    };
  }
}
function getStoreClient() {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url || !authToken) {
    throw new StoreError(
      "A liga\xE7\xE3o \xE0 base da loja ainda n\xE3o est\xE1 configurada. Consulte o guia de configura\xE7\xE3o.",
      503,
      "STORE_CONFIGURATION_REQUIRED"
    );
  }
  try {
    client = createClient({ url, authToken });
    return client;
  } catch {
    throw new StoreError(
      "N\xE3o foi poss\xEDvel inicializar a liga\xE7\xE3o \xE0 base da loja. Verifique a configura\xE7\xE3o do Turso.",
      503,
      "STORE_CONNECTION_FAILED"
    );
  }
}
var initialCategories = [
  { name: "Monitoriza\xE7\xE3o", slug: "monitorizacao", description: "Artigos de apoio \xE0 monitoriza\xE7\xE3o de espa\xE7os.", sortOrder: 10 },
  { name: "Limpeza", slug: "limpeza", description: "Equipamentos e utens\xEDlios para rotinas de limpeza.", sortOrder: 20 },
  { name: "Protec\xE7\xE3o", slug: "protecao", description: "Artigos de protec\xE7\xE3o individual e seguran\xE7a.", sortOrder: 30 }
];
var initialProducts = [
  {
    name: "Esta\xE7\xE3o de monitoriza\xE7\xE3o",
    slug: "estacao-monitorizacao",
    sku: "BP-MON-001",
    category: "monitorizacao",
    short: "Equipamento de apoio \xE0 observa\xE7\xE3o e monitoriza\xE7\xE3o regular de espa\xE7os.",
    description: "Refer\xEAncia t\xE9cnica de alta resist\xEAncia com sistema de fechadura de seguran\xE7a para apoiar a observa\xE7\xE3o cont\xEDnua de \xE1reas comerciais, industriais e log\xEDsticas.",
    priceAoa: null,
    unitLabel: "unidade",
    stockQuantity: 0,
    lowStockThreshold: 5,
    stockMode: "por_encomenda",
    isFeatured: true,
    specs: [
      { label: "Material", value: "Polipropileno de alta densidade (UV)" },
      { label: "Fecho", value: "Chave de seguran\xE7a anti-viola\xE7\xE3o" },
      { label: "Aplica\xE7\xE3o", value: "Interior e exterior" },
      { label: "Conformidade", value: "Controlo de Pragas HACCP / ISO" }
    ],
    sortOrder: 10
  },
  {
    name: "Armadilha de monitoriza\xE7\xE3o",
    slug: "armadilha-monitorizacao",
    sku: "BP-MON-002",
    category: "monitorizacao",
    short: "Uma op\xE7\xE3o de refer\xEAncia para acompanhar sinais em espa\xE7os residenciais ou profissionais.",
    description: "Dispositivo de monitoriza\xE7\xE3o discreto para registo de actividade em zonas sens\xEDveis, armaz\xE9ns alimentares e escrit\xF3rios.",
    priceAoa: 14500,
    unitLabel: "conjunto (5 unid.)",
    stockQuantity: 28,
    lowStockThreshold: 6,
    stockMode: "stock",
    isFeatured: true,
    specs: [
      { label: "Apresenta\xE7\xE3o", value: "Embalagem com 5 unidades" },
      { label: "Tipo", value: "Monitoriza\xE7\xE3o passiva sem qu\xEDmicos" },
      { label: "Utiliza\xE7\xE3o", value: "Zonas alimentares, escrit\xF3rios e casas" }
    ],
    sortOrder: 20
  },
  {
    name: "Pulverizador manual",
    slug: "pulverizador-manual",
    sku: "BP-LMP-001",
    category: "limpeza",
    short: "Equipamento de apoio para tarefas de limpeza e manuten\xE7\xE3o do dia a dia.",
    description: "Pulverizador manual de press\xE3o pr\xE9via com bico regul\xE1vel e vedantes resistentes, indicado para higieniza\xE7\xE3o e aplica\xE7\xE3o uniforme de solu\xE7\xF5es.",
    priceAoa: 28500,
    unitLabel: "unidade",
    stockQuantity: 16,
    lowStockThreshold: 5,
    stockMode: "stock",
    isFeatured: true,
    specs: [
      { label: "Capacidade \xFAtil", value: "5 Litros" },
      { label: "Press\xE3o m\xE1xima", value: "3 bar com v\xE1lvula de seguran\xE7a" },
      { label: "Bico", value: "Lat\xE3o / polipropileno regul\xE1vel" },
      { label: "Al\xE7a", value: "Transporte ergon\xF3mico ao ombro" }
    ],
    sortOrder: 30
  },
  {
    name: "Utens\xEDlio de limpeza manual",
    slug: "utensilio-limpeza",
    sku: "BP-LMP-002",
    category: "limpeza",
    short: "Uma refer\xEAncia para complementar as rotinas de limpeza em casa ou no local de trabalho.",
    description: "Conjunto t\xE9cnico de escovagem e remo\xE7\xE3o com fibras resistentes para rotinas profissionais de higieniza\xE7\xE3o de superf\xEDcies.",
    priceAoa: 9800,
    unitLabel: "unidade",
    stockQuantity: 4,
    lowStockThreshold: 5,
    stockMode: "stock",
    isFeatured: false,
    specs: [
      { label: "Cabo", value: "Pol\xEDmero ergon\xF3mico antiderrapante" },
      { label: "Cerdas", value: "Poli\xE9ster de m\xE9dia rigidez" },
      { label: "Higieniza\xE7\xE3o", value: "Lav\xE1vel at\xE9 80 \xB0C" }
    ],
    sortOrder: 40
  },
  {
    name: "Luvas de protec\xE7\xE3o",
    slug: "luvas-protecao",
    sku: "BP-EPI-001",
    category: "protecao",
    short: "Artigo de protec\xE7\xE3o individual para tarefas de higiene e limpeza.",
    description: "Luvas de nitrilo de elevada resist\xEAncia qu\xEDmica e mec\xE2nica para manuseamento seguro durante ac\xE7\xF5es de limpeza e desinfesta\xE7\xE3o.",
    priceAoa: 11500,
    unitLabel: "caixa (100 unid.)",
    stockQuantity: 42,
    lowStockThreshold: 10,
    stockMode: "stock",
    isFeatured: false,
    specs: [
      { label: "Material", value: "Nitrilo sem p\xF3 (alta densidade)" },
      { label: "Apresenta\xE7\xE3o", value: "Caixa dispensadora com 100 unidades" },
      { label: "Norma", value: "EN ISO 374" }
    ],
    sortOrder: 50
  },
  {
    name: "\xD3culos de protec\xE7\xE3o",
    slug: "oculos-protecao",
    sku: "BP-EPI-002",
    category: "protecao",
    short: "Artigo de protec\xE7\xE3o individual para actividades de limpeza e manuten\xE7\xE3o.",
    description: "\xD3culos panor\xE2micos com tratamento anti-embaciamento e protec\xE7\xE3o lateral contra salpicos e poeiras em opera\xE7\xF5es t\xE9cnicas.",
    priceAoa: 7500,
    unitLabel: "unidade",
    stockQuantity: 22,
    lowStockThreshold: 5,
    stockMode: "stock",
    isFeatured: false,
    specs: [
      { label: "Lente", value: "Policarbonato transparente anti-risco" },
      { label: "Protec\xE7\xE3o", value: "UV e salpicos laterais" },
      { label: "Norma", value: "EN 166" }
    ],
    sortOrder: 60
  }
];
async function ensureColumns(db, tableName, columns) {
  const info = await db.execute(`PRAGMA table_info(${tableName})`);
  const existing = new Set(info.rows.map((r) => String(r.name)));
  for (const col of columns) {
    if (!existing.has(col.name)) {
      await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.definition}`);
    }
  }
}
async function ensureStoreSchema() {
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
      { name: "datasheet_external_url", definition: "TEXT NOT NULL DEFAULT ''" }
    ]);
    await ensureColumns(db, "store_orders", [
      { name: "customer_id", definition: "TEXT" },
      { name: "total_aoa", definition: "INTEGER" },
      { name: "has_consultation_items", definition: "INTEGER NOT NULL DEFAULT 1" },
      { name: "stock_deducted", definition: "INTEGER NOT NULL DEFAULT 0" }
    ]);
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
      const categoryIds = /* @__PURE__ */ new Map();
      for (const category of initialCategories) {
        await db.execute({
          sql: `INSERT INTO store_categories (id, name, slug, description, sort_order)
                VALUES (?, ?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING`,
          args: [randomUUID2(), category.name, category.slug, category.description, category.sortOrder]
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
            randomUUID2(),
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
            product.sortOrder
          ]
        });
      }
      await db.execute("INSERT OR IGNORE INTO store_setup_state (key) VALUES ('initial_catalog_v1')");
    }
  })().catch((error) => {
    schemaReadyPromise = void 0;
    throw error;
  });
  return schemaReadyPromise;
}
function isStoreSchemaMissing(error) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("no such table") || message.includes("does not exist");
}
function storeSetupRequiredError() {
  return new StoreError(
    "A base da loja existe, mas ainda n\xE3o foi inicializada. Depois de configurar o Turso, execute npm run db:store:setup.",
    503,
    "STORE_SETUP_REQUIRED"
  );
}

// server/storeAuth.ts
var TOKEN_TTL_MS = 24 * 60 * 60 * 1e3;
var ephemeralSessionSecret = randomBytes(32).toString("hex");
var memoryPasscodeHash = null;
function configuredEnvPasscode() {
  return process.env.ADMIN_PASSCODE?.trim() || process.env.ADMIN_PASSWORD?.trim() || void 0;
}
function sessionSecret() {
  const explicit = process.env.ADMIN_SESSION_SECRET?.trim();
  if (explicit) return explicit;
  const envSeed = [
    process.env.ADMIN_PASSCODE?.trim(),
    process.env.ADMIN_PASSWORD?.trim(),
    process.env.TURSO_AUTH_TOKEN?.trim(),
    process.env.TURSO_DATABASE_URL?.trim(),
    process.env.CLOUDINARY_API_SECRET?.trim()
  ].filter(Boolean).join("|");
  if (envSeed) {
    return createHmac("sha256", "bioprev-store-session-v1").update(envSeed).digest("hex");
  }
  return ephemeralSessionSecret;
}
function hashPasscode(passcode) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(passcode, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}
function verifyPasscodeHash(passcode, storedHash) {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const derived = scryptSync(passcode, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
async function getSavedPasscodeHash() {
  if (isStoreConfigured()) {
    await ensureStoreSchema();
    const db = getStoreClient();
    const res = await db.execute("SELECT passcode_hash FROM store_admin_auth WHERE key = 'primary_admin'");
    const row = res.rows[0];
    if (row?.passcode_hash) {
      return String(row.passcode_hash);
    }
    return null;
  }
  return memoryPasscodeHash;
}
async function savePasscodeHash(hash) {
  if (isStoreConfigured()) {
    await ensureStoreSchema();
    const db = getStoreClient();
    const res = await db.execute({
      sql: "INSERT INTO store_admin_auth (key, passcode_hash) VALUES ('primary_admin', ?) ON CONFLICT(key) DO NOTHING",
      args: [hash]
    });
    return res.rowsAffected > 0;
  }
  if (memoryPasscodeHash) return false;
  memoryPasscodeHash = hash;
  return true;
}
async function getAdminAuthStatus() {
  if (configuredEnvPasscode()) {
    return { mode: "passcode", configured: true, needsSetup: false, usingSecretEnv: true };
  }
  const saved = await getSavedPasscodeHash();
  return { mode: "passcode", configured: Boolean(saved), needsSetup: !saved, usingSecretEnv: false };
}
function issueAdminToken() {
  const payload = Buffer.from(
    JSON.stringify({ sub: "store-admin", exp: Date.now() + TOKEN_TTL_MS }),
    "utf8"
  ).toString("base64url");
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
function verifyAdminToken(token) {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, providedSig] = parts;
  if (!payload || !providedSig) return false;
  const expectedSig = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  const providedBuf = Buffer.from(providedSig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    return false;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return parsed.sub === "store-admin" && typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}
async function setupInitialPasscode(passcode) {
  if (configuredEnvPasscode()) {
    throw new StoreError(
      "A senha de administrador j\xE1 est\xE1 definida nas vari\xE1veis de ambiente (Secrets).",
      409,
      "ADMIN_ALREADY_CONFIGURED"
    );
  }
  const hash = hashPasscode(passcode);
  const created = await savePasscodeHash(hash);
  if (!created) {
    throw new StoreError("A senha de administrador j\xE1 foi definida.", 409, "ADMIN_ALREADY_CONFIGURED");
  }
  return issueAdminToken();
}
async function verifyAdminPasscodeLogin(passcode) {
  const envPasscode = configuredEnvPasscode();
  if (envPasscode) {
    const a = Buffer.from(passcode, "utf8");
    const b = Buffer.from(envPasscode, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new StoreError("Senha incorrecta. Verifique e tente novamente.", 401, "INVALID_CREDENTIALS");
    }
    return issueAdminToken();
  }
  const savedHash = await getSavedPasscodeHash();
  if (!savedHash) {
    throw new StoreError("Defina primeiro a senha de administrador.", 409, "ADMIN_SETUP_REQUIRED");
  }
  if (!verifyPasscodeHash(passcode, savedHash)) {
    throw new StoreError("Senha incorrecta. Verifique e tente novamente.", 401, "INVALID_CREDENTIALS");
  }
  return issueAdminToken();
}
function assertAllowedOrigin(req, res) {
  const origin = req.get("origin");
  if (origin && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const requestHost = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim().toLowerCase();
    try {
      if (new URL(origin).host.toLowerCase() !== requestHost) {
        res.status(403).json({ message: "Pedido de origem n\xE3o autorizado.", code: "ORIGIN_NOT_ALLOWED" });
        return false;
      }
    } catch {
      res.status(403).json({ message: "Pedido de origem n\xE3o autorizado.", code: "ORIGIN_NOT_ALLOWED" });
      return false;
    }
  }
  return true;
}
async function requireStoreAdmin(req, res, next) {
  if (!assertAllowedOrigin(req, res)) return;
  const authHeader = req.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token || !verifyAdminToken(token)) {
    return res.status(401).json({
      message: "Inicie sess\xE3o com a senha de administrador para gerir a loja.",
      code: "AUTHENTICATION_REQUIRED"
    });
  }
  req.storeAdminEmail = process.env.ADMIN_EMAIL?.trim() || "admin@bioprev.ao";
  return next();
}

// server/storeRepository.ts
import { randomUUID as randomUUID4 } from "node:crypto";

// server/storeMedia.ts
import { v2 as cloudinary } from "cloudinary";
import { randomUUID as randomUUID3 } from "node:crypto";
var allowedMimeTypes = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
var maximumImageBytes = 5 * 1024 * 1024;
var maximumPdfBytes = 10 * 1024 * 1024;
function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() && process.env.CLOUDINARY_API_KEY?.trim() && process.env.CLOUDINARY_API_SECRET?.trim()
  );
}
function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new StoreError(
      "O envio de ficheiros ainda n\xE3o est\xE1 configurado. Consulte o guia de configura\xE7\xE3o da loja.",
      503,
      "MEDIA_CONFIGURATION_REQUIRED"
    );
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return cloudName;
}
async function verifyCloudinaryHealth() {
  if (!isCloudinaryConfigured()) {
    return {
      configured: false,
      connected: false,
      error: "Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET nas vari\xE1veis de ambiente."
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
      error: cloudinaryHealthErrorMessage(error)
    };
  }
}
function cloudinaryHealthErrorMessage(error) {
  const fallback = "N\xE3o foi poss\xEDvel validar a liga\xE7\xE3o \xE0 Cloudinary.";
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();
  if (typeof error !== "object" || error === null) return fallback;
  const details = error;
  const nestedError = typeof details.error === "object" && details.error !== null ? details.error : void 0;
  const message = (typeof details.message === "string" && details.message.trim() ? details.message : void 0) ?? (typeof details.error === "string" && details.error.trim() ? details.error : void 0) ?? (typeof nestedError?.message === "string" && nestedError.message.trim() ? nestedError.message : void 0);
  if (!message) return fallback;
  const status = details.http_code ?? details.statusCode ?? details.status;
  return typeof status === "number" || typeof status === "string" && status.trim() ? `Cloudinary (${status}): ${message}` : message;
}
function hasValidImageSignature(buffer, mimeType) {
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  if (mimeType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/webp") return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (mimeType === "image/avif") {
    return buffer.toString("ascii", 4, 8) === "ftyp" && /^(avif|avis)$/.test(buffer.toString("ascii", 8, 12));
  }
  return false;
}
function hasValidPdfSignature(buffer) {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}
function assertImageUpload(buffer, mimeType) {
  if (!allowedMimeTypes.has(mimeType) || !hasValidImageSignature(buffer, mimeType)) {
    throw new StoreError("Formato de imagem n\xE3o aceite. Use JPG, PNG, WebP ou AVIF.", 415, "INVALID_IMAGE_FORMAT");
  }
  if (buffer.length === 0 || buffer.length > maximumImageBytes) {
    throw new StoreError("A imagem tem de ter entre 1 byte e 5 MB.", 413, "IMAGE_SIZE_LIMIT");
  }
}
function assertPdfUpload(buffer, mimeType) {
  if (mimeType !== "application/pdf" || !hasValidPdfSignature(buffer)) {
    throw new StoreError("Envie um documento em formato PDF v\xE1lido.", 415, "INVALID_PDF_FORMAT");
  }
  if (buffer.length === 0 || buffer.length > maximumPdfBytes) {
    throw new StoreError("A ficha t\xE9cnica PDF n\xE3o pode exceder 10 MB.", 413, "PDF_SIZE_LIMIT");
  }
}
function cloudinaryImageUrl(publicId) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName || !publicId.startsWith("bioprev/products/")) return null;
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/upload/f_auto,q_auto,w_900,c_limit/${publicId.split("/").map(encodeURIComponent).join("/")}`;
}
function cloudinaryDatasheetUrl(publicId) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName || !publicId.startsWith("bioprev/datasheets/")) return null;
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/raw/upload/${publicId.split("/").map(encodeURIComponent).join("/")}`;
}
async function uploadProductImage(buffer, mimeType) {
  const cloudName = cloudinaryConfig();
  assertImageUpload(buffer, mimeType);
  const publicId = `bioprev/products/${randomUUID3()}`;
  const uploaded = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "bioprev/products",
        public_id: publicId.split("/").at(-1),
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
        overwrite: false,
        transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto", fetch_format: "auto" }]
      },
      (error, result) => {
        if (error || !result) return reject(new StoreError("A Cloudinary n\xE3o conseguiu guardar a imagem.", 502, "MEDIA_UPLOAD_FAILED"));
        resolve(result);
      }
    ).end(buffer);
  });
  if (!uploaded.public_id.startsWith("bioprev/products/") || !uploaded.secure_url.startsWith(`https://res.cloudinary.com/${cloudName}/`)) {
    try {
      await deleteProductImage(uploaded.public_id);
    } catch {
    }
    throw new StoreError("A resposta do servi\xE7o de imagens n\xE3o passou na valida\xE7\xE3o.", 502, "MEDIA_UPLOAD_INVALID_RESPONSE");
  }
  return { publicId: uploaded.public_id, imageUrl: uploaded.secure_url };
}
async function deleteProductImage(publicId) {
  if (!publicId.startsWith("bioprev/products/") || publicId.includes("..")) {
    throw new StoreError("A imagem indicada n\xE3o pertence ao cat\xE1logo da loja.", 400, "INVALID_IMAGE_ID");
  }
  cloudinaryConfig();
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new StoreError("N\xE3o foi poss\xEDvel remover a imagem da Cloudinary.", 502, "MEDIA_DELETE_FAILED");
  }
}
async function uploadProductDatasheet(buffer, mimeType) {
  const cloudName = cloudinaryConfig();
  assertPdfUpload(buffer, mimeType);
  const fileKey = `${randomUUID3()}.pdf`;
  const uploaded = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "bioprev/datasheets",
        public_id: fileKey,
        resource_type: "raw",
        overwrite: false
      },
      (error, result) => {
        if (error || !result) return reject(new StoreError("A Cloudinary n\xE3o conseguiu guardar o PDF da ficha t\xE9cnica.", 502, "DATASHEET_UPLOAD_FAILED"));
        resolve(result);
      }
    ).end(buffer);
  });
  if (!uploaded.public_id.startsWith("bioprev/datasheets/") || !uploaded.secure_url.startsWith(`https://res.cloudinary.com/${cloudName}/`)) {
    try {
      await deleteProductDatasheet(uploaded.public_id);
    } catch {
    }
    throw new StoreError("A resposta do servi\xE7o de ficheiros n\xE3o passou na valida\xE7\xE3o.", 502, "DATASHEET_INVALID_RESPONSE");
  }
  return { publicId: uploaded.public_id, datasheetUrl: uploaded.secure_url };
}
async function deleteProductDatasheet(publicId) {
  if (!publicId.startsWith("bioprev/datasheets/") || publicId.includes("..")) {
    throw new StoreError("A ficha t\xE9cnica indicada n\xE3o pertence ao cat\xE1logo da loja.", 400, "INVALID_DATASHEET_ID");
  }
  cloudinaryConfig();
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: "raw", invalidate: true });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new StoreError("N\xE3o foi poss\xEDvel remover a ficha t\xE9cnica da Cloudinary.", 502, "DATASHEET_DELETE_FAILED");
  }
}

// server/storeRepository.ts
var nowIso = () => (/* @__PURE__ */ new Date()).toISOString();
var memoryCategories = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    name: "Monitoriza\xE7\xE3o",
    slug: "monitorizacao",
    description: "Artigos de apoio \xE0 monitoriza\xE7\xE3o de espa\xE7os.",
    isActive: true,
    sortOrder: 10,
    productCount: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    name: "Limpeza",
    slug: "limpeza",
    description: "Equipamentos e utens\xEDlios para rotinas de limpeza.",
    isActive: true,
    sortOrder: 20,
    productCount: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    name: "Protec\xE7\xE3o",
    slug: "protecao",
    description: "Artigos de protec\xE7\xE3o individual e seguran\xE7a.",
    isActive: true,
    sortOrder: 30,
    productCount: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
];
function computeStockStatus(stockMode, stockQuantity, lowStockThreshold) {
  if (stockMode === "por_encomenda") return "por_encomenda";
  if (stockQuantity <= 0) return "esgotado";
  if (stockQuantity <= lowStockThreshold) return "stock_reduzido";
  return "em_stock";
}
var categoryMapBySlug = new Map(memoryCategories.map((c) => [c.slug, c]));
var memoryProducts = initialProducts.map((seed, index) => {
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
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
});
var memoryOrders = [];
var memoryCustomers = [];
function syncMemoryCounts() {
  for (const category of memoryCategories) {
    category.productCount = memoryProducts.filter((p) => p.categoryId === category.id).length;
  }
  const counts = /* @__PURE__ */ new Map();
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
function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("9")) {
    return `244${digits}`;
  }
  return digits;
}
function generateOrderReference() {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const short = randomUUID4().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `BP-${year}-${short}`;
}
function text2(value) {
  return value === null || value === void 0 ? "" : String(value);
}
function nullableText(value) {
  return value === null || value === void 0 || value === "" ? null : String(value);
}
function numberValue(value) {
  return Number(value ?? 0);
}
function nullableInt(value) {
  if (value === null || value === void 0 || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}
function booleanValue(value) {
  return Number(value ?? 0) === 1;
}
function parseSpecsJson(raw) {
  const s = text2(raw).trim();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => Boolean(item && typeof item.label === "string" && typeof item.value === "string")).map((item) => ({ label: item.label.trim(), value: item.value.trim() })).filter((item) => item.label.length > 0 && item.value.length > 0);
  } catch {
    return [];
  }
}
function slugify(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}
function isCommittedStatus(status) {
  return status === "confirmado" || status === "entregue";
}
function summarizeOrderItems(items) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const first = items[0];
  const summaryName = items.length <= 1 ? first?.productName ?? "Pedido" : `${first.productName} (+${items.length - 1} ${items.length - 1 === 1 ? "artigo" : "artigos"})`;
  let pricedSum = 0;
  let hasPriced = false;
  let hasConsultationItems = false;
  for (const item of items) {
    if (item.unitPriceAoa !== null && item.unitPriceAoa !== void 0) {
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
    hasConsultationItems
  };
}
function mapCategory(row) {
  return {
    id: text2(row.id),
    name: text2(row.name),
    slug: text2(row.slug),
    description: text2(row.description),
    isActive: booleanValue(row.is_active),
    sortOrder: numberValue(row.sort_order),
    productCount: numberValue(row.product_count),
    createdAt: text2(row.created_at),
    updatedAt: text2(row.updated_at)
  };
}
function mapProduct(row, galleryByProduct, orderCounts) {
  const id = text2(row.id);
  const imagePublicId = nullableText(row.image_public_id);
  const datasheetPublicId = nullableText(row.datasheet_public_id);
  const datasheetExternalUrl = text2(row.datasheet_external_url);
  const stockMode = text2(row.stock_mode) === "stock" ? "stock" : "por_encomenda";
  const stockQuantity = Math.max(0, numberValue(row.stock_quantity));
  const lowStockThreshold = Math.max(0, numberValue(row.low_stock_threshold ?? 5));
  return {
    id,
    name: text2(row.name),
    slug: text2(row.slug),
    sku: text2(row.sku),
    categoryId: text2(row.category_id),
    categoryName: text2(row.category_name),
    categorySlug: text2(row.category_slug),
    shortDescription: text2(row.short_description),
    description: text2(row.description),
    priceAoa: nullableInt(row.price_aoa),
    unitLabel: text2(row.unit_label) || "unidade",
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
    datasheetUrl: (datasheetPublicId ? cloudinaryDatasheetUrl(datasheetPublicId) : null) || (datasheetExternalUrl || null),
    orderCount: orderCounts?.get(id) ?? numberValue(row.order_count),
    isActive: booleanValue(row.is_active),
    sortOrder: numberValue(row.sort_order),
    createdAt: text2(row.created_at),
    updatedAt: text2(row.updated_at)
  };
}
function mapOrder(row, itemsByOrder) {
  const id = text2(row.id);
  const items = itemsByOrder?.get(id) ?? [
    {
      id: `${id}-primary`,
      productId: nullableText(row.product_id),
      productName: text2(row.product_name),
      sku: "",
      quantity: Math.max(1, numberValue(row.quantity)),
      unitPriceAoa: null,
      unitLabel: "unidade",
      subtotalAoa: null
    }
  ];
  return {
    id,
    reference: text2(row.reference),
    customerId: nullableText(row.customer_id),
    productId: nullableText(row.product_id),
    productName: text2(row.product_name),
    quantity: Math.max(1, numberValue(row.quantity)),
    items,
    totalAoa: nullableInt(row.total_aoa),
    hasConsultationItems: booleanValue(row.has_consultation_items),
    stockDeducted: booleanValue(row.stock_deducted),
    customerName: text2(row.customer_name),
    telephone: text2(row.telephone),
    address: text2(row.address),
    city: text2(row.city),
    deliveryNotes: text2(row.delivery_notes),
    status: text2(row.status),
    source: text2(row.source),
    adminNotes: text2(row.admin_notes),
    createdAt: text2(row.created_at),
    updatedAt: text2(row.updated_at)
  };
}
function mapCustomer(row) {
  return {
    id: text2(row.id),
    name: text2(row.name),
    telephone: text2(row.telephone),
    normalizedPhone: text2(row.normalized_phone),
    email: text2(row.email),
    nif: text2(row.nif),
    defaultAddress: text2(row.default_address),
    defaultCity: text2(row.default_city),
    notes: text2(row.notes),
    orderCount: numberValue(row.order_count),
    totalSpentAoa: numberValue(row.total_spent_aoa),
    lastOrderAt: nullableText(row.last_order_at),
    createdAt: text2(row.created_at),
    updatedAt: text2(row.updated_at)
  };
}
async function query(operation) {
  try {
    await ensureStoreSchema();
    return await operation(getStoreClient());
  } catch (error) {
    if (isStoreSchemaMissing(error)) throw storeSetupRequiredError();
    throw error;
  }
}
var categorySelect = `
  SELECT c.id, c.name, c.slug, c.description, c.is_active, c.sort_order,
         c.created_at, c.updated_at, COUNT(p.id) AS product_count
  FROM store_categories c
  LEFT JOIN store_products p ON p.category_id = c.id
`;
var productSelect = `
  SELECT p.id, p.name, p.slug, p.sku, p.category_id, c.name AS category_name,
         c.slug AS category_slug, p.short_description, p.description,
         p.price_aoa, p.unit_label, p.stock_quantity, p.low_stock_threshold,
         p.stock_mode, p.is_featured, p.specs_json, p.image_public_id,
         p.datasheet_public_id, p.datasheet_external_url,
         p.is_active, p.sort_order, p.created_at, p.updated_at
  FROM store_products p
  JOIN store_categories c ON c.id = p.category_id
`;
var orderSelect = `
  SELECT id, reference, customer_id, product_id, product_name, quantity,
         total_aoa, has_consultation_items, stock_deducted, customer_name,
         telephone, address, city, delivery_notes, status, source, admin_notes,
         created_at, updated_at
  FROM store_orders
`;
async function fetchGalleryImagesMap(db, productIds) {
  const map = /* @__PURE__ */ new Map();
  const result = productIds && productIds.length > 0 ? await db.execute({
    sql: `SELECT id, product_id, image_public_id, alt_text, sort_order
              FROM store_product_images
              WHERE product_id IN (${productIds.map(() => "?").join(",")})
              ORDER BY sort_order, created_at`,
    args: productIds
  }) : await db.execute(`SELECT id, product_id, image_public_id, alt_text, sort_order FROM store_product_images ORDER BY sort_order, created_at`);
  for (const raw of result.rows) {
    const row = raw;
    const productId = text2(row.product_id);
    const imagePublicId = text2(row.image_public_id);
    const list = map.get(productId) ?? [];
    list.push({
      id: text2(row.id),
      imagePublicId,
      imageUrl: cloudinaryImageUrl(imagePublicId),
      altText: text2(row.alt_text),
      sortOrder: numberValue(row.sort_order)
    });
    map.set(productId, list);
  }
  return map;
}
async function fetchProductOrderCountsMap(db) {
  const map = /* @__PURE__ */ new Map();
  const result = await db.execute(`
    SELECT oi.product_id, SUM(oi.quantity) AS total_units
    FROM store_order_items oi
    JOIN store_orders o ON o.id = oi.order_id
    WHERE oi.product_id IS NOT NULL AND o.status != 'cancelado'
    GROUP BY oi.product_id
  `);
  for (const raw of result.rows) {
    const row = raw;
    if (row.product_id) {
      map.set(text2(row.product_id), numberValue(row.total_units));
    }
  }
  return map;
}
async function fetchOrderItemsMap(db, orderIds) {
  const map = /* @__PURE__ */ new Map();
  const result = orderIds && orderIds.length > 0 ? await db.execute({
    sql: `SELECT id, order_id, product_id, product_name, sku, quantity, unit_price_aoa, unit_label, subtotal_aoa
              FROM store_order_items
              WHERE order_id IN (${orderIds.map(() => "?").join(",")})
              ORDER BY created_at`,
    args: orderIds
  }) : await db.execute(`SELECT id, order_id, product_id, product_name, sku, quantity, unit_price_aoa, unit_label, subtotal_aoa FROM store_order_items ORDER BY created_at`);
  for (const raw of result.rows) {
    const row = raw;
    const orderId = text2(row.order_id);
    const list = map.get(orderId) ?? [];
    list.push({
      id: text2(row.id),
      productId: nullableText(row.product_id),
      productName: text2(row.product_name),
      sku: text2(row.sku),
      quantity: Math.max(1, numberValue(row.quantity)),
      unitPriceAoa: nullableInt(row.unit_price_aoa),
      unitLabel: text2(row.unit_label) || "unidade",
      subtotalAoa: nullableInt(row.subtotal_aoa)
    });
    map.set(orderId, list);
  }
  return map;
}
async function getPublicStoreCatalog() {
  if (!isStoreConfigured()) {
    syncMemoryCounts();
    const activeCategoryIds = new Set(memoryCategories.filter((c) => c.isActive).map((c) => c.id));
    return {
      categories: memoryCategories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
      products: memoryProducts.filter((p) => p.isActive && activeCategoryIds.has(p.categoryId)).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    };
  }
  return query(async (db) => {
    const [categoryResult, productResult, galleryMap, orderCounts] = await Promise.all([
      db.execute(`${categorySelect} WHERE c.is_active = 1 GROUP BY c.id ORDER BY c.sort_order, c.name`),
      db.execute(`${productSelect} WHERE p.is_active = 1 AND c.is_active = 1 ORDER BY p.sort_order, p.name`),
      fetchGalleryImagesMap(db),
      fetchProductOrderCountsMap(db)
    ]);
    return {
      categories: categoryResult.rows.map((row) => mapCategory(row)),
      products: productResult.rows.map((row) => mapProduct(row, galleryMap, orderCounts))
    };
  });
}
async function getPublicProductBySlug(slug) {
  const catalog = await getPublicStoreCatalog();
  const product = catalog.products.find((item) => item.slug === slug);
  if (!product) return null;
  const sameCategory = catalog.products.filter(
    (item) => item.id !== product.id && item.categoryId === product.categoryId
  );
  const others = catalog.products.filter(
    (item) => item.id !== product.id && item.categoryId !== product.categoryId
  );
  const relatedProducts = [...sameCategory, ...others].slice(0, 3);
  return { product, relatedProducts };
}
async function getAdminStoreCatalog() {
  if (!isStoreConfigured()) {
    syncMemoryCounts();
    return {
      categories: [...memoryCategories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
      products: [...memoryProducts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name))
    };
  }
  return query(async (db) => {
    const [categoryResult, productResult, galleryMap, orderCounts] = await Promise.all([
      db.execute(`${categorySelect} GROUP BY c.id ORDER BY c.sort_order, c.name`),
      db.execute(`${productSelect} ORDER BY p.updated_at DESC, p.name`),
      fetchGalleryImagesMap(db),
      fetchProductOrderCountsMap(db)
    ]);
    return {
      categories: categoryResult.rows.map((row) => mapCategory(row)),
      products: productResult.rows.map((row) => mapProduct(row, galleryMap, orderCounts))
    };
  });
}
async function createCategory(input) {
  if (!isStoreConfigured()) {
    const timestamp2 = nowIso();
    const category2 = {
      id: randomUUID4(),
      name: input.name,
      slug: slugify(input.slug || input.name),
      description: input.description,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      productCount: 0,
      createdAt: timestamp2,
      updatedAt: timestamp2
    };
    memoryCategories.push(category2);
    return category2;
  }
  const id = randomUUID4();
  const slug = slugify(input.slug || input.name);
  await query(async (db) => db.execute({
    sql: `INSERT INTO store_categories (id, name, slug, description, is_active, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, input.name, slug, input.description, input.isActive ? 1 : 0, input.sortOrder]
  }));
  const result = await getAdminStoreCatalog();
  const category = result.categories.find((item) => item.id === id);
  if (!category) throw new Error("Category creation did not return a record");
  return category;
}
async function updateCategory(id, input) {
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
    args: [input.name, slugify(input.slug || input.name), input.description, input.isActive ? 1 : 0, input.sortOrder, id]
  }));
  if (result.rowsAffected === 0) return null;
  const catalog = await getAdminStoreCatalog();
  return catalog.categories.find((item) => item.id === id) ?? null;
}
async function deleteCategory(id) {
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
      args: [id]
    });
    if (numberValue(references.rows[0]?.count) > 0) {
      const error = new Error("Category is in use");
      Object.assign(error, { code: "SQLITE_CONSTRAINT_FOREIGNKEY" });
      throw error;
    }
    const result = await db.execute({
      sql: "DELETE FROM store_categories WHERE id = ?",
      args: [id]
    });
    return result.rowsAffected > 0;
  });
}
async function createProduct(input) {
  if (!isStoreConfigured()) {
    const category = memoryCategories.find((c) => c.id === input.categoryId);
    if (!category) throw new Error("Category not found");
    const timestamp2 = nowIso();
    const product2 = {
      id: randomUUID4(),
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
        id: randomUUID4(),
        imagePublicId: img.imagePublicId,
        imageUrl: cloudinaryImageUrl(img.imagePublicId),
        altText: img.altText,
        sortOrder: img.sortOrder ?? idx
      })),
      datasheetPublicId: input.datasheetPublicId,
      datasheetExternalUrl: input.datasheetExternalUrl,
      datasheetUrl: (input.datasheetPublicId ? cloudinaryDatasheetUrl(input.datasheetPublicId) : null) || (input.datasheetExternalUrl || null),
      orderCount: 0,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      createdAt: timestamp2,
      updatedAt: timestamp2
    };
    memoryProducts.push(product2);
    syncMemoryCounts();
    return product2;
  }
  const id = randomUUID4();
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
        input.sortOrder
      ]
    });
    for (let i = 0; i < input.galleryImages.length; i++) {
      const img = input.galleryImages[i];
      await db.execute({
        sql: `INSERT INTO store_product_images (id, product_id, image_public_id, alt_text, sort_order)
              VALUES (?, ?, ?, ?, ?)`,
        args: [randomUUID4(), id, img.imagePublicId, img.altText ?? "", img.sortOrder ?? i]
      });
    }
  });
  const catalog = await getAdminStoreCatalog();
  const product = catalog.products.find((item) => item.id === id);
  if (!product) throw new Error("Product creation did not return a record");
  return product;
}
async function updateProduct(id, input) {
  if (!isStoreConfigured()) {
    const product = memoryProducts.find((item) => item.id === id);
    if (!product) return null;
    const category = memoryCategories.find((c) => c.id === input.categoryId);
    if (!category) throw new Error("Category not found");
    const previousGalleryIds = product.galleryImages.map((g) => g.imagePublicId);
    const nextGalleryIds = new Set(input.galleryImages.map((g) => g.imagePublicId));
    const removedImagePublicIds = [
      ...product.imagePublicId && product.imagePublicId !== input.imagePublicId ? [product.imagePublicId] : [],
      ...previousGalleryIds.filter((pid) => !nextGalleryIds.has(pid) && pid !== input.imagePublicId)
    ];
    const previousDatasheetPublicId = product.datasheetPublicId && product.datasheetPublicId !== input.datasheetPublicId ? product.datasheetPublicId : null;
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
      id: randomUUID4(),
      imagePublicId: img.imagePublicId,
      imageUrl: cloudinaryImageUrl(img.imagePublicId),
      altText: img.altText,
      sortOrder: img.sortOrder ?? idx
    }));
    product.datasheetPublicId = input.datasheetPublicId;
    product.datasheetExternalUrl = input.datasheetExternalUrl;
    product.datasheetUrl = (input.datasheetPublicId ? cloudinaryDatasheetUrl(input.datasheetPublicId) : null) || (input.datasheetExternalUrl || null);
    product.isActive = input.isActive;
    product.sortOrder = input.sortOrder;
    product.updatedAt = nowIso();
    syncMemoryCounts();
    return { product, removedImagePublicIds, previousDatasheetPublicId };
  }
  return query(async (db) => {
    const currentRes = await db.execute({
      sql: "SELECT image_public_id, datasheet_public_id FROM store_products WHERE id = ?",
      args: [id]
    });
    if (!currentRes.rows[0]) return null;
    const currentRow = currentRes.rows[0];
    const previousPrimaryImage = nullableText(currentRow.image_public_id);
    const previousDatasheet = nullableText(currentRow.datasheet_public_id);
    const existingGalleryRes = await db.execute({
      sql: "SELECT image_public_id FROM store_product_images WHERE product_id = ?",
      args: [id]
    });
    const previousGalleryIds = existingGalleryRes.rows.map((r) => text2(r.image_public_id));
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
        id
      ]
    });
    await db.execute({ sql: "DELETE FROM store_product_images WHERE product_id = ?", args: [id] });
    for (let i = 0; i < input.galleryImages.length; i++) {
      const img = input.galleryImages[i];
      await db.execute({
        sql: `INSERT INTO store_product_images (id, product_id, image_public_id, alt_text, sort_order)
              VALUES (?, ?, ?, ?, ?)`,
        args: [randomUUID4(), id, img.imagePublicId, img.altText ?? "", img.sortOrder ?? i]
      });
    }
    const retainedIds = /* @__PURE__ */ new Set([
      ...input.imagePublicId ? [input.imagePublicId] : [],
      ...input.galleryImages.map((g) => g.imagePublicId)
    ]);
    const removedImagePublicIds = [
      ...previousPrimaryImage && !retainedIds.has(previousPrimaryImage) ? [previousPrimaryImage] : [],
      ...previousGalleryIds.filter((pid) => !retainedIds.has(pid))
    ];
    const previousDatasheetPublicId = previousDatasheet && previousDatasheet !== input.datasheetPublicId ? previousDatasheet : null;
    const catalog = await getAdminStoreCatalog();
    const product = catalog.products.find((item) => item.id === id);
    if (!product) throw new Error("Product update did not return a record");
    return { product, removedImagePublicIds, previousDatasheetPublicId };
  });
}
async function deleteProduct(id) {
  if (!isStoreConfigured()) {
    const idx = memoryProducts.findIndex((item) => item.id === id);
    if (idx === -1) return { deleted: false, imagePublicIds: [], datasheetPublicId: null };
    const [removed] = memoryProducts.splice(idx, 1);
    syncMemoryCounts();
    const imagePublicIds = [
      ...removed.imagePublicId ? [removed.imagePublicId] : [],
      ...removed.galleryImages.map((g) => g.imagePublicId)
    ];
    return { deleted: true, imagePublicIds, datasheetPublicId: removed.datasheetPublicId };
  }
  return query(async (db) => {
    const current = await db.execute({
      sql: "SELECT image_public_id, datasheet_public_id FROM store_products WHERE id = ?",
      args: [id]
    });
    if (!current.rows[0]) return { deleted: false, imagePublicIds: [], datasheetPublicId: null };
    const row = current.rows[0];
    const primaryImage = nullableText(row.image_public_id);
    const datasheetPublicId = nullableText(row.datasheet_public_id);
    const gallery = await db.execute({
      sql: "SELECT image_public_id FROM store_product_images WHERE product_id = ?",
      args: [id]
    });
    const imagePublicIds = [
      ...primaryImage ? [primaryImage] : [],
      ...gallery.rows.map((r) => text2(r.image_public_id))
    ];
    const result = await db.execute({ sql: "DELETE FROM store_products WHERE id = ?", args: [id] });
    return { deleted: result.rowsAffected > 0, imagePublicIds, datasheetPublicId };
  });
}
function upsertMemoryCustomer(input) {
  const normalizedPhone = normalizePhone(input.telephone);
  if (!normalizedPhone) return null;
  const existing = memoryCustomers.find((c) => c.normalizedPhone === normalizedPhone);
  const timestamp2 = nowIso();
  if (existing) {
    if (input.name && !existing.name) existing.name = input.name;
    if (input.address) existing.defaultAddress = input.address;
    if (input.city) existing.defaultCity = input.city;
    existing.telephone = input.telephone;
    existing.updatedAt = timestamp2;
    return existing.id;
  }
  const id = randomUUID4();
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
    createdAt: timestamp2,
    updatedAt: timestamp2
  });
  return id;
}
async function upsertDbCustomer(db, input) {
  const normalizedPhone = normalizePhone(input.telephone);
  if (!normalizedPhone) return null;
  const existing = await db.execute({
    sql: "SELECT id, name, default_address, default_city FROM store_customers WHERE normalized_phone = ?",
    args: [normalizedPhone]
  });
  if (existing.rows[0]) {
    const row = existing.rows[0];
    const customerId2 = text2(row.id);
    const nextName = text2(row.name) || input.name || "Cliente";
    const nextAddress = input.address || text2(row.default_address);
    const nextCity = input.city || text2(row.default_city);
    await db.execute({
      sql: `UPDATE store_customers
            SET name = ?, telephone = ?, default_address = ?, default_city = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [nextName, input.telephone, nextAddress, nextCity, customerId2]
    });
    return customerId2;
  }
  const customerId = randomUUID4();
  await db.execute({
    sql: `INSERT INTO store_customers (id, name, telephone, normalized_phone, default_address, default_city)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [customerId, input.name || "Cliente", input.telephone, normalizedPhone, input.address, input.city]
  });
  return customerId;
}
async function createPublicOrder(input) {
  const requestedRaw = input.items && input.items.length > 0 ? input.items : input.productId ? [{ productId: input.productId, quantity: input.quantity ?? 1 }] : [];
  const merged = /* @__PURE__ */ new Map();
  for (const entry of requestedRaw) {
    merged.set(entry.productId, Math.min(1e4, (merged.get(entry.productId) ?? 0) + entry.quantity));
  }
  const requestedItems = Array.from(merged.entries()).map(([productId, quantity]) => ({ productId, quantity }));
  if (requestedItems.length === 0) {
    throw new StoreError("Seleccione pelo menos um artigo para encomendar.", 400, "ORDER_EMPTY");
  }
  const id = randomUUID4();
  const reference = generateOrderReference();
  if (!isStoreConfigured()) {
    const resolvedItems = [];
    for (const reqItem of requestedItems) {
      const product = memoryProducts.find((item) => item.id === reqItem.productId && item.isActive);
      if (!product) {
        throw new StoreError("Um dos artigos seleccionados j\xE1 n\xE3o est\xE1 dispon\xEDvel no cat\xE1logo.", 404, "PRODUCT_NOT_FOUND");
      }
      if (product.stockMode === "stock" && product.stockQuantity <= 0) {
        throw new StoreError(`O artigo \u201C${product.name}\u201D encontra-se temporariamente esgotado.`, 409, "PRODUCT_OUT_OF_STOCK");
      }
      resolvedItems.push({
        id: randomUUID4(),
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: reqItem.quantity,
        unitPriceAoa: product.priceAoa,
        unitLabel: product.unitLabel,
        subtotalAoa: product.priceAoa !== null ? product.priceAoa * reqItem.quantity : null
      });
    }
    const summary = summarizeOrderItems(resolvedItems);
    const customerId = upsertMemoryCustomer({
      name: input.customerName,
      telephone: input.telephone,
      address: input.address,
      city: input.city
    });
    const timestamp2 = nowIso();
    const order = {
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
      createdAt: timestamp2,
      updatedAt: timestamp2
    };
    memoryOrders.unshift(order);
    syncMemoryCounts();
    return order;
  }
  return query(async (db) => {
    const resolvedItems = [];
    for (const reqItem of requestedItems) {
      const productRes = await db.execute({
        sql: `SELECT p.id, p.name, p.sku, p.price_aoa, p.unit_label, p.stock_mode, p.stock_quantity
              FROM store_products p
              JOIN store_categories c ON c.id = p.category_id
              WHERE p.id = ? AND p.is_active = 1 AND c.is_active = 1`,
        args: [reqItem.productId]
      });
      const productRow = productRes.rows[0];
      if (!productRow) {
        throw new StoreError("Um dos artigos seleccionados j\xE1 n\xE3o est\xE1 dispon\xEDvel no cat\xE1logo.", 404, "PRODUCT_NOT_FOUND");
      }
      const stockMode = text2(productRow.stock_mode);
      const stockQty = numberValue(productRow.stock_quantity);
      const pName = text2(productRow.name);
      if (stockMode === "stock" && stockQty <= 0) {
        throw new StoreError(`O artigo \u201C${pName}\u201D encontra-se temporariamente esgotado.`, 409, "PRODUCT_OUT_OF_STOCK");
      }
      const unitPriceAoa = nullableInt(productRow.price_aoa);
      resolvedItems.push({
        id: randomUUID4(),
        productId: text2(productRow.id),
        productName: pName,
        sku: text2(productRow.sku),
        quantity: reqItem.quantity,
        unitPriceAoa,
        unitLabel: text2(productRow.unit_label) || "unidade",
        subtotalAoa: unitPriceAoa !== null ? unitPriceAoa * reqItem.quantity : null
      });
    }
    const summary = summarizeOrderItems(resolvedItems);
    const customerId = await upsertDbCustomer(db, {
      name: input.customerName,
      telephone: input.telephone,
      address: input.address,
      city: input.city
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
        input.deliveryNotes
      ]
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
          item.subtotalAoa
        ]
      });
    }
    const [createdRes, itemsMap] = await Promise.all([
      db.execute({ sql: `${orderSelect} WHERE id = ?`, args: [id] }),
      fetchOrderItemsMap(db, [id])
    ]);
    return mapOrder(createdRes.rows[0], itemsMap);
  });
}
async function listAdminOrders() {
  if (!isStoreConfigured()) {
    return [...memoryOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return query(async (db) => {
    const [result, itemsMap] = await Promise.all([
      db.execute(`${orderSelect} ORDER BY created_at DESC`),
      fetchOrderItemsMap(db)
    ]);
    return result.rows.map((row) => mapOrder(row, itemsMap));
  });
}
async function applyDbStockDelta(db, items, direction) {
  for (const item of items) {
    if (!item.productId) continue;
    const pRes = await db.execute({
      sql: "SELECT stock_mode, stock_quantity FROM store_products WHERE id = ?",
      args: [item.productId]
    });
    const pRow = pRes.rows[0];
    if (!pRow || text2(pRow.stock_mode) !== "stock") continue;
    const current = Math.max(0, numberValue(pRow.stock_quantity));
    const nextQty = direction === "deduct" ? Math.max(0, current - item.quantity) : current + item.quantity;
    await db.execute({
      sql: "UPDATE store_products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [nextQty, item.productId]
    });
  }
}
function applyMemoryStockDelta(items, direction) {
  for (const item of items) {
    if (!item.productId) continue;
    const product = memoryProducts.find((p) => p.id === item.productId);
    if (!product || product.stockMode !== "stock") continue;
    product.stockQuantity = direction === "deduct" ? Math.max(0, product.stockQuantity - item.quantity) : product.stockQuantity + item.quantity;
    product.stockStatus = computeStockStatus(product.stockMode, product.stockQuantity, product.lowStockThreshold);
  }
}
async function createAdminOrder(input) {
  const id = randomUUID4();
  const reference = generateOrderReference();
  const rawItems = input.items && input.items.length > 0 ? input.items : [
    {
      productId: input.productId,
      productName: input.productName,
      quantity: input.quantity
    }
  ];
  const shouldDeduct = isCommittedStatus(input.status);
  if (!isStoreConfigured()) {
    const resolvedItems = rawItems.map((raw) => {
      const matched = raw.productId ? memoryProducts.find((p) => p.id === raw.productId) : void 0;
      const unitPrice = raw.unitPriceAoa !== void 0 ? raw.unitPriceAoa : matched?.priceAoa ?? null;
      return {
        id: randomUUID4(),
        productId: matched?.id ?? null,
        productName: matched?.name ?? raw.productName,
        sku: raw.sku || matched?.sku || "",
        quantity: raw.quantity,
        unitPriceAoa: unitPrice,
        unitLabel: raw.unitLabel || matched?.unitLabel || "unidade",
        subtotalAoa: unitPrice !== null ? unitPrice * raw.quantity : null
      };
    });
    const summary = summarizeOrderItems(resolvedItems);
    const customerId = input.customerId ?? upsertMemoryCustomer({
      name: input.customerName,
      telephone: input.telephone,
      address: input.address,
      city: input.city
    });
    if (shouldDeduct) {
      applyMemoryStockDelta(resolvedItems, "deduct");
    }
    const timestamp2 = nowIso();
    const order = {
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
      createdAt: timestamp2,
      updatedAt: timestamp2
    };
    memoryOrders.unshift(order);
    syncMemoryCounts();
    return order;
  }
  return query(async (db) => {
    const resolvedItems = [];
    for (const raw of rawItems) {
      let resolvedId = null;
      let resolvedName = raw.productName;
      let resolvedSku = raw.sku ?? "";
      let resolvedPrice = raw.unitPriceAoa ?? null;
      let resolvedUnit = raw.unitLabel || "unidade";
      if (raw.productId) {
        const pRes = await db.execute({
          sql: "SELECT id, name, sku, price_aoa, unit_label FROM store_products WHERE id = ?",
          args: [raw.productId]
        });
        const pRow = pRes.rows[0];
        if (pRow) {
          resolvedId = text2(pRow.id);
          resolvedName = text2(pRow.name);
          resolvedSku = resolvedSku || text2(pRow.sku);
          if (raw.unitPriceAoa === void 0) resolvedPrice = nullableInt(pRow.price_aoa);
          if (!raw.unitLabel) resolvedUnit = text2(pRow.unit_label) || "unidade";
        }
      }
      resolvedItems.push({
        id: randomUUID4(),
        productId: resolvedId,
        productName: resolvedName,
        sku: resolvedSku,
        quantity: raw.quantity,
        unitPriceAoa: resolvedPrice,
        unitLabel: resolvedUnit,
        subtotalAoa: resolvedPrice !== null ? resolvedPrice * raw.quantity : null
      });
    }
    const summary = summarizeOrderItems(resolvedItems);
    const customerId = input.customerId ?? await upsertDbCustomer(db, {
      name: input.customerName,
      telephone: input.telephone,
      address: input.address,
      city: input.city
    });
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
        input.adminNotes
      ]
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
          item.subtotalAoa
        ]
      });
    }
    if (shouldDeduct) {
      await applyDbStockDelta(db, resolvedItems, "deduct");
    }
    const [created, itemsMap] = await Promise.all([
      db.execute({ sql: `${orderSelect} WHERE id = ?`, args: [id] }),
      fetchOrderItemsMap(db, [id])
    ]);
    return mapOrder(created.rows[0], itemsMap);
  });
}
async function updateAdminOrder(id, input) {
  if (!isStoreConfigured()) {
    const order = memoryOrders.find((item) => item.id === id);
    if (!order) return null;
    const wasDeducted = order.stockDeducted;
    if (wasDeducted && (input.items !== void 0 || input.status !== void 0 && !isCommittedStatus(input.status))) {
      applyMemoryStockDelta(order.items, "restore");
      order.stockDeducted = false;
    }
    if (input.items && input.items.length > 0) {
      order.items = input.items.map((raw) => {
        const matched = raw.productId ? memoryProducts.find((p) => p.id === raw.productId) : void 0;
        const unitPrice = raw.unitPriceAoa !== void 0 ? raw.unitPriceAoa : matched?.priceAoa ?? null;
        return {
          id: randomUUID4(),
          productId: matched?.id ?? null,
          productName: matched?.name ?? raw.productName,
          sku: raw.sku || matched?.sku || "",
          quantity: raw.quantity,
          unitPriceAoa: unitPrice,
          unitLabel: raw.unitLabel || matched?.unitLabel || "unidade",
          subtotalAoa: unitPrice !== null ? unitPrice * raw.quantity : null
        };
      });
    } else if (input.productId !== void 0 || input.productName !== void 0 || input.quantity !== void 0) {
      const matched = input.productId ? memoryProducts.find((p) => p.id === input.productId) : null;
      const first = order.items[0] ?? {
        id: randomUUID4(),
        productId: order.productId,
        productName: order.productName,
        sku: "",
        quantity: order.quantity,
        unitPriceAoa: null,
        unitLabel: "unidade",
        subtotalAoa: null
      };
      if (input.productId !== void 0) {
        first.productId = matched?.id ?? null;
        if (matched) {
          first.productName = matched.name;
          first.sku = matched.sku;
          first.unitPriceAoa = matched.priceAoa;
          first.unitLabel = matched.unitLabel;
        }
      }
      if (input.productName !== void 0) first.productName = input.productName;
      if (input.quantity !== void 0) first.quantity = input.quantity;
      first.subtotalAoa = first.unitPriceAoa !== null ? first.unitPriceAoa * first.quantity : null;
      order.items = [first, ...order.items.slice(1)];
    }
    const summary = summarizeOrderItems(order.items);
    order.productId = order.items[0]?.productId ?? null;
    order.productName = summary.productName;
    order.quantity = summary.quantity;
    order.totalAoa = summary.totalAoa;
    order.hasConsultationItems = summary.hasConsultationItems;
    if (input.customerName !== void 0) order.customerName = input.customerName;
    if (input.telephone !== void 0) order.telephone = input.telephone;
    if (input.address !== void 0) order.address = input.address;
    if (input.city !== void 0) order.city = input.city;
    if (input.deliveryNotes !== void 0) order.deliveryNotes = input.deliveryNotes;
    if (input.status !== void 0) order.status = input.status;
    if (input.source !== void 0) order.source = input.source;
    if (input.adminNotes !== void 0) order.adminNotes = input.adminNotes;
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
      fetchOrderItemsMap(db, [id])
    ]);
    const row = existingRes.rows[0];
    if (!row) return null;
    const current = mapOrder(row, itemsMap);
    const nextStatus = input.status ?? current.status;
    let nextItems = current.items;
    let stockDeducted = current.stockDeducted;
    if (stockDeducted && (input.items !== void 0 || !isCommittedStatus(nextStatus))) {
      await applyDbStockDelta(db, current.items, "restore");
      stockDeducted = false;
    }
    if (input.items && input.items.length > 0) {
      nextItems = [];
      for (const raw of input.items) {
        let resolvedId = null;
        let resolvedName = raw.productName;
        let resolvedSku = raw.sku ?? "";
        let resolvedPrice = raw.unitPriceAoa ?? null;
        let resolvedUnit = raw.unitLabel || "unidade";
        if (raw.productId) {
          const pRes = await db.execute({
            sql: "SELECT id, name, sku, price_aoa, unit_label FROM store_products WHERE id = ?",
            args: [raw.productId]
          });
          const pRow = pRes.rows[0];
          if (pRow) {
            resolvedId = text2(pRow.id);
            resolvedName = text2(pRow.name);
            resolvedSku = resolvedSku || text2(pRow.sku);
            if (raw.unitPriceAoa === void 0) resolvedPrice = nullableInt(pRow.price_aoa);
            if (!raw.unitLabel) resolvedUnit = text2(pRow.unit_label) || "unidade";
          }
        }
        nextItems.push({
          id: randomUUID4(),
          productId: resolvedId,
          productName: resolvedName,
          sku: resolvedSku,
          quantity: raw.quantity,
          unitPriceAoa: resolvedPrice,
          unitLabel: resolvedUnit,
          subtotalAoa: resolvedPrice !== null ? resolvedPrice * raw.quantity : null
        });
      }
      await db.execute({ sql: "DELETE FROM store_order_items WHERE order_id = ?", args: [id] });
      for (const item of nextItems) {
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
            item.subtotalAoa
          ]
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
        id
      ]
    });
    const [updated, updatedItemsMap] = await Promise.all([
      db.execute({ sql: `${orderSelect} WHERE id = ?`, args: [id] }),
      fetchOrderItemsMap(db, [id])
    ]);
    return updated.rows[0] ? mapOrder(updated.rows[0], updatedItemsMap) : null;
  });
}
async function deleteAdminOrder(id) {
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
      fetchOrderItemsMap(db, [id])
    ]);
    if (existingRes.rows[0]) {
      const current = mapOrder(existingRes.rows[0], itemsMap);
      if (current.stockDeducted) {
        await applyDbStockDelta(db, current.items, "restore");
      }
    }
    const result = await db.execute({ sql: "DELETE FROM store_orders WHERE id = ?", args: [id] });
    return result.rowsAffected > 0;
  });
}
async function listAdminCustomers() {
  if (!isStoreConfigured()) {
    return memoryCustomers.map((c) => {
      const custOrders = memoryOrders.filter(
        (o) => o.customerId === c.id || normalizePhone(o.telephone) === c.normalizedPhone
      );
      const totalSpentAoa = custOrders.filter((o) => o.status !== "cancelado").reduce((sum, o) => sum + (o.totalAoa ?? 0), 0);
      const lastOrderAt = custOrders[0]?.createdAt ?? null;
      return {
        ...c,
        orderCount: custOrders.length,
        totalSpentAoa,
        lastOrderAt
      };
    }).sort((a, b) => b.orderCount - a.orderCount || b.updatedAt.localeCompare(a.updatedAt));
  }
  return query(async (db) => {
    const unlinked = await db.execute(
      "SELECT id, customer_name, telephone, address, city FROM store_orders WHERE customer_id IS NULL"
    );
    for (const raw of unlinked.rows) {
      const r = raw;
      const cid = await upsertDbCustomer(db, {
        name: text2(r.customer_name),
        telephone: text2(r.telephone),
        address: text2(r.address),
        city: text2(r.city)
      });
      if (cid) {
        await db.execute({
          sql: "UPDATE store_orders SET customer_id = ? WHERE id = ?",
          args: [cid, text2(r.id)]
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
    return res.rows.map((r) => mapCustomer(r));
  });
}
async function createAdminCustomer(input) {
  const normalizedPhone = normalizePhone(input.telephone);
  if (!normalizedPhone || normalizedPhone.length < 6) {
    throw new StoreError("Indique um n\xFAmero de telefone v\xE1lido.", 400, "INVALID_PHONE");
  }
  if (!isStoreConfigured()) {
    if (memoryCustomers.some((c) => c.normalizedPhone === normalizedPhone)) {
      throw new StoreError("J\xE1 existe um cliente registado com este telefone.", 409, "CUSTOMER_EXISTS");
    }
    const timestamp2 = nowIso();
    const customer = {
      id: randomUUID4(),
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
      createdAt: timestamp2,
      updatedAt: timestamp2
    };
    memoryCustomers.unshift(customer);
    return customer;
  }
  const id = randomUUID4();
  await query(async (db) => {
    await db.execute({
      sql: `INSERT INTO store_customers
              (id, name, telephone, normalized_phone, email, nif, default_address, default_city, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        input.name,
        input.telephone,
        normalizedPhone,
        input.email,
        input.nif,
        input.defaultAddress,
        input.defaultCity,
        input.notes
      ]
    });
  });
  const all = await listAdminCustomers();
  const created = all.find((c) => c.id === id);
  if (!created) throw new Error("Customer creation did not return a record");
  return created;
}
async function updateAdminCustomer(id, input) {
  if (!isStoreConfigured()) {
    const customer = memoryCustomers.find((c) => c.id === id);
    if (!customer) return null;
    if (input.name !== void 0) customer.name = input.name;
    if (input.telephone !== void 0) {
      const norm = normalizePhone(input.telephone);
      if (norm.length < 6) throw new StoreError("Indique um n\xFAmero de telefone v\xE1lido.", 400, "INVALID_PHONE");
      customer.telephone = input.telephone;
      customer.normalizedPhone = norm;
    }
    if (input.email !== void 0) customer.email = input.email;
    if (input.nif !== void 0) customer.nif = input.nif;
    if (input.defaultAddress !== void 0) customer.defaultAddress = input.defaultAddress;
    if (input.defaultCity !== void 0) customer.defaultCity = input.defaultCity;
    if (input.notes !== void 0) customer.notes = input.notes;
    customer.updatedAt = nowIso();
    const list = await listAdminCustomers();
    return list.find((c) => c.id === id) ?? customer;
  }
  return query(async (db) => {
    const existing = await db.execute({ sql: "SELECT * FROM store_customers WHERE id = ?", args: [id] });
    const row = existing.rows[0];
    if (!row) return null;
    const nextTel = input.telephone ?? text2(row.telephone);
    const nextNorm = normalizePhone(nextTel);
    await db.execute({
      sql: `UPDATE store_customers
            SET name = ?, telephone = ?, normalized_phone = ?, email = ?, nif = ?,
                default_address = ?, default_city = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        input.name ?? text2(row.name),
        nextTel,
        nextNorm,
        input.email ?? text2(row.email),
        input.nif ?? text2(row.nif),
        input.defaultAddress ?? text2(row.default_address),
        input.defaultCity ?? text2(row.default_city),
        input.notes ?? text2(row.notes),
        id
      ]
    });
    const list = await listAdminCustomers();
    return list.find((c) => c.id === id) ?? null;
  });
}
async function getAdminCustomerOrders(customerId) {
  const orders = await listAdminOrders();
  return orders.filter((o) => o.customerId === customerId);
}
async function getAdminStoreMetrics(period) {
  const [orders, catalog, customers] = await Promise.all([
    listAdminOrders(),
    getAdminStoreCatalog(),
    listAdminCustomers()
  ]);
  const now = Date.now();
  const cutoffMs = period === "7d" ? now - 7 * 24 * 60 * 60 * 1e3 : period === "30d" ? now - 30 * 24 * 60 * 60 * 1e3 : 0;
  const filteredOrders = orders.filter((order) => {
    if (cutoffMs === 0) return true;
    const t = new Date(order.createdAt).getTime();
    return Number.isNaN(t) || t >= cutoffMs;
  });
  const totalOrders = filteredOrders.length;
  const newOrders = filteredOrders.filter((o) => o.status === "novo").length;
  const confirmedOrDeliveredOrders = filteredOrders.filter(
    (o) => o.status === "confirmado" || o.status === "entregue"
  ).length;
  const deliveredOrders = filteredOrders.filter((o) => o.status === "entregue").length;
  const cancelledOrders = filteredOrders.filter((o) => o.status === "cancelado").length;
  const fulfillmentRatePercent = totalOrders > 0 ? Math.round(confirmedOrDeliveredOrders / totalOrders * 100) : 0;
  const activeOrders = filteredOrders.filter((o) => o.status !== "cancelado");
  const estimatedRevenueAoa = activeOrders.reduce((sum, o) => sum + (o.totalAoa ?? 0), 0);
  const totalUnitsOrdered = activeOrders.reduce((sum, o) => sum + o.quantity, 0);
  const lowStockCount = catalog.products.filter((p) => p.stockStatus === "stock_reduzido").length;
  const outOfStockCount = catalog.products.filter((p) => p.stockStatus === "esgotado").length;
  const dayBuckets = /* @__PURE__ */ new Map();
  const daysToShow = period === "7d" ? 7 : 14;
  for (let i = daysToShow - 1; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1e3);
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
    revenueAoa: info.revenueAoa
  }));
  const statusCounts = /* @__PURE__ */ new Map();
  const sourceCounts = /* @__PURE__ */ new Map();
  const cityCounts = /* @__PURE__ */ new Map();
  const productCounts = /* @__PURE__ */ new Map();
  for (const order of filteredOrders) {
    statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1);
    sourceCounts.set(order.source, (sourceCounts.get(order.source) ?? 0) + 1);
    const cityKey = order.city.trim() || "Sem cidade indicada";
    const cityEntry = cityCounts.get(cityKey) ?? { count: 0, revenueAoa: 0 };
    cityEntry.count += 1;
    if (order.status !== "cancelado") cityEntry.revenueAoa += order.totalAoa ?? 0;
    cityCounts.set(cityKey, cityEntry);
    if (order.status !== "cancelado") {
      const seenInOrder = /* @__PURE__ */ new Set();
      for (const item of order.items) {
        const key = item.productId || item.productName;
        const entry = productCounts.get(key) ?? {
          productName: item.productName,
          productId: item.productId,
          units: 0,
          orders: 0,
          revenueAoa: 0
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
    ordersByStatus: ["novo", "em_contacto", "confirmado", "entregue", "cancelado"].map(
      (status) => ({ status, count: statusCounts.get(status) ?? 0 })
    ),
    ordersBySource: ["loja_whatsapp", "whatsapp_direto", "admin"].map(
      (source) => ({ source, count: sourceCounts.get(source) ?? 0 })
    ),
    topCities: Array.from(cityCounts.entries()).map(([city, info]) => ({ city, count: info.count, revenueAoa: info.revenueAoa })).sort((a, b) => b.count - a.count).slice(0, 6),
    topProducts: Array.from(productCounts.values()).sort((a, b) => b.units - a.units || b.orders - a.orders).slice(0, 6)
  };
}

// server/storeSync.ts
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID as randomUUID5 } from "node:crypto";
var productSeedImageFiles = {
  "estacao-monitorizacao": "product_estacao_monitorizacao_1795612260086.jpg",
  "armadilha-monitorizacao": "product_armadilha_monitorizacao_1795612259680.jpg",
  "pulverizador-manual": "product_pulverizador_manual_1795612261116.jpg",
  "utensilio-limpeza": "product_utensilio_limpeza_1795612261651.jpg",
  "luvas-protecao": "product_luvas_protecao_1795612261099.jpg",
  "oculos-protecao": "product_oculos_protecao_1795612264528.jpg"
};
function resolveAssetsImagesDir() {
  const baseDir = typeof import.meta?.dirname === "string" ? path.resolve(import.meta.dirname, "..") : process.cwd();
  return path.resolve(baseDir, "client", "src", "assets", "images");
}
async function readLocalProductImage(slug) {
  const filename = productSeedImageFiles[slug];
  if (!filename) return null;
  const baseDir = resolveAssetsImagesDir();
  const resolved = path.resolve(baseDir, filename);
  if (!resolved.startsWith(baseDir + path.sep)) {
    throw new StoreError("Caminho de imagem inv\xE1lido.", 400, "INVALID_SEED_IMAGE_PATH");
  }
  try {
    return await fs.readFile(resolved);
  } catch {
    return null;
  }
}
function getCodeCatalogSummary() {
  return {
    categories: initialCategories.length,
    products: initialProducts.length,
    productsWithLocalImages: initialProducts.filter((p) => Boolean(productSeedImageFiles[p.slug])).length
  };
}
async function syncCodeCatalogToTursoAndCloudinary(options) {
  const overwriteImages = Boolean(options?.overwriteImages);
  const [turso, cloudinary2] = await Promise.all([
    verifyTursoHealth(),
    verifyCloudinaryHealth()
  ]);
  if (!turso.connected || !cloudinary2.connected) {
    throw new StoreError(
      "A sincroniza\xE7\xE3o requer que o Turso e a Cloudinary estejam 100% conectados e funcionais.",
      503,
      "SYNC_PREREQUISITES_NOT_MET"
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
  const categoryIdBySlug = /* @__PURE__ */ new Map();
  for (const category of initialCategories) {
    const existing = await db.execute({
      sql: "SELECT id FROM store_categories WHERE slug = ?",
      args: [category.slug]
    });
    if (existing.rows[0]) {
      const existingId = String(existing.rows[0].id);
      await db.execute({
        sql: `UPDATE store_categories
              SET name = ?, description = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [category.name, category.description, category.sortOrder, existingId]
      });
      categoryIdBySlug.set(category.slug, { id: existingId, name: category.name });
      categoriesUpdated += 1;
    } else {
      const newId = randomUUID5();
      await db.execute({
        sql: `INSERT INTO store_categories (id, name, slug, description, is_active, sort_order)
              VALUES (?, ?, ?, ?, 1, ?)`,
        args: [newId, category.name, category.slug, category.description, category.sortOrder]
      });
      categoryIdBySlug.set(category.slug, { id: newId, name: category.name });
      categoriesCreated += 1;
    }
  }
  const items = [];
  for (const product of initialProducts) {
    const categoryRef = categoryIdBySlug.get(product.category);
    if (!categoryRef) continue;
    const existing = await db.execute({
      sql: "SELECT id, image_public_id, sku, price_aoa, stock_quantity, specs_json FROM store_products WHERE slug = ?",
      args: [product.slug]
    });
    const existingRow = existing.rows[0];
    const existingPublicId = existingRow?.image_public_id && String(existingRow.image_public_id).startsWith("bioprev/products/") ? String(existingRow.image_public_id) : null;
    let finalPublicId = existingPublicId;
    let finalImageUrl = existingPublicId ? cloudinaryImageUrl(existingPublicId) : null;
    let imageStatus = existingPublicId ? "ja_ligada" : "sem_imagem_local";
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
      const hasPrice = existingRow.price_aoa !== null && existingRow.price_aoa !== void 0;
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
          existingId
        ]
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
        imageUrl: finalImageUrl
      });
    } else {
      const newProductId = randomUUID5();
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
          product.sortOrder
        ]
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
        imageUrl: finalImageUrl
      });
    }
  }
  await db.execute("INSERT OR IGNORE INTO store_setup_state (key) VALUES ('initial_catalog_v1')");
  return {
    syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
    categoriesCreated,
    categoriesUpdated,
    productsCreated,
    productsUpdated,
    imagesUploaded,
    imagesAlreadyLinked,
    items
  };
}

// server/storeRoutes.ts
var router = Router();
var uuidSchema = z2.string().uuid();
var slugSchema = z2.string().trim().min(1).max(140).regex(/^[a-z0-9-]+$/i);
var passcodeSetupSchema = z2.object({
  passcode: z2.string().trim().min(6, "A palavra-passe deve ter pelo menos 6 caracteres.").max(128)
});
var passcodeLoginSchema = z2.object({
  passcode: z2.string().trim().min(1, "Indique a palavra-passe.").max(128)
});
function sendError(res, error) {
  if (error instanceof StoreError) {
    return res.status(error.status).json({ message: error.message, code: error.code });
  }
  if (error instanceof z2.ZodError) {
    return res.status(400).json({ message: error.issues[0]?.message ?? "Os dados enviados n\xE3o s\xE3o v\xE1lidos.", code: "VALIDATION_ERROR" });
  }
  const errorCode = error?.code;
  if (typeof errorCode === "string" && errorCode.includes("CONSTRAINT")) {
    return res.status(409).json({ message: "J\xE1 existe um registo com estes dados ou a categoria ainda est\xE1 a ser utilizada.", code: "STORE_CONFLICT" });
  }
  return res.status(500).json({ message: "N\xE3o foi poss\xEDvel concluir esta opera\xE7\xE3o. Tente novamente.", code: "STORE_OPERATION_FAILED" });
}
async function run(res, action, status = 200) {
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
    return result ? res.json(result) : res.status(404).json({ message: "O artigo n\xE3o foi encontrado." });
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
      email: process.env.ADMIN_EMAIL?.trim() || "admin@bioprev.ao"
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
      email: process.env.ADMIN_EMAIL?.trim() || "admin@bioprev.ao"
    });
  } catch (error) {
    return sendError(res, error);
  }
});
router.get("/api/admin/access", requireStoreAdmin, (req, res) => {
  return res.json({ isAdmin: true, email: req.storeAdminEmail });
});
var syncPayloadSchema = z2.object({
  overwriteImages: z2.boolean().optional().default(false)
});
router.get("/api/admin/config", requireStoreAdmin, async (_req, res) => {
  const [turso, cloudinary2] = await Promise.all([
    verifyTursoHealth(),
    verifyCloudinaryHealth()
  ]);
  return res.json({
    tursoConfigured: turso.configured,
    tursoConnected: turso.connected,
    tursoLatencyMs: turso.latencyMs ?? null,
    tursoError: turso.error ?? null,
    cloudinaryConfigured: cloudinary2.configured,
    cloudinaryConnected: cloudinary2.connected,
    cloudinaryError: cloudinary2.error ?? null,
    syncReady: turso.connected && cloudinary2.connected,
    secretPasscodeConfigured: Boolean(process.env.ADMIN_PASSCODE?.trim() || process.env.ADMIN_PASSWORD?.trim()),
    authMode: "passcode",
    codeCatalogSummary: getCodeCatalogSummary()
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
  const period = rawPeriod === "7d" || rawPeriod === "30d" || rawPeriod === "all" ? rawPeriod : "30d";
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
    return category ? res.json(category) : res.status(404).json({ message: "A categoria n\xE3o foi encontrada." });
  } catch (error) {
    return sendError(res, error);
  }
});
router.delete("/api/admin/categories/:id", requireStoreAdmin, async (req, res) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const deleted = await deleteCategory(id);
    return deleted ? res.status(204).end() : res.status(404).json({ message: "A categoria n\xE3o foi encontrada." });
  } catch (error) {
    return sendError(res, error);
  }
});
router.post(
  "/api/admin/media",
  requireStoreAdmin,
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    limit: "5mb"
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
  }
);
router.delete("/api/admin/media", requireStoreAdmin, async (req, res) => {
  try {
    const publicId = z2.string().regex(/^bioprev\/products\/[A-Za-z0-9_-]+$/).parse(req.body?.publicId);
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
    limit: "10mb"
  }),
  async (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body)) {
        throw new StoreError("Envie um documento PDF v\xE1lido (m\xE1x. 10 MB).", 415, "INVALID_PDF_FORMAT");
      }
      const mimeType = req.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
      assertPdfUpload(req.body, mimeType);
      return res.status(201).json(await uploadProductDatasheet(req.body, mimeType));
    } catch (error) {
      return sendError(res, error);
    }
  }
);
router.delete("/api/admin/datasheet", requireStoreAdmin, async (req, res) => {
  try {
    const publicId = z2.string().regex(/^bioprev\/datasheets\/[A-Za-z0-9_.-]+$/).parse(req.body?.publicId);
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
    if (!result) return res.status(404).json({ message: "O artigo n\xE3o foi encontrado." });
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
    if (!result.deleted) return res.status(404).json({ message: "O artigo n\xE3o foi encontrado." });
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
    return updated ? res.json(updated) : res.status(404).json({ message: "O pedido n\xE3o foi encontrado." });
  } catch (error) {
    return sendError(res, error);
  }
});
router.delete("/api/admin/orders/:id", requireStoreAdmin, async (req, res) => {
  try {
    const id = uuidSchema.parse(req.params.id);
    const deleted = await deleteAdminOrder(id);
    return deleted ? res.status(204).end() : res.status(404).json({ message: "O pedido n\xE3o foi encontrado." });
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
    return updated ? res.json(updated) : res.status(404).json({ message: "O cliente n\xE3o foi encontrado." });
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
function registerStoreRoutes() {
  return router;
}

// server/routes.ts
async function registerRoutes(httpServer, app) {
  app.use(registerStoreRoutes());
  app.post("/api/newsletter", async (req, res) => {
    try {
      const emailSchema = insertNewsletterSchema.extend({
        email: z3.string().email("Email inv\xE1lido")
      });
      const data = emailSchema.parse(req.body);
      const existing = await storage.getNewsletterSubscriber(data.email);
      if (existing) {
        return res.json({ message: "Este email j\xE1 est\xE1 subscrito na nossa newsletter." });
      }
      await storage.subscribeNewsletter(data);
      return res.json({ message: "Subscri\xE7\xE3o realizada com sucesso! Obrigado por se juntar \xE0 nossa newsletter." });
    } catch (error) {
      if (error instanceof z3.ZodError) {
        return res.status(400).json({ message: "Por favor, insira um email v\xE1lido." });
      }
      return res.status(500).json({ message: "Erro ao processar a subscri\xE7\xE3o. Tente novamente." });
    }
  });
  return httpServer;
}

// server/app.ts
import { createServer } from "http";
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function createApp() {
  const app = express2();
  const httpServer = createServer(app);
  app.use(cors({ credentials: true, origin: true }));
  app.use(
    express2.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app.use(express2.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path2.startsWith("/api")) {
        let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse && !path2.startsWith("/api/admin")) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        log(logLine);
      }
    });
    next();
  });
  await registerRoutes(httpServer, app);
  app.use((err, _req, res, next) => {
    const errObj = err;
    const status = errObj?.status || errObj?.statusCode || 500;
    const message = errObj?.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
  return { app, httpServer };
}

// server/vercel.ts
var appPromise;
async function handler(req, res) {
  if (!appPromise) {
    appPromise = createApp();
  }
  const { app } = await appPromise;
  return app(req, res);
}
export {
  handler as default
};
