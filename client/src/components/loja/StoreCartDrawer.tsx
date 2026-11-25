import { useMemo, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  LoaderCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { StoreOrder, StoreProduct } from "@shared/store";
import { submitStoreOrder } from "@/lib/storeApi";
import { useStoreCart } from "@/lib/storeCart";
import { buildOrderWhatsAppUrl, formatKwanza } from "@/lib/storeFormat";
import { ProductVisual } from "./ProductVisual";

const inputClassName =
  "mt-1.5 min-h-11 w-full border border-[#c8d2da] bg-white px-3.5 py-2.5 text-sm text-[#001d3d] outline-none transition-colors placeholder:text-[#8a969e] focus:border-[#007cc3] focus:ring-2 focus:ring-[#007cc3]/15";

export function StoreCartDrawer({ catalogProducts = [] }: { catalogProducts?: StoreProduct[] }) {
  const queryClient = useQueryClient();
  const whatsappLinkRef = useRef<HTMLAnchorElement | null>(null);
  const { items, totalItems, drawerOpen, setDrawerOpen, setItemQuantity, removeItem, clearCart } =
    useStoreCart();

  const [customerName, setCustomerName] = useState("");
  const [telephone, setTelephone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState<{ order: StoreOrder; whatsappUrl: string } | null>(
    null,
  );

  // Merge live catalog prices/images when catalogProducts is loaded
  const hydratedItems = useMemo(() => {
    const byId = new Map(catalogProducts.map((p) => [p.id, p]));
    return items.map((entry) => {
      const live = byId.get(entry.productId);
      const snap = live ?? entry.productSnapshot;
      const unitPrice = snap.priceAoa;
      return {
        ...entry,
        liveProduct: snap,
        subtotalAoa: unitPrice !== null ? unitPrice * entry.quantity : null,
      };
    });
  }, [catalogProducts, items]);

  const cartSummary = useMemo(() => {
    let pricedTotal = 0;
    let hasPriced = false;
    let hasConsultation = false;
    for (const item of hydratedItems) {
      if (item.subtotalAoa !== null) {
        pricedTotal += item.subtotalAoa;
        hasPriced = true;
      } else {
        hasConsultation = true;
      }
    }
    return { pricedTotal, hasPriced, hasConsultation };
  }, [hydratedItems]);

  const handleCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (hydratedItems.length === 0 || submitting) return;

    setSubmitting(true);
    setOrderError("");
    try {
      const { order } = await submitStoreOrder({
        items: hydratedItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        customerName: customerName.trim(),
        telephone: telephone.trim(),
        address: address.trim(),
        city: city.trim(),
        deliveryNotes: deliveryNotes.trim(),
      });

      const whatsappUrl = buildOrderWhatsAppUrl(order);
      setSubmittedOrder({ order, whatsappUrl });
      clearCart();
      void queryClient.invalidateQueries({ queryKey: ["store-admin", "orders"] });
      void queryClient.invalidateQueries({ queryKey: ["store", "catalog"] });

      setTimeout(() => {
        whatsappLinkRef.current?.click();
      }, 60);
    } catch (error) {
      setOrderError(
        error instanceof Error
          ? error.message
          : "Não foi possível registar o pedido. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={drawerOpen}
      onOpenChange={(open) => {
        setDrawerOpen(open);
        if (!open) {
          setOrderError("");
        }
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full max-w-[540px] flex-col overflow-y-auto border-l border-[#dce4e9] bg-white p-0 sm:max-w-[540px]"
        aria-describedby="cart-drawer-description"
      >
        <div className="border-t-4 border-t-[#f2c92f] border-b border-[#e5ebee] bg-[#f8fafb] px-5 py-5 sm:px-7">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#007cc3]">
            <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
            Carrinho de encomenda
          </div>
          <SheetHeader className="space-y-1 text-left">
            <SheetTitle className="text-xl font-semibold text-[#001d3d]">
              {submittedOrder
                ? "Pedido registado com sucesso"
                : totalItems > 0
                  ? `${totalItems} ${totalItems === 1 ? "unidade seleccionada" : "unidades seleccionadas"}`
                  : "O seu carrinho está vazio"}
            </SheetTitle>
            <SheetDescription id="cart-drawer-description" className="text-xs leading-5 text-[#5c6c76]">
              {submittedOrder
                ? "A sua referência foi criada automaticamente e está pronta para confirmar no WhatsApp."
                : "Junte vários equipamentos e envie um único pedido consolidado para a equipa Bioprev."}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 px-5 py-6 sm:px-7">
          {submittedOrder ? (
            <div className="space-y-5 border border-[#cce4d7] border-t-4 border-t-[#276445] bg-[#f1f8f4] p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#276445]" aria-hidden="true" />
                <div>
                  <h3 className="text-lg font-semibold text-[#001d3d]">Referência criada</h3>
                  <p className="mt-1 text-sm leading-6 text-[#344754]">
                    Pedido registado com o código{" "}
                    <strong className="font-mono font-bold text-[#001d3d]">
                      {submittedOrder.order.reference}
                    </strong>
                    .
                  </p>
                </div>
              </div>

              <div className="space-y-2 border-t border-[#d6e9df] pt-4 text-sm text-[#344754]">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#276445]">
                  Artigos incluídos
                </p>
                <ul className="space-y-1.5 text-sm">
                  {submittedOrder.order.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2 tabular-nums">
                      <span>
                        {item.productName} <strong className="text-[#001d3d]">× {item.quantity}</strong>
                      </span>
                      <span className="font-semibold text-[#001d3d]">
                        {formatKwanza(item.subtotalAoa)}
                      </span>
                    </li>
                  ))}
                </ul>
                {submittedOrder.order.totalAoa !== null && (
                  <p className="flex items-center justify-between border-t border-[#d6e9df] pt-2 font-semibold text-[#001d3d] tabular-nums">
                    <span>
                      {submittedOrder.order.hasConsultationItems ? "Total parcial" : "Total estimado"}
                    </span>
                    <span>{formatKwanza(submittedOrder.order.totalAoa)}</span>
                  </p>
                )}
              </div>

              <a
                ref={whatsappLinkRef}
                href={submittedOrder.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 w-full items-center justify-center gap-2 bg-[#007cc3] px-5 text-sm font-bold text-white transition-colors hover:bg-[#006aa8]"
              >
                Confirmar pedido no WhatsApp
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => {
                  setSubmittedOrder(null);
                  setDrawerOpen(false);
                }}
                className="flex min-h-11 w-full items-center justify-center border border-[#cbd6dc] bg-white px-4 text-sm font-semibold text-[#344754] transition-colors hover:border-[#007cc3] hover:text-[#007cc3]"
              >
                Continuar a explorar o catálogo
              </button>
            </div>
          ) : hydratedItems.length === 0 ? (
            <div className="border border-[#dfe7eb] bg-[#f8fafb] px-5 py-12 text-center">
              <ShoppingBag className="mx-auto h-9 w-9 text-[#8a9aa4]" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold text-[#001d3d]">Ainda sem artigos no carrinho</h3>
              <p className="mt-1.5 text-sm leading-6 text-[#61707a]">
                Adicione equipamentos a partir do catálogo ou da ficha de cada artigo para gerar um pedido único.
              </p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="mt-5 border border-[#007cc3] bg-[#007cc3] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#006aa8]"
              >
                Explorar catálogo
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="divide-y divide-[#e8edef] border border-[#dce4e9] bg-white">
                {hydratedItems.map(({ productId, quantity, liveProduct, subtotalAoa }) => (
                  <div key={productId} className="flex gap-3.5 p-3.5">
                    <div className="aspect-[4/3] w-20 shrink-0 overflow-hidden border border-[#e5ebee] bg-[#f4f7f9]">
                      <ProductVisual product={liveProduct} alt={liveProduct.name} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#001d3d]">{liveProduct.name}</p>
                          <p className="mt-0.5 text-xs text-[#64737d] tabular-nums">
                            {formatKwanza(liveProduct.priceAoa)}
                            {liveProduct.priceAoa !== null ? ` / ${liveProduct.unitLabel}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(productId)}
                          aria-label={`Remover ${liveProduct.name} do carrinho`}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#914533] hover:bg-[#fff7f5]"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-3">
                        <div className="inline-flex items-stretch border border-[#c8d2da]">
                          <button
                            type="button"
                            onClick={() =>
                              quantity <= 1 ? removeItem(productId) : setItemQuantity(productId, quantity - 1)
                            }
                            aria-label={`Diminuir quantidade de ${liveProduct.name}`}
                            className="flex h-8 w-8 items-center justify-center bg-[#f8fafb] text-[#001d3d] hover:bg-[#edf3f7]"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="flex h-8 min-w-10 items-center justify-center border-x border-[#c8d2da] px-2 text-xs font-semibold tabular-nums text-[#001d3d]">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setItemQuantity(productId, quantity + 1)}
                            aria-label={`Aumentar quantidade de ${liveProduct.name}`}
                            className="flex h-8 w-8 items-center justify-center bg-[#f8fafb] text-[#001d3d] hover:bg-[#edf3f7]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <span className="text-sm font-bold tabular-nums text-[#001d3d]">
                          {formatKwanza(subtotalAoa)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border border-[#dce4e9] bg-[#f8fafb] px-4 py-3.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#5c6c76]">
                    {cartSummary.hasPriced
                      ? cartSummary.hasConsultation
                        ? "Subtotal (artigos com preço)"
                        : "Total estimado"
                      : "Orçamento"}
                  </span>
                  <span className="text-base font-bold tabular-nums text-[#001d3d]">
                    {cartSummary.hasPriced ? formatKwanza(cartSummary.pricedTotal) : "Sob consulta"}
                  </span>
                </div>
                {cartSummary.hasConsultation && cartSummary.hasPriced && (
                  <p className="mt-1 text-xs text-[#64737d]">
                    Inclui artigos sob consulta; o valor final será confirmado no WhatsApp.
                  </p>
                )}
              </div>

              <form onSubmit={handleCheckout} className="space-y-4 border-t border-[#e5ebee] pt-5">
                <div>
                  <h3 className="text-base font-semibold text-[#001d3d]">Dados de entrega e contacto</h3>
                  <p className="mt-0.5 text-xs text-[#64737d]">
                    O pedido fica registado e abre o WhatsApp com todos os artigos incluídos.
                  </p>
                </div>

                <div>
                  <label htmlFor="cart-customer-name" className="text-xs font-semibold text-[#263b49]">
                    Nome ou empresa (opcional)
                  </label>
                  <input
                    id="cart-customer-name"
                    type="text"
                    autoComplete="name"
                    maxLength={120}
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Ex.: Maria Silva ou Empresa Lda."
                    className={inputClassName}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cart-telephone" className="text-xs font-semibold text-[#263b49]">
                      Telefone <span className="text-[#007cc3]">*</span>
                    </label>
                    <input
                      id="cart-telephone"
                      type="tel"
                      autoComplete="tel"
                      required
                      value={telephone}
                      onChange={(event) => setTelephone(event.target.value)}
                      placeholder="+244 9XX XXX XXX"
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label htmlFor="cart-city" className="text-xs font-semibold text-[#263b49]">
                      Cidade (opcional)
                    </label>
                    <input
                      id="cart-city"
                      autoComplete="address-level2"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="Ex.: Luanda"
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cart-address" className="text-xs font-semibold text-[#263b49]">
                    Morada completa de entrega <span className="text-[#007cc3]">*</span>
                  </label>
                  <textarea
                    id="cart-address"
                    autoComplete="street-address"
                    required
                    minLength={8}
                    rows={2}
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Rua, número, bairro e ponto de referência"
                    className={`${inputClassName} resize-y`}
                  />
                </div>

                <div>
                  <label htmlFor="cart-notes" className="text-xs font-semibold text-[#263b49]">
                    Notas de entrega (opcional)
                  </label>
                  <textarea
                    id="cart-notes"
                    rows={2}
                    value={deliveryNotes}
                    onChange={(event) => setDeliveryNotes(event.target.value)}
                    placeholder="Horário preferencial ou indicações para a entrega"
                    className={`${inputClassName} resize-y`}
                  />
                </div>

                {orderError && (
                  <p role="alert" className="border border-[#f0d3cc] bg-[#fff7f5] px-3 py-2 text-sm text-[#914533]">
                    {orderError}
                  </p>
                )}

                <div className="flex items-start gap-2.5 border border-[#e1e8ec] bg-[#f7f9fa] p-3 text-xs leading-5 text-[#5c6c76]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#007cc3]" aria-hidden="true" />
                  <span>
                    Referência gerada automaticamente e encaminhada para o WhatsApp da Bioprev Angola.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex min-h-12 w-full items-center justify-center gap-2 bg-[#007cc3] px-5 text-sm font-bold text-white transition-colors hover:bg-[#006aa8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                      A registar encomenda…
                    </>
                  ) : (
                    <>
                      Enviar pedido pelo WhatsApp
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
