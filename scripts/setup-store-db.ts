import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
if (!url || !authToken) {
  console.error("Faltam TURSO_DATABASE_URL e TURSO_AUTH_TOKEN. Adicione-as nos Secrets do projecto antes de inicializar a loja.");
  process.exit(1);
}

const db = createClient({ url, authToken });

const categories = [
  { name: "Monitorização", slug: "monitorizacao", description: "Artigos de apoio à monitorização de espaços.", sortOrder: 10 },
  { name: "Limpeza", slug: "limpeza", description: "Equipamentos e utensílios para rotinas de limpeza.", sortOrder: 20 },
  { name: "Protecção", slug: "protecao", description: "Artigos de protecção individual e segurança.", sortOrder: 30 },
];

const products = [
  { name: "Estação de monitorização", slug: "estacao-monitorizacao", category: "monitorizacao", short: "Equipamento de apoio à observação e monitorização regular de espaços.", description: "Referência de equipamento para apoiar a observação de áreas e o acompanhamento de sinais de actividade.", sortOrder: 10 },
  { name: "Armadilha de monitorização", slug: "armadilha-monitorizacao", category: "monitorizacao", short: "Uma opção de referência para acompanhar sinais em espaços residenciais ou profissionais.", description: "As características adequadas dependem do espaço e da necessidade. Fale com a equipa para confirmar a opção disponível.", sortOrder: 20 },
  { name: "Pulverizador manual", slug: "pulverizador-manual", category: "limpeza", short: "Equipamento de apoio para tarefas de limpeza e manutenção do dia a dia.", description: "Artigo de referência. A equipa poderá esclarecer a disponibilidade e os detalhes do equipamento antes de qualquer pedido.", sortOrder: 30 },
  { name: "Utensílio de limpeza manual", slug: "utensilio-limpeza", category: "limpeza", short: "Uma referência para complementar as rotinas de limpeza em casa ou no local de trabalho.", description: "A escolha do utensílio depende da utilização pretendida. Consulte a equipa sobre as opções disponíveis.", sortOrder: 40 },
  { name: "Luvas de protecção", slug: "luvas-protecao", category: "protecao", short: "Artigo de protecção individual para tarefas de higiene e limpeza.", description: "Consulte a equipa para confirmar as opções disponíveis e verificar se correspondem à utilização pretendida.", sortOrder: 50 },
  { name: "Óculos de protecção", slug: "oculos-protecao", category: "protecao", short: "Artigo de protecção individual para actividades de limpeza e manutenção.", description: "As opções e características devem ser confirmadas com a equipa antes de avançar com o pedido.", sortOrder: 60 },
];

async function setup() {
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
      category_id TEXT NOT NULL REFERENCES store_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
      short_description TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image_public_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS store_products_category_idx ON store_products(category_id);
    CREATE INDEX IF NOT EXISTS store_products_active_order_idx ON store_products(is_active, sort_order);
    CREATE TABLE IF NOT EXISTS store_orders (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL UNIQUE,
      product_id TEXT REFERENCES store_products(id) ON UPDATE CASCADE ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
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

  const seedState = await db.execute("SELECT key FROM store_setup_state WHERE key = 'initial_catalog_v1'");
  if (seedState.rows.length === 0) {
    const categoryIds = new Map<string, string>();
    for (const category of categories) {
      const id = randomUUID();
      await db.execute({
        sql: `INSERT INTO store_categories (id, name, slug, description, sort_order)
              VALUES (?, ?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING`,
        args: [id, category.name, category.slug, category.description, category.sortOrder],
      });
      const stored = await db.execute({ sql: "SELECT id FROM store_categories WHERE slug = ?", args: [category.slug] });
      categoryIds.set(category.slug, String(stored.rows[0].id));
    }
    for (const product of products) {
      await db.execute({
        sql: `INSERT INTO store_products
                (id, name, slug, category_id, short_description, description, sort_order)
              VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING`,
        args: [
          randomUUID(), product.name, product.slug, categoryIds.get(product.category)!,
          product.short, product.description, product.sortOrder,
        ],
      });
    }
    await db.execute("INSERT INTO store_setup_state (key) VALUES ('initial_catalog_v1')");
  }

  await db.execute("SELECT 1");
  console.log("Base da loja inicializada. As categorias e os artigos de referência foram adicionados apenas na primeira execução.");
}

setup()
  .catch(() => {
    console.error("A inicialização da base da loja falhou. Confirme as credenciais e o acesso de escrita do Turso e tente novamente.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
