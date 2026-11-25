import type { ProductStockStatus, StoreOrder, StoreProduct } from "@shared/store";

export function formatKwanza(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Sob consulta";
  }
  const formatted = new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
  return `${formatted} Kz`;
}

export function stockStatusInfo(product: Pick<StoreProduct, "stockStatus" | "stockQuantity">): {
  status: ProductStockStatus;
  label: string;
  shortLabel: string;
  textClass: string;
  canOrder: boolean;
} {
  switch (product.stockStatus) {
    case "em_stock":
      return {
        status: "em_stock",
        label: `Em stock (${product.stockQuantity} disp.)`,
        shortLabel: "Em stock",
        textClass: "text-[#276445]",
        canOrder: true,
      };
    case "stock_reduzido":
      return {
        status: "stock_reduzido",
        label: `Últimas ${product.stockQuantity} unid.`,
        shortLabel: `Últimas ${product.stockQuantity}`,
        textClass: "text-[#8a6500]",
        canOrder: true,
      };
    case "esgotado":
      return {
        status: "esgotado",
        label: "Temporariamente esgotado",
        shortLabel: "Esgotado",
        textClass: "text-[#914533]",
        canOrder: false,
      };
    case "por_encomenda":
    default:
      return {
        status: "por_encomenda",
        label: "Por encomenda",
        shortLabel: "Por encomenda",
        textClass: "text-[#007cc3]",
        canOrder: true,
      };
  }
}

export function buildOrderWhatsAppUrl(order: StoreOrder): string {
  const itemLines = order.items.map((item, idx) => {
    const skuPart = item.sku ? ` [${item.sku}]` : "";
    const pricePart =
      item.subtotalAoa !== null
        ? ` — ${formatKwanza(item.subtotalAoa)}`
        : " — Sob consulta";
    return `${idx + 1}. ${item.productName}${skuPart} × ${item.quantity} (${item.unitLabel})${pricePart}`;
  });

  const totalLine =
    order.totalAoa !== null
      ? order.hasConsultationItems
        ? `Total parcial (itens com preço): ${formatKwanza(order.totalAoa)} (+ itens sob consulta)`
        : `Total estimado: ${formatKwanza(order.totalAoa)}`
      : "Valor: Sob consulta";

  const message = [
    "Olá, Bioprev. Gostaria de confirmar este pedido:",
    "",
    `Referência: ${order.reference}`,
    "",
    "Artigos:",
    ...itemLines,
    "",
    totalLine,
    order.customerName ? `Nome / Empresa: ${order.customerName}` : "",
    `Telefone para contacto: ${order.telephone}`,
    `Morada de entrega: ${order.address}`,
    order.city ? `Cidade: ${order.city}` : "",
    order.deliveryNotes ? `Notas de entrega: ${order.deliveryNotes}` : "",
    "",
    "Por favor, confirmem a disponibilidade e as condições de entrega.",
  ]
    .filter((line) => line !== undefined && line !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  return `https://wa.me/244928737888?text=${encodeURIComponent(message)}`;
}
