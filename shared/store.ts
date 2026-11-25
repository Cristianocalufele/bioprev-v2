import { z } from "zod";

export const stockModes = ["stock", "por_encomenda"] as const;
export type ProductStockMode = (typeof stockModes)[number];
export type ProductStockStatus = "em_stock" | "stock_reduzido" | "por_encomenda" | "esgotado";

export const productSpecSchema = z.object({
  label: z.string().trim().min(1, "Indique o nome da especificação.").max(80),
  value: z.string().trim().min(1, "Indique o valor da especificação.").max(160),
});

export type ProductSpecItem = z.infer<typeof productSpecSchema>;

export const productGalleryImageInputSchema = z.object({
  imagePublicId: z
    .string()
    .trim()
    .regex(/^bioprev\/products\/[A-Za-z0-9_-]+$/, "A imagem da galeria não é válida."),
  altText: z.string().trim().max(160).optional().default(""),
  sortOrder: z.number().int().min(0).max(1000).optional().default(0),
});

export type StoreProductImage = {
  id: string;
  imagePublicId: string;
  imageUrl: string | null;
  altText: string;
  sortOrder: number;
};

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, "Indique um nome de categoria.").max(80),
  slug: z.string().trim().max(100).optional().default(""),
  description: z.string().trim().max(300).optional().default(""),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10000).default(0),
});

const safeDatasheetUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (val) => val === "" || /^https:\/\/.+/i.test(val),
    "O link da ficha técnica deve começar por https://.",
  );

export const productInputSchema = z.object({
  name: z.string().trim().min(2, "Indique o nome do artigo.").max(120),
  slug: z.string().trim().max(140).optional().default(""),
  sku: z.string().trim().max(40).optional().default(""),
  categoryId: z.string().uuid("Seleccione uma categoria válida."),
  shortDescription: z.string().trim().min(5, "Escreva uma descrição curta.").max(220),
  description: z.string().trim().max(3000).optional().default(""),
  priceAoa: z.number().int().min(0).max(1_000_000_000).nullable().optional().default(null),
  unitLabel: z.string().trim().min(1).max(40).optional().default("unidade"),
  stockQuantity: z.number().int().min(0).max(1_000_000).optional().default(0),
  lowStockThreshold: z.number().int().min(0).max(100_000).optional().default(5),
  stockMode: z.enum(stockModes).optional().default("por_encomenda"),
  isFeatured: z.boolean().optional().default(false),
  specs: z.array(productSpecSchema).max(20).optional().default([]),
  imagePublicId: z
    .string()
    .trim()
    .regex(/^bioprev\/products\/[A-Za-z0-9_-]+$/, "A imagem não é válida.")
    .nullable()
    .optional()
    .default(null),
  galleryImages: z.array(productGalleryImageInputSchema).max(10).optional().default([]),
  datasheetPublicId: z
    .string()
    .trim()
    .regex(/^bioprev\/datasheets\/[A-Za-z0-9_.-]+$/, "O ficheiro da ficha técnica não é válido.")
    .nullable()
    .optional()
    .default(null),
  datasheetExternalUrl: safeDatasheetUrlSchema.optional().default(""),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10000).default(0),
});

export const orderStatuses = [
  "novo",
  "em_contacto",
  "confirmado",
  "entregue",
  "cancelado",
] as const;

export const orderSources = [
  "loja_whatsapp",
  "whatsapp_direto",
  "admin",
] as const;

export type StoreOrderStatus = (typeof orderStatuses)[number];
export type StoreOrderSource = (typeof orderSources)[number];

export const publicOrderItemInputSchema = z.object({
  productId: z.string().uuid("Artigo inválido."),
  quantity: z.number().int().min(1, "A quantidade mínima é 1.").max(10000),
});

export const publicOrderInputSchema = z
  .object({
    items: z.array(publicOrderItemInputSchema).min(1, "Adicione pelo menos um artigo.").max(50).optional(),
    productId: z.string().uuid("Artigo inválido.").optional(),
    quantity: z.number().int().min(1, "A quantidade mínima é 1.").max(10000).optional(),
    customerName: z.string().trim().max(120).optional().default(""),
    telephone: z.string().trim().min(6, "Indique um número de telefone válido.").max(40),
    address: z.string().trim().min(8, "Indique a morada completa de entrega.").max(500),
    city: z.string().trim().max(100).optional().default(""),
    deliveryNotes: z.string().trim().max(500).optional().default(""),
  })
  .refine(
    (data) => (data.items && data.items.length > 0) || Boolean(data.productId),
    "Seleccione pelo menos um artigo para encomendar.",
  );

export const adminOrderItemInputSchema = z.object({
  productId: z.string().uuid().nullable().optional().default(null),
  productName: z.string().trim().min(2, "Indique o nome do artigo.").max(160),
  sku: z.string().trim().max(40).optional().default(""),
  quantity: z.number().int().min(1, "A quantidade mínima é 1.").max(10000),
  unitPriceAoa: z.number().int().min(0).max(1_000_000_000).nullable().optional().default(null),
  unitLabel: z.string().trim().max(40).optional().default("unidade"),
});

export const adminOrderInputSchema = z
  .object({
    items: z.array(adminOrderItemInputSchema).min(1).max(50).optional(),
    productId: z.string().uuid().nullable().optional().default(null),
    productName: z.string().trim().max(160).optional().default(""),
    quantity: z.number().int().min(1).max(10000).optional().default(1),
    customerId: z.string().uuid().nullable().optional().default(null),
    customerName: z.string().trim().max(120).optional().default(""),
    telephone: z.string().trim().min(6, "Indique um número de telefone válido.").max(40),
    address: z.string().trim().min(4, "Indique a morada de entrega.").max(500),
    city: z.string().trim().max(100).optional().default(""),
    deliveryNotes: z.string().trim().max(500).optional().default(""),
    status: z.enum(orderStatuses).default("novo"),
    source: z.enum(orderSources).default("whatsapp_direto"),
    adminNotes: z.string().trim().max(1000).optional().default(""),
  })
  .refine(
    (data) => (data.items && data.items.length > 0) || data.productName.trim().length >= 2,
    "Indique pelo menos um artigo para o pedido.",
  );

export const adminOrderUpdateSchema = z.object({
  items: z.array(adminOrderItemInputSchema).min(1).max(50).optional(),
  productId: z.string().uuid().nullable().optional(),
  productName: z.string().trim().min(2).max(160).optional(),
  quantity: z.number().int().min(1).max(10000).optional(),
  customerId: z.string().uuid().nullable().optional(),
  customerName: z.string().trim().max(120).optional(),
  telephone: z.string().trim().min(6).max(40).optional(),
  address: z.string().trim().min(4).max(500).optional(),
  city: z.string().trim().max(100).optional(),
  deliveryNotes: z.string().trim().max(500).optional(),
  status: z.enum(orderStatuses).optional(),
  source: z.enum(orderSources).optional(),
  adminNotes: z.string().trim().max(1000).optional(),
});

export const customerInputSchema = z.object({
  name: z.string().trim().min(2, "Indique o nome do cliente ou empresa.").max(120),
  telephone: z.string().trim().min(6, "Indique um telefone válido.").max(40),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Indique um e-mail válido.")
    .optional()
    .default(""),
  nif: z.string().trim().max(40).optional().default(""),
  defaultAddress: z.string().trim().max(500).optional().default(""),
  defaultCity: z.string().trim().max(100).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

export const customerUpdateSchema = customerInputSchema.partial();

export const categoryPayloadSchema = categoryInputSchema;
export const productPayloadSchema = productInputSchema;

export type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  shortDescription: string;
  description: string;
  priceAoa: number | null;
  unitLabel: string;
  stockQuantity: number;
  lowStockThreshold: number;
  stockMode: ProductStockMode;
  stockStatus: ProductStockStatus;
  isFeatured: boolean;
  specs: ProductSpecItem[];
  imagePublicId: string | null;
  imageUrl: string | null;
  galleryImages: StoreProductImage[];
  datasheetPublicId: string | null;
  datasheetExternalUrl: string;
  datasheetUrl: string | null;
  orderCount: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type StoreOrderItem = {
  id: string;
  productId: string | null;
  productName: string;
  sku: string;
  quantity: number;
  unitPriceAoa: number | null;
  unitLabel: string;
  subtotalAoa: number | null;
};

export type StoreOrder = {
  id: string;
  reference: string;
  customerId: string | null;
  productId: string | null;
  productName: string;
  quantity: number;
  items: StoreOrderItem[];
  totalAoa: number | null;
  hasConsultationItems: boolean;
  stockDeducted: boolean;
  customerName: string;
  telephone: string;
  address: string;
  city: string;
  deliveryNotes: string;
  status: StoreOrderStatus;
  source: StoreOrderSource;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
};

export type StoreCustomer = {
  id: string;
  name: string;
  telephone: string;
  normalizedPhone: string;
  email: string;
  nif: string;
  defaultAddress: string;
  defaultCity: string;
  notes: string;
  orderCount: number;
  totalSpentAoa: number;
  lastOrderAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StoreCatalog = {
  categories: StoreCategory[];
  products: StoreProduct[];
};

export type StoreMetricsPeriod = "7d" | "30d" | "all";

export type StoreMetrics = {
  period: StoreMetricsPeriod;
  totalOrders: number;
  newOrders: number;
  confirmedOrDeliveredOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  fulfillmentRatePercent: number;
  estimatedRevenueAoa: number;
  totalUnitsOrdered: number;
  uniqueCustomers: number;
  lowStockCount: number;
  outOfStockCount: number;
  ordersByDay: Array<{ date: string; label: string; count: number; revenueAoa: number }>;
  ordersByStatus: Array<{ status: StoreOrderStatus; count: number }>;
  ordersBySource: Array<{ source: StoreOrderSource; count: number }>;
  topCities: Array<{ city: string; count: number; revenueAoa: number }>;
  topProducts: Array<{ productName: string; productId: string | null; units: number; orders: number; revenueAoa: number }>;
};
