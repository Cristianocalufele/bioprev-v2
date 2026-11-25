import { z } from "zod";

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, "Indique um nome de categoria.").max(80),
  slug: z.string().trim().max(100).optional().default(""),
  description: z.string().trim().max(300).optional().default(""),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10000).default(0),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(2, "Indique o nome do artigo.").max(120),
  slug: z.string().trim().max(140).optional().default(""),
  categoryId: z.string().uuid("Seleccione uma categoria válida."),
  shortDescription: z.string().trim().min(5, "Escreva uma descrição curta.").max(220),
  description: z.string().trim().max(3000).optional().default(""),
  imagePublicId: z
    .string()
    .trim()
    .regex(/^bioprev\/products\/[A-Za-z0-9_-]+$/, "A imagem não é válida.")
    .nullable()
    .optional()
    .default(null),
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

export const publicOrderInputSchema = z.object({
  productId: z.string().uuid("Artigo inválido."),
  quantity: z.number().int().min(1, "A quantidade mínima é 1.").max(10000),
  customerName: z.string().trim().max(120).optional().default(""),
  telephone: z.string().trim().min(6, "Indique um número de telefone válido.").max(40),
  address: z.string().trim().min(8, "Indique a morada completa de entrega.").max(500),
  city: z.string().trim().max(100).optional().default(""),
  deliveryNotes: z.string().trim().max(500).optional().default(""),
});

export const adminOrderInputSchema = z.object({
  productId: z.string().uuid().nullable().optional().default(null),
  productName: z.string().trim().min(2, "Indique o nome do artigo.").max(160),
  quantity: z.number().int().min(1, "A quantidade mínima é 1.").max(10000),
  customerName: z.string().trim().max(120).optional().default(""),
  telephone: z.string().trim().min(6, "Indique um número de telefone válido.").max(40),
  address: z.string().trim().min(4, "Indique a morada de entrega.").max(500),
  city: z.string().trim().max(100).optional().default(""),
  deliveryNotes: z.string().trim().max(500).optional().default(""),
  status: z.enum(orderStatuses).default("novo"),
  source: z.enum(orderSources).default("whatsapp_direto"),
  adminNotes: z.string().trim().max(1000).optional().default(""),
});

export const adminOrderUpdateSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  productName: z.string().trim().min(2).max(160).optional(),
  quantity: z.number().int().min(1).max(10000).optional(),
  customerName: z.string().trim().max(120).optional(),
  telephone: z.string().trim().min(6).max(40).optional(),
  address: z.string().trim().min(4).max(500).optional(),
  city: z.string().trim().max(100).optional(),
  deliveryNotes: z.string().trim().max(500).optional(),
  status: z.enum(orderStatuses).optional(),
  source: z.enum(orderSources).optional(),
  adminNotes: z.string().trim().max(1000).optional(),
});

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
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  shortDescription: string;
  description: string;
  imagePublicId: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type StoreOrder = {
  id: string;
  reference: string;
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
  createdAt: string;
  updatedAt: string;
};

export type StoreCatalog = {
  categories: StoreCategory[];
  products: StoreProduct[];
};
