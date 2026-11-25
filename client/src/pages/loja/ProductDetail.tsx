import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  FileText,
  Minus,
  Package,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEOHead, { breadcrumbSchema } from "@/components/SEOHead";
import { ProductVisual } from "@/components/loja/ProductVisual";
import { StoreCartDrawer } from "@/components/loja/StoreCartDrawer";
import { publicProductBySlug, publicStoreCatalog } from "@/lib/storeApi";
import { useStoreCart } from "@/lib/storeCart";
import { formatKwanza, stockStatusInfo } from "@/lib/storeFormat";
import { resolveProductImage } from "@/lib/storeImages";

export default function ProductDetail() {
  const [, params] = useRoute("/loja/:slug");
  const slug = params?.slug ?? "";
  const { totalItems, setDrawerOpen, addItem } = useStoreCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addedToast, setAddedToast] = useState(false);

  const productQuery = useQuery({
    queryKey: ["store", "product", slug],
    queryFn: () => publicProductBySlug(slug),
    enabled: Boolean(slug),
    retry: false,
  });

  const catalogQuery = useQuery({
    queryKey: ["store", "catalog"],
    queryFn: publicStoreCatalog,
    retry: false,
  });

  useEffect(() => {
    setSelectedImageIndex(0);
    setQuantity(1);
    setAddedToast(false);
  }, [slug]);

  const product = productQuery.data?.product ?? null;
  const relatedProducts = productQuery.data?.relatedProducts ?? [];

  const gallerySources = useMemo(() => {
    if (!product) return [];
    const list: Array<{ src: string; alt: string }> = [];
    const primary = resolveProductImage(product);
    if (primary) {
      list.push({ src: primary, alt: product.name });
    }
    for (const img of product.galleryImages) {
      if (img.imageUrl && !list.some((entry) => entry.src === img.imageUrl)) {
        list.push({ src: img.imageUrl, alt: img.altText || product.name });
      }
    }
    return list;
  }, [product]);

  const activeImage = gallerySources[selectedImageIndex] ?? gallerySources[0] ?? null;

  const handleAdd = (openCartAfter: boolean) => {
    if (!product) return;
    addItem(product, quantity, openCartAfter);
    if (!openCartAfter) {
      setAddedToast(true);
      window.setTimeout(() => setAddedToast(false), 1800);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white text-[#303c45]">
      {product && (
        <SEOHead
          title={`${product.name} — Loja`}
          description={product.shortDescription}
          canonical={`/loja/${product.slug}`}
          structuredData={breadcrumbSchema([
            { name: "Início", url: "/" },
            { name: "Loja", url: "/loja" },
            { name: product.name, url: `/loja/${product.slug}` },
          ])}
        />
      )}
      <Header />

      <main id="main-content" className="flex-grow">
        <div className="border-b border-[#e2e8ec] bg-[#f4f7f9]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <nav aria-label="Trilho de navegação" className="flex flex-wrap items-center gap-2 text-xs text-[#64737d]">
              <Link href="/" className="hover:text-[#007cc3]">Início</Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <Link href="/loja" className="hover:text-[#007cc3]">Loja</Link>
              {product && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-[#55656f]">{product.categoryName}</span>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="font-semibold text-[#001d3d]" aria-current="page">
                    {product.name}
                  </span>
                </>
              )}
            </nav>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex min-h-10 items-center gap-2 border border-[#001d3d] bg-[#001d3d] px-4 text-xs font-bold text-white transition-colors hover:border-[#007cc3] hover:bg-[#007cc3] tabular-nums"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Carrinho ({totalItems})
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
          {productQuery.isPending ? (
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="aspect-[4/3] animate-pulse bg-[#edf2f5] lg:col-span-7" />
              <div className="space-y-4 lg:col-span-5">
                <div className="h-4 w-32 animate-pulse bg-[#edf2f5]" />
                <div className="h-9 w-3/4 animate-pulse bg-[#edf2f5]" />
                <div className="h-24 w-full animate-pulse bg-[#f4f7f9]" />
              </div>
            </div>
          ) : !product ? (
            <div className="border border-[#dce4e9] border-t-4 border-t-[#f2c92f] bg-[#f8fafb] px-6 py-14 text-center">
              <Package className="mx-auto h-10 w-10 text-[#007cc3]" strokeWidth={1.4} />
              <h1 className="mt-4 text-2xl font-semibold text-[#001d3d]">Artigo não encontrado</h1>
              <p className="mt-2 text-sm text-[#61707a]">
                Este produto pode ter sido removido ou estar temporariamente indisponível.
              </p>
              <Link
                href="/loja"
                className="mt-6 inline-flex min-h-11 items-center gap-2 border border-[#007cc3] bg-[#007cc3] px-5 text-sm font-bold text-white hover:bg-[#006aa8]"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar à loja
              </Link>
            </div>
          ) : (
            (() => {
              const stock = stockStatusInfo(product);
              return (
                <>
                  <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
                    <div className="space-y-3 lg:col-span-7">
                      <div className="aspect-[4/3] w-full overflow-hidden border border-[#dce4e9] bg-[#f4f7f9]">
                        <ProductVisual
                          product={product}
                          alt={activeImage?.alt ?? product.name}
                          overrideSrc={activeImage?.src ?? null}
                        />
                      </div>

                      {gallerySources.length > 1 && (
                        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                          {gallerySources.map((img, idx) => (
                            <button
                              key={`${img.src}-${idx}`}
                              type="button"
                              onClick={() => setSelectedImageIndex(idx)}
                              aria-label={`Ver imagem ${idx + 1} de ${product.name}`}
                              className={`aspect-[4/3] overflow-hidden border bg-[#f4f7f9] transition-colors ${
                                idx === selectedImageIndex
                                  ? "border-2 border-[#007cc3]"
                                  : "border-[#dce4e9] opacity-80 hover:opacity-100"
                              }`}
                            >
                              <img
                                src={img.src}
                                alt={img.alt}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border border-[#dce4e9] border-t-4 border-t-[#f2c92f] bg-[#f9fbfc] p-6 sm:p-7 lg:sticky lg:top-6 lg:col-span-5">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                        <span className="font-bold uppercase tracking-[0.12em] text-[#007cc3]">
                          {product.categoryName}
                        </span>
                        {product.sku && (
                          <>
                            <span aria-hidden="true" className="text-[#c0cbd1]">·</span>
                            <span className="font-mono text-[#64737d]">SKU {product.sku}</span>
                          </>
                        )}
                      </div>

                      <h1 className="mt-2 text-balance text-2xl font-semibold leading-tight text-[#001d3d] sm:text-3xl">
                        {product.name}
                      </h1>

                      <p className="mt-3 text-sm leading-6 text-[#586771]">{product.shortDescription}</p>

                      <div className="mt-5 border-y border-[#e2e8ec] py-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <div>
                            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7c8b94]">
                              Preço de referência
                            </span>
                            <span className="mt-1 block text-2xl font-bold tabular-nums text-[#001d3d]">
                              {formatKwanza(product.priceAoa)}
                            </span>
                            {product.priceAoa !== null && (
                              <span className="text-xs text-[#64737d]">por {product.unitLabel}</span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7c8b94]">
                              Disponibilidade
                            </span>
                            <span className={`mt-1 block text-xs font-bold tabular-nums ${stock.textClass}`}>
                              {stock.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 space-y-4">
                        <div>
                          <label htmlFor="pdp-quantity" className="block text-xs font-semibold uppercase tracking-[0.08em] text-[#455660]">
                            Quantidade ({product.unitLabel})
                          </label>
                          <div className="mt-2 flex items-stretch">
                            <button
                              type="button"
                              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                              aria-label="Diminuir quantidade"
                              className="flex min-h-12 w-12 items-center justify-center border border-r-0 border-[#c8d2da] bg-white text-[#001d3d] hover:bg-[#edf3f7]"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              id="pdp-quantity"
                              type="number"
                              min={1}
                              max={10000}
                              value={quantity}
                              onChange={(event) => setQuantity(Math.max(1, parseInt(event.target.value, 10) || 1))}
                              className="min-h-12 w-full border border-[#c8d2da] bg-white px-4 text-center text-base font-semibold tabular-nums text-[#001d3d] outline-none focus:border-[#007cc3]"
                            />
                            <button
                              type="button"
                              onClick={() => setQuantity((q) => Math.min(10000, q + 1))}
                              aria-label="Aumentar quantidade"
                              className="flex min-h-12 w-12 items-center justify-center border border-l-0 border-[#c8d2da] bg-white text-[#001d3d] hover:bg-[#edf3f7]"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            disabled={!stock.canOrder}
                            onClick={() => handleAdd(false)}
                            className={`flex min-h-12 items-center justify-center gap-2 border px-4 text-sm font-bold transition-colors ${
                              !stock.canOrder
                                ? "cursor-not-allowed border-[#dce4e9] bg-[#eef2f5] text-[#8a969e]"
                                : addedToast
                                  ? "border-[#276445] bg-[#276445] text-white"
                                  : "border-[#007cc3] bg-white text-[#007cc3] hover:bg-[#eff6fa]"
                            }`}
                          >
                            {addedToast ? (
                              <>
                                <Check className="h-4 w-4" /> Adicionado
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4" /> Adicionar ao carrinho
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={!stock.canOrder}
                            onClick={() => handleAdd(true)}
                            className={`flex min-h-12 items-center justify-center gap-2 border px-4 text-sm font-bold transition-colors ${
                              !stock.canOrder
                                ? "cursor-not-allowed border-[#dce4e9] bg-[#eef2f5] text-[#8a969e]"
                                : "border-[#007cc3] bg-[#007cc3] text-white hover:bg-[#006aa8]"
                            }`}
                          >
                            Encomendar agora
                            <ArrowUpRight className="h-4 w-4" />
                          </button>
                        </div>

                        {product.datasheetUrl && (
                          <a
                            href={product.datasheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-h-11 items-center justify-between gap-3 border border-[#dce4e9] bg-white px-4 py-2.5 text-sm font-semibold text-[#001d3d] transition-colors hover:border-[#007cc3] hover:text-[#007cc3]"
                          >
                            <span className="inline-flex items-center gap-2">
                              <FileText className="h-4 w-4 text-[#007cc3]" />
                              Descarregar ficha técnica (PDF)
                            </span>
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 grid gap-8 border-t border-[#e5ebee] pt-10 lg:grid-cols-12">
                    <div className="lg:col-span-7">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#007cc3]">
                        Informação detalhada
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-[#001d3d]">
                        Descrição e aplicação
                      </h2>
                      <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-[#4d5c66]">
                        {product.description || product.shortDescription}
                      </p>
                    </div>

                    <div className="lg:col-span-5">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#007cc3]">
                        Ficha técnica
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-[#001d3d]">
                        Especificações
                      </h2>
                      {product.specs.length > 0 ? (
                        <dl className="mt-3 divide-y divide-[#e5ebee] border border-[#dce4e9] bg-[#f9fbfc]">
                          {product.specs.map((spec, idx) => (
                            <div key={`${spec.label}-${idx}`} className="grid grid-cols-[42%_1fr] gap-3 px-4 py-3 text-sm">
                              <dt className="font-semibold text-[#455660]">{spec.label}</dt>
                              <dd className="text-[#001d3d]">{spec.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="mt-3 border border-[#e5ebee] bg-[#f9fbfc] p-4 text-sm text-[#64737d]">
                          Consulte a nossa equipa técnica pelo WhatsApp para recomendações específicas de utilização.
                        </p>
                      )}
                    </div>
                  </div>

                  {relatedProducts.length > 0 && (
                    <section className="mt-14 border-t border-[#e5ebee] pt-10">
                      <div className="mb-6 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#007cc3]">
                            Sugestões compatíveis
                          </p>
                          <h2 className="mt-1 text-2xl font-semibold text-[#001d3d]">
                            Artigos relacionados
                          </h2>
                        </div>
                        <Link
                          href="/loja"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#007cc3] hover:underline"
                        >
                          Ver catálogo completo <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {relatedProducts.map((rel) => {
                          const relStock = stockStatusInfo(rel);
                          return (
                            <Link
                              key={rel.id}
                              href={`/loja/${rel.slug}`}
                              className="group flex flex-col border border-[#dde5ea] bg-white transition-colors hover:border-[#007cc3]"
                            >
                              <div className="aspect-[4/3] w-full overflow-hidden border-b border-[#e5ebee] bg-[#f4f7f9]">
                                <ProductVisual
                                  product={rel}
                                  alt={rel.name}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                />
                              </div>
                              <div className="flex flex-1 flex-col p-5">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-bold uppercase tracking-[0.1em] text-[#007cc3]">
                                    {rel.categoryName}
                                  </span>
                                  <span aria-hidden="true" className="text-[#c0cbd1]">·</span>
                                  <span className={`font-semibold ${relStock.textClass}`}>
                                    {relStock.shortLabel}
                                  </span>
                                </div>
                                <h3 className="mt-1.5 text-base font-semibold text-[#001d3d] group-hover:text-[#007cc3]">
                                  {rel.name}
                                </h3>
                                <p className="mt-3 text-sm font-bold tabular-nums text-[#001d3d]">
                                  {formatKwanza(rel.priceAoa)}
                                </p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </>
              );
            })()
          )}
        </div>
      </main>

      <Footer />
      <StoreCartDrawer catalogProducts={catalogQuery.data?.products ?? []} />
    </div>
  );
}
