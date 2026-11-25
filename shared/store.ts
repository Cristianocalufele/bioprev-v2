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

export type StoreCatalog = {
  categories: StoreCategory[];
  products: StoreProduct[];
};
