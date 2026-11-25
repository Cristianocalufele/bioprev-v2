import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  MessageCircle,
  Package,
  Plus,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEOHead, { breadcrumbSchema } from "@/components/SEOHead";
import { ProductVisual } from "@/components/loja/ProductVisual";
import { StoreCartDrawer } from "@/components/loja/StoreCartDrawer";
import { publicStoreCatalog, StoreApiError } from "@/lib/storeApi";
import { useStoreCart } from "@/lib/storeCart";
import { formatKwanza, stockStatusInfo } from "@/lib/storeFormat";
import { storeHeroImage } from "@/lib/storeImages";

type SortMode = "featured" | "most_ordered" | "newest" | "price_asc" | "price_desc" | "name_asc";
type QuickFilter = "all" | "recommended" | "in_stock";

export default function Loja() {
  const { totalItems, setDrawerOpen, addItem } = useStoreCart();
  const catalogQuery = useQuery({
    queryKey: ["store", "catalog"],
    queryFn: publicStoreCatalog,
    retry: false,
  });

  const products = catalogQuery.data?.products ?? [];
  const categories = catalogQuery.data?.categories ?? [];
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("featured");
  const [searchTerm, setSearchTerm] = useState("");
  const [heroImageError, setHeroImageError] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const visibleProducts = useMemo(() => {
    const normalisedSearch = searchTerm.trim().toLocaleLowerCase("pt");
    const filtered = products.filter((product) => {
      const matchesCategory = activeCategory === "Todos" || product.categoryName === activeCategory;
      const matchesQuick =
        quickFilter === "all" ||
        (quickFilter === "recommended" && (product.isFeatured || product.orderCount > 0)) ||
        (quickFilter === "in_stock" &&
          (product.stockStatus === "em_stock" || product.stockStatus === "stock_reduzido"));
      const matchesSearch =
        normalisedSearch.length === 0 ||
        `${product.name} ${product.sku} ${product.categoryName} ${product.shortDescription}`
          .toLocaleLowerCase("pt")
          .includes(normalisedSearch);
      return matchesCategory && matchesQuick && matchesSearch;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortMode === "most_ordered") {
        return b.orderCount - a.orderCount || Number(b.isFeatured) - Number(a.isFeatured) || a.sortOrder - b.sortOrder;
      }
      if (sortMode === "newest") {
        return b.createdAt.localeCompare(a.createdAt) || a.sortOrder - b.sortOrder;
      }
      if (sortMode === "price_asc") {
        const pa = a.priceAoa ?? Number.MAX_SAFE_INTEGER;
        const pb = b.priceAoa ?? Number.MAX_SAFE_INTEGER;
        return pa - pb || a.name.localeCompare(b.name, "pt");
      }
      if (sortMode === "price_desc") {
        const pa = a.priceAoa ?? -1;
        const pb = b.priceAoa ?? -1;
        return pb - pa || a.name.localeCompare(b.name, "pt");
      }
      if (sortMode === "name_asc") {
        return a.name.localeCompare(b.name, "pt");
      }
      // featured / default
      return Number(b.isFeatured) - Number(a.isFeatured) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pt");
    });

    return sorted;
  }, [activeCategory, products, quickFilter, searchTerm, sortMode]);

  const handleAddToCart = (product: (typeof products)[number]) => {
    addItem(product, 1, false);
    setJustAddedId(product.id);
    window.setTimeout(() => {
      setJustAddedId((current) => (current === product.id ? null : current));
    }, 1600);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white text-[#303c45]">
      <SEOHead
        title="Loja"
        description="Explore equipamentos de monitorização, limpeza e protecção individual da Bioprev Angola. Adicione vários artigos ao carrinho e confirme a sua encomenda pelo WhatsApp."
        canonical="/loja"
        keywords="loja Bioprev Angola, equipamentos limpeza, monitorização, protecção individual"
        structuredData={breadcrumbSchema([
          { name: "Início", url: "/" },
          { name: "Loja", url: "/loja" },
        ])}
      />
      <Header />

      <main id="main-content" className="flex-grow">
        <section className="border-b border-[#e2e8ec] bg-[#f4f7f9]">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
            <nav aria-label="Trilho de navegação" className="mb-5 flex items-center justify-between gap-4 text-xs text-[#64737d]">
              <div className="flex items-center gap-2">
                <Link href="/" className="transition-colors hover:text-[#007cc3]">
                  Início
                </Link>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="font-semibold text-[#001d3d]" aria-current="page">
                  Loja
                </span>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex min-h-10 items-center gap-2 border border-[#001d3d] bg-[#001d3d] px-4 text-xs font-bold text-white transition-colors hover:bg-[#007cc3] hover:border-[#007cc3] tabular-nums"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                Carrinho ({totalItems})
              </button>
            </nav>

            <div className="grid items-stretch gap-8 lg:grid-cols-12">
              <div className="flex flex-col justify-between gap-6 lg:col-span-7">
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="h-[3px] w-10 bg-[#f2c92f]" />
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#007cc3]">
                      Catálogo Bioprev Angola
                    </span>
                  </div>
                  <h1 className="max-w-2xl text-balance text-3xl font-semibold leading-tight tracking-tight text-[#001d3d] sm:text-4xl">
                    Equipamentos para monitorização, limpeza e protecção
                  </h1>
                  <p className="mt-3 max-w-xl text-[15px] leading-6 text-[#586771]">
                    Consulte fichas técnicas, preços em Kwanzas e disponibilidade em stock. Junte vários artigos no carrinho e envie um único pedido pelo WhatsApp.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <label htmlFor="product-search" className="sr-only">
                        Pesquisar artigos na loja
                      </label>
                      <Search
                        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#71808a]"
                        aria-hidden="true"
                      />
                      <input
                        id="product-search"
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Pesquisar por artigo, código SKU ou categoria…"
                        className="min-h-12 w-full border border-[#c8d2da] bg-white pl-12 pr-10 text-sm text-[#001d3d] outline-none transition-colors placeholder:text-[#839099] focus:border-[#007cc3] focus:ring-2 focus:ring-[#007cc3]/15"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm("")}
                          aria-label="Limpar pesquisa"
                          className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#62727c] hover:text-[#001d3d]"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64737d] tabular-nums">
                    <span>{products.length} artigos de referência</span>
                    <span aria-hidden="true">·</span>
                    <span>{categories.length} categorias</span>
                    <span aria-hidden="true">·</span>
                    <span>Entregas em Luanda, Benguela e Huambo</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="h-full min-h-[220px] overflow-hidden border border-[#dce4e9] border-t-4 border-t-[#f2c92f] bg-white">
                  {!heroImageError ? (
                    <img
                      src={storeHeroImage}
                      alt="Equipamentos de monitorização, limpeza e protecção individual da Bioprev Angola"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImageError(true)}
                      className="h-full max-h-[320px] w-full object-cover lg:max-h-none"
                    />
                  ) : (
                    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 bg-[#ebf2f6] p-8 text-center">
                      <Package className="h-10 w-10 text-[#007cc3]" strokeWidth={1.3} aria-hidden="true" />
                      <p className="text-sm font-semibold text-[#001d3d]">Equipamentos Bioprev Angola</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="artigos" className="scroll-mt-6 py-10 sm:py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-6 flex flex-col gap-5 border-b border-[#e5ebee] pb-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#007cc3]">
                    Selecção de produtos
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-[#001d3d] sm:text-3xl">
                    Catálogo disponível
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar artigos por categoria">
                  {["Todos", ...categories.map((category) => category.name)].map((category) => {
                    const isActive = activeCategory === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setActiveCategory(category)}
                        className={`min-h-10 whitespace-nowrap shrink-0 border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007cc3] ${
                          isActive
                            ? "border-[#001d3d] bg-[#001d3d] text-white"
                            : "border-[#d5dfe4] bg-white text-[#4d5c66] hover:border-[#007cc3] hover:text-[#007cc3]"
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1.5 border border-[#dce4e9] bg-[#f4f7f9] p-1" role="group" aria-label="Filtros rápidos">
                  {(
                    [
                      { id: "all", label: "Todos" },
                      { id: "recommended", label: "Recomendados" },
                      { id: "in_stock", label: "Em stock" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={quickFilter === item.id}
                      onClick={() => setQuickFilter(item.id)}
                      className={`min-h-9 whitespace-nowrap px-3.5 text-xs font-semibold transition-colors ${
                        quickFilter === item.id
                          ? "bg-white text-[#001d3d] shadow-xs"
                          : "text-[#586771] hover:text-[#001d3d]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#586771]">
                    <span className="whitespace-nowrap">Ordenar por:</span>
                    <select
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value as SortMode)}
                      className="min-h-10 border border-[#c8d2da] bg-white px-3 text-xs font-semibold text-[#001d3d] outline-none focus:border-[#007cc3]"
                    >
                      <option value="featured">Destaques</option>
                      <option value="most_ordered">Mais pedidos</option>
                      <option value="newest">Mais recentes</option>
                      <option value="price_asc">Menor preço (Kz)</option>
                      <option value="price_desc">Maior preço (Kz)</option>
                      <option value="name_asc">Nome (A–Z)</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    className="inline-flex min-h-10 items-center gap-2 border border-[#007cc3] bg-white px-4 text-xs font-bold text-[#007cc3] transition-colors hover:bg-[#007cc3] hover:text-white tabular-nums"
                  >
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    Abrir carrinho ({totalItems})
                  </button>
                </div>
              </div>
            </div>

            {catalogQuery.data && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[#64737d] tabular-nums">
                <span>
                  A mostrar <strong className="font-semibold text-[#001d3d]">{visibleProducts.length}</strong>{" "}
                  {visibleProducts.length === 1 ? "artigo" : "artigos"}
                  {activeCategory !== "Todos" ? ` em ${activeCategory}` : ""}
                  {searchTerm.trim() ? ` para “${searchTerm.trim()}”` : ""}
                </span>
                {(activeCategory !== "Todos" || quickFilter !== "all" || searchTerm.trim() !== "") && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory("Todos");
                      setQuickFilter("all");
                      setSearchTerm("");
                    }}
                    className="font-semibold text-[#007cc3] hover:underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}

            {catalogQuery.isPending ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="border border-[#e1e7ea] bg-white">
                    <div className="aspect-[4/3] animate-pulse bg-[#edf2f5]" />
                    <div className="space-y-3 p-6">
                      <div className="h-3 w-24 animate-pulse bg-[#edf2f5]" />
                      <div className="h-5 w-3/4 animate-pulse bg-[#edf2f5]" />
                      <div className="h-10 w-full animate-pulse bg-[#f4f7f9]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : catalogQuery.error ? (
              <div className="border border-[#e9dba3] border-t-4 border-t-[#f2c92f] bg-[#fffdf5] px-5 py-10 text-center">
                <Package className="mx-auto h-8 w-8 text-[#007cc3]" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold text-[#001d3d]">O catálogo está temporariamente indisponível</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64737d]">
                  {catalogQuery.error instanceof StoreApiError
                    ? catalogQuery.error.message
                    : "Não foi possível carregar os artigos. Tente novamente mais tarde."}
                </p>
              </div>
            ) : visibleProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visibleProducts.map((product) => {
                  const stock = stockStatusInfo(product);
                  const addedRecently = justAddedId === product.id;

                  return (
                    <article
                      key={product.id}
                      className="group flex flex-col border border-[#dde5ea] bg-white transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#007cc3] hover:shadow-[0_12px_26px_rgba(0,29,61,0.08)]"
                    >
                      <Link
                        href={`/loja/${product.slug}`}
                        className="relative block aspect-[4/3] w-full overflow-hidden border-b border-[#e5ebee] bg-[#f4f7f9]"
                        aria-label={`Ver ficha técnica de ${product.name}`}
                      >
                        <ProductVisual
                          product={product}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </Link>

                      <div className="flex flex-grow flex-col p-5 sm:p-6">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className="font-bold uppercase tracking-[0.11em] text-[#007cc3]">
                            {product.categoryName}
                          </span>
                          <span aria-hidden="true" className="text-[#c0cbd1]">·</span>
                          <span className={`font-semibold tabular-nums ${stock.textClass}`}>
                            {stock.shortLabel}
                          </span>
                          {product.isFeatured && (
                            <>
                              <span aria-hidden="true" className="text-[#c0cbd1]">·</span>
                              <span className="font-semibold text-[#8a6500]">Recomendado</span>
                            </>
                          )}
                        </div>

                        <Link href={`/loja/${product.slug}`} className="mt-1.5 block">
                          <h3 className="text-lg font-semibold leading-snug text-[#001d3d] transition-colors group-hover:text-[#007cc3]">
                            {product.name}
                          </h3>
                        </Link>

                        <p className="mt-2 flex-grow text-sm leading-6 text-[#61707a] line-clamp-2">
                          {product.shortDescription}
                        </p>

                        <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#eaeff2] pt-4">
                          <div className="min-w-0">
                            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7e8d96]">
                              {product.sku ? `Ref. ${product.sku}` : "Preço"}
                            </span>
                            <span className="mt-0.5 block text-[15px] font-bold tabular-nums text-[#001d3d]">
                              {formatKwanza(product.priceAoa)}
                            </span>
                            {product.priceAoa !== null && (
                              <span className="block text-[11px] text-[#7e8d96]">
                                por {product.unitLabel}
                              </span>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <Link
                              href={`/loja/${product.slug}`}
                              className="inline-flex min-h-10 items-center gap-1 border border-[#d5dfe4] bg-white px-3 text-xs font-semibold text-[#344754] transition-colors hover:border-[#007cc3] hover:text-[#007cc3]"
                            >
                              Ficha
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </Link>
                            <button
                              type="button"
                              disabled={!stock.canOrder}
                              onClick={() => handleAddToCart(product)}
                              className={`inline-flex min-h-10 items-center gap-1.5 border px-3.5 text-xs font-bold transition-colors ${
                                !stock.canOrder
                                  ? "cursor-not-allowed border-[#e0e6ea] bg-[#f4f7f9] text-[#8a969e]"
                                  : addedRecently
                                    ? "border-[#276445] bg-[#276445] text-white"
                                    : "border-[#007cc3] bg-[#007cc3] text-white hover:bg-[#006aa8]"
                              }`}
                            >
                              {!stock.canOrder ? (
                                "Esgotado"
                              ) : addedRecently ? (
                                <>
                                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                  Adicionado
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                  Adicionar
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : products.length === 0 ? (
              <div className="border border-[#dfe7eb] border-t-4 border-t-[#f2c92f] bg-[#f7f9fa] px-5 py-12 text-center">
                <Package className="mx-auto h-8 w-8 text-[#007cc3]" strokeWidth={1.5} aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold text-[#001d3d]">Ainda não há artigos publicados</h3>
                <p className="mt-2 text-sm text-[#687680]">
                  Estamos a preparar o catálogo. Volte a consultar esta página em breve.
                </p>
              </div>
            ) : (
              <div className="border border-[#dfe7eb] border-t-4 border-t-[#f2c92f] bg-[#f7f9fa] px-5 py-12 text-center">
                <Search className="mx-auto h-8 w-8 text-[#007cc3]" strokeWidth={1.5} aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold text-[#001d3d]">Não encontrámos esse artigo</h3>
                <p className="mt-2 text-sm text-[#687680]">
                  Experimente outro termo ou veja todas as categorias disponíveis.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setActiveCategory("Todos");
                    setQuickFilter("all");
                  }}
                  className="mt-5 border border-[#007cc3] px-4 py-2.5 text-sm font-bold text-[#007cc3] transition-colors hover:bg-[#007cc3] hover:text-white"
                >
                  Ver todos os artigos
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="border-t border-[#e2e8ec] bg-[#f4f7f9] py-10 sm:py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-6 border border-[#dce4e9] bg-white p-6 sm:p-8 lg:grid-cols-12 lg:items-center">
              <div className="grid gap-6 sm:grid-cols-3 lg:col-span-8">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#007cc3] tabular-nums">
                    01. Carrinho único
                  </p>
                  <h3 className="mt-1.5 text-sm font-semibold text-[#001d3d]">Junte vários artigos</h3>
                  <p className="mt-1 text-xs leading-5 text-[#61707a]">
                    Consulte preços em Kwanzas, fichas técnicas e adicione tudo num só pedido.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#007cc3] tabular-nums">
                    02. Registo
                  </p>
                  <h3 className="mt-1.5 text-sm font-semibold text-[#001d3d]">Referência imediata</h3>
                  <p className="mt-1 text-xs leading-5 text-[#61707a]">
                    A encomenda fica gravada com código único para acompanhamento pela nossa equipa.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#007cc3] tabular-nums">
                    03. WhatsApp
                  </p>
                  <h3 className="mt-1.5 text-sm font-semibold text-[#001d3d]">Confirmação rápida</h3>
                  <p className="mt-1 text-xs leading-5 text-[#61707a]">
                    Lista completa enviada directamente para confirmar pagamento e entrega.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-[#e5ebee] pt-6 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <p className="text-sm font-semibold text-[#001d3d]">Precisa de aconselhamento técnico?</p>
                <a
                  href="https://wa.me/244928737888"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 border border-[#007cc3] bg-[#007cc3] px-5 text-sm font-bold text-white transition-colors hover:bg-[#006aa8]"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Falar com a equipa
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <StoreCartDrawer catalogProducts={products} />
    </div>
  );
}
