import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Brush,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Hand,
  LoaderCircle,
  MessageCircle,
  Minus,
  Package,
  Plus,
  Search,
  Shield,
  SprayCan,
  Target,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEOHead, { breadcrumbSchema } from "@/components/SEOHead";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { StoreOrder, StoreProduct } from "@shared/store";
import { publicStoreCatalog, StoreApiError, submitStoreOrder } from "@/lib/storeApi";
import { resolveProductImage, storeHeroImage } from "@/lib/storeImages";

const inputClassName =
  "mt-2 min-h-12 w-full border border-[#c8d2da] bg-white px-4 py-3 text-[15px] text-[#001d3d] outline-none transition-colors placeholder:text-[#8a969e] focus:border-[#007cc3] focus:ring-2 focus:ring-[#007cc3]/15";

function productIcon(product: Pick<StoreProduct, "categorySlug" | "slug">): LucideIcon {
  const category = product.categorySlug.toLocaleLowerCase("pt");
  if (category.includes("limpeza")) return product.slug.includes("pulverizador") ? SprayCan : Brush;
  if (category.includes("protec") || category.includes("prote")) return product.slug.includes("luvas") ? Hand : Shield;
  return product.slug.includes("armadilha") ? ClipboardList : Target;
}

function ProductVisual({
  product,
  alt,
  className = "h-full w-full object-cover",
}: {
  product: Pick<StoreProduct, "slug" | "imageUrl" | "categorySlug" | "name" | "categoryName">;
  alt: string;
  className?: string;
}) {
  const src = resolveProductImage(product);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const Icon = productIcon(product);

  useEffect(() => {
    setFailedSrc(null);
  }, [src]);

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        className={className}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 bg-gradient-to-br from-[#f4f7f9] to-[#e6eff5] p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center border border-[#d2e2ec] bg-white text-[#007cc3]">
        <Icon className="h-7 w-7" strokeWidth={1.4} aria-hidden="true" />
      </div>
      <span className="text-xs font-medium text-[#5d6d77]">{product.categoryName}</span>
    </div>
  );
}

export default function Loja() {
  const queryClient = useQueryClient();
  const whatsappLinkRef = useRef<HTMLAnchorElement | null>(null);
  const catalogQuery = useQuery({
    queryKey: ["store", "catalog"],
    queryFn: publicStoreCatalog,
    retry: false,
  });

  const products = catalogQuery.data?.products ?? [];
  const categories = catalogQuery.data?.categories ?? [];
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [heroImageError, setHeroImageError] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [telephone, setTelephone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState<{ order: StoreOrder; whatsappUrl: string } | null>(null);

  const visibleProducts = useMemo(() => {
    const normalisedSearch = searchTerm.trim().toLocaleLowerCase("pt");
    return products.filter((product) => {
      const matchesCategory = activeCategory === "Todos" || product.categoryName === activeCategory;
      const matchesSearch =
        normalisedSearch.length === 0 ||
        `${product.name} ${product.categoryName} ${product.shortDescription}`
          .toLocaleLowerCase("pt")
          .includes(normalisedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, products, searchTerm]);

  const openProduct = (product: StoreProduct) => {
    setSelectedProduct(product);
    setCustomerName("");
    setQuantity(1);
    setTelephone("");
    setAddress("");
    setCity("");
    setDeliveryNotes("");
    setOrderError("");
    setSubmittedOrder(null);
  };

  const handleRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProduct || submittingOrder) return;

    const parsedQuantity = Math.max(1, Math.min(10000, Math.trunc(quantity) || 1));
    setSubmittingOrder(true);
    setOrderError("");

    try {
      const { order } = await submitStoreOrder({
        productId: selectedProduct.id,
        quantity: parsedQuantity,
        customerName: customerName.trim(),
        telephone: telephone.trim(),
        address: address.trim(),
        city: city.trim(),
        deliveryNotes: deliveryNotes.trim(),
      });

      const message = [
        "Olá, Bioprev. Gostaria de confirmar este pedido:",
        "",
        `Referência: ${order.reference}`,
        `Artigo: ${order.productName}`,
        `Quantidade: ${order.quantity}`,
        order.customerName ? `Nome / Empresa: ${order.customerName}` : "",
        `Telefone para contacto: ${order.telephone}`,
        `Morada de entrega: ${order.address}`,
        order.city ? `Cidade: ${order.city}` : "",
        order.deliveryNotes ? `Notas de entrega: ${order.deliveryNotes}` : "",
        "",
        "Por favor, confirmem a disponibilidade, o preço e as condições de entrega.",
      ]
        .filter(Boolean)
        .join("\n");

      const whatsappUrl = `https://wa.me/244928737888?text=${encodeURIComponent(message)}`;
      setSubmittedOrder({ order, whatsappUrl });
      void queryClient.invalidateQueries({ queryKey: ["store-admin", "orders"] });

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
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white text-[#303c45]">
      <SEOHead
        title="Loja"
        description="Explore artigos de referência para monitorização, limpeza e protecção. Consulte a equipa Bioprev Angola para confirmar disponibilidade, preço e entrega."
        canonical="/loja"
        keywords="loja Bioprev Angola, artigos limpeza, monitorização, protecção"
        structuredData={breadcrumbSchema([
          { name: "Início", url: "/" },
          { name: "Loja", url: "/loja" },
        ])}
      />
      <Header />

      <main id="main-content" className="flex-grow">
        <section className="border-b border-[#e2e8ec] bg-[#f4f7f9]">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
            <nav aria-label="Trilho de navegação" className="mb-5 flex items-center gap-2 text-xs text-[#64737d]">
              <Link href="/" className="transition-colors hover:text-[#007cc3]">
                Início
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-semibold text-[#001d3d]" aria-current="page">
                Loja
              </span>
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
                    Seleccione os artigos pretendidos, registe a entrega com referência automática e confirme preço e disponibilidade directamente com a nossa equipa pelo WhatsApp.
                  </p>
                </div>

                <div className="space-y-3">
                  <label htmlFor="product-search" className="sr-only">
                    Pesquisar artigos na loja
                  </label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#71808a]"
                      aria-hidden="true"
                    />
                    <input
                      id="product-search"
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Pesquisar por artigo ou categoria (ex.: pulverizador, luvas, estação…)"
                      className="min-h-13 w-full border border-[#c8d2da] bg-white pl-12 pr-12 text-sm text-[#001d3d] outline-none transition-colors placeholder:text-[#839099] focus:border-[#007cc3] focus:ring-2 focus:ring-[#007cc3]/15"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        aria-label="Limpar pesquisa"
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#62727c] hover:text-[#001d3d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007cc3]"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64737d] tabular-nums">
                    <span>{products.length} artigos de referência</span>
                    <span aria-hidden="true">·</span>
                    <span>{categories.length} categorias</span>
                    <span aria-hidden="true">·</span>
                    <span>Atendimento directo em Luanda, Benguela e Huambo</span>
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
            <div className="mb-8 flex flex-col gap-5 border-b border-[#e5ebee] pb-6 md:flex-row md:items-end md:justify-between">
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

            {catalogQuery.data && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[#64737d] tabular-nums">
                <span>
                  A mostrar <strong className="font-semibold text-[#001d3d]">{visibleProducts.length}</strong>{" "}
                  {visibleProducts.length === 1 ? "artigo" : "artigos"}
                  {activeCategory !== "Todos" ? ` em ${activeCategory}` : ""}
                  {searchTerm.trim() ? ` para “${searchTerm.trim()}”` : ""}
                </span>
                {(activeCategory !== "Todos" || searchTerm.trim() !== "") && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory("Todos");
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
                {visibleProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => openProduct(product)}
                    aria-label={`Ver detalhes e encomendar ${product.name}`}
                    className="group flex flex-col border border-[#dde5ea] bg-white text-left transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#007cc3] hover:shadow-[0_12px_26px_rgba(0,29,61,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007cc3]"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-[#e5ebee] bg-[#f4f7f9]">
                      <ProductVisual
                        product={product}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>

                    <div className="flex flex-grow flex-col p-5 sm:p-6">
                      <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-[#007cc3]">
                        {product.categoryName}
                      </p>
                      <h3 className="mt-1.5 text-lg font-semibold leading-snug text-[#001d3d] transition-colors group-hover:text-[#007cc3]">
                        {product.name}
                      </h3>
                      <p className="mt-2 flex-grow text-sm leading-6 text-[#61707a] line-clamp-2">
                        {product.shortDescription}
                      </p>

                      <div className="mt-5 flex items-end justify-between border-t border-[#eaeff2] pt-4">
                        <div>
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7e8d96]">
                            Preço
                          </span>
                          <span className="mt-0.5 block text-sm font-bold text-[#001d3d]">
                            Sob consulta
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-bold text-[#007cc3]">
                          Encomendar
                          <ArrowRight
                            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
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
                  }}
                  className="mt-5 border border-[#007cc3] px-4 py-2.5 text-sm font-bold text-[#007cc3] transition-colors hover:bg-[#007cc3] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007cc3]"
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
                    01. Selecção
                  </p>
                  <h3 className="mt-1.5 text-sm font-semibold text-[#001d3d]">Escolha o artigo</h3>
                  <p className="mt-1 text-xs leading-5 text-[#61707a]">
                    Consulte os detalhes e escolha a quantidade necessária para o seu espaço.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#007cc3] tabular-nums">
                    02. Registo
                  </p>
                  <h3 className="mt-1.5 text-sm font-semibold text-[#001d3d]">Referência imediata</h3>
                  <p className="mt-1 text-xs leading-5 text-[#61707a]">
                    O pedido fica registado com um código único para acompanhamento pela equipa.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#007cc3] tabular-nums">
                    03. WhatsApp
                  </p>
                  <h3 className="mt-1.5 text-sm font-semibold text-[#001d3d]">Confirmação rápida</h3>
                  <p className="mt-1 text-xs leading-5 text-[#61707a]">
                    A equipa confirma o valor, stock e prazo de entrega directamente consigo.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-[#e5ebee] pt-6 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <p className="text-sm font-semibold text-[#001d3d]">Precisa de aconselhamento técnico?</p>
                <a
                  href="https://wa.me/244928737888"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 border border-[#007cc3] bg-[#007cc3] px-5 text-sm font-bold text-white transition-colors hover:bg-[#006aa8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#001d3d]"
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

      <Sheet
        open={Boolean(selectedProduct)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProduct(null);
            setSubmittedOrder(null);
            setOrderError("");
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full max-w-[540px] overflow-y-auto border-l border-[#dce4e9] bg-white p-0 sm:max-w-[540px]"
          aria-describedby="product-panel-description"
        >
          {selectedProduct && (
            <div className="flex min-h-full flex-col">
              <div className="aspect-[4/3] w-full overflow-hidden border-b border-[#e5ebee] bg-[#f4f7f9]">
                <ProductVisual
                  product={selectedProduct}
                  alt={selectedProduct.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="border-b border-[#e5ebee] bg-[#f8fafb] px-5 py-6 sm:px-8">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#007cc3]">
                  <span className="h-[2px] w-5 bg-[#f2c92f]" />
                  {selectedProduct.categoryName}
                </div>
                <SheetHeader className="space-y-2 text-left">
                  <SheetTitle className="text-2xl font-semibold leading-tight tracking-tight text-[#001d3d]">
                    {selectedProduct.name}
                  </SheetTitle>
                  <SheetDescription id="product-panel-description" className="text-sm leading-6 text-[#5c6c76]">
                    {selectedProduct.description || selectedProduct.shortDescription}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-5 flex items-center justify-between border-t border-[#e2e8ec] pt-4 text-sm">
                  <span className="text-[#64737d]">Preço unitário</span>
                  <span className="font-bold text-[#001d3d]">Sob consulta</span>
                </div>
              </div>

              <div className="flex-grow px-5 py-6 sm:px-8">
                {submittedOrder ? (
                  <div className="space-y-5 border border-[#cce4d7] border-t-4 border-t-[#276445] bg-[#f1f8f4] p-5">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#276445]" aria-hidden="true" />
                      <div>
                        <h3 className="text-lg font-semibold text-[#001d3d]">Pedido registado</h3>
                        <p className="mt-1 text-sm leading-6 text-[#344754]">
                          O seu pedido ficou registado na nossa loja com a referência{" "}
                          <strong className="font-mono font-bold text-[#001d3d]">
                            {submittedOrder.order.reference}
                          </strong>
                          .
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-[#d6e9df] pt-4 text-sm text-[#344754]">
                      <p>
                        <strong>Artigo:</strong> {submittedOrder.order.productName} (x
                        {submittedOrder.order.quantity})
                      </p>
                      {submittedOrder.order.customerName && (
                        <p>
                          <strong>Nome / Empresa:</strong> {submittedOrder.order.customerName}
                        </p>
                      )}
                      <p>
                        <strong>Telefone:</strong> {submittedOrder.order.telephone}
                      </p>
                      <p>
                        <strong>Morada:</strong> {submittedOrder.order.address}
                      </p>
                      {submittedOrder.order.city && (
                        <p>
                          <strong>Cidade:</strong> {submittedOrder.order.city}
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
                      Enviar mensagem no WhatsApp
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setSubmittedOrder(null)}
                      className="flex min-h-11 w-full items-center justify-center border border-[#cbd6dc] bg-white px-4 text-sm font-semibold text-[#344754] transition-colors hover:border-[#007cc3] hover:text-[#007cc3]"
                    >
                      Fazer outro pedido deste artigo
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-5">
                      <h3 className="text-lg font-semibold text-[#001d3d]">Solicitar encomenda</h3>
                      <p className="mt-1 text-sm leading-6 text-[#64737d]">
                        Preencha os dados de entrega para registar o pedido e abrir a conversa no WhatsApp.
                      </p>
                    </div>

                    <form onSubmit={handleRequest} className="space-y-5">
                      <div>
                        <label htmlFor="request-customer-name" className="text-sm font-semibold text-[#263b49]">
                          Nome ou empresa (opcional)
                        </label>
                        <input
                          id="request-customer-name"
                          name="customerName"
                          type="text"
                          autoComplete="name"
                          maxLength={120}
                          value={customerName}
                          onChange={(event) => setCustomerName(event.target.value)}
                          placeholder="Ex.: Maria Silva ou Empresa Lda."
                          className={inputClassName}
                        />
                      </div>

                      <div>
                        <label htmlFor="request-quantity" className="text-sm font-semibold text-[#263b49]">
                          Quantidade <span className="text-[#007cc3]">*</span>
                        </label>
                        <div className="mt-2 flex items-stretch">
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            aria-label="Diminuir quantidade"
                            className="flex min-h-12 w-12 items-center justify-center border border-r-0 border-[#c8d2da] bg-[#f8fafb] text-[#001d3d] transition-colors hover:bg-[#edf3f7]"
                          >
                            <Minus className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <input
                            id="request-quantity"
                            name="quantity"
                            type="number"
                            min={1}
                            max={10000}
                            step={1}
                            required
                            value={quantity}
                            onChange={(event) =>
                              setQuantity(Math.max(1, parseInt(event.target.value, 10) || 1))
                            }
                            className="min-h-12 w-full border border-[#c8d2da] bg-white px-4 text-center text-[15px] font-semibold tabular-nums text-[#001d3d] outline-none focus:border-[#007cc3]"
                          />
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.min(10000, q + 1))}
                            aria-label="Aumentar quantidade"
                            className="flex min-h-12 w-12 items-center justify-center border border-l-0 border-[#c8d2da] bg-[#f8fafb] text-[#001d3d] transition-colors hover:bg-[#edf3f7]"
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="request-telephone" className="text-sm font-semibold text-[#263b49]">
                          Telefone para contacto <span className="text-[#007cc3]">*</span>
                        </label>
                        <input
                          id="request-telephone"
                          name="telephone"
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
                        <label htmlFor="request-address" className="text-sm font-semibold text-[#263b49]">
                          Morada completa de entrega <span className="text-[#007cc3]">*</span>
                        </label>
                        <textarea
                          id="request-address"
                          name="address"
                          autoComplete="street-address"
                          required
                          minLength={8}
                          rows={3}
                          value={address}
                          onChange={(event) => setAddress(event.target.value)}
                          placeholder="Rua, número, bairro e ponto de referência"
                          className={`${inputClassName} resize-y`}
                        />
                      </div>

                      <div>
                        <label htmlFor="request-city" className="text-sm font-semibold text-[#263b49]">
                          Cidade (opcional)
                        </label>
                        <input
                          id="request-city"
                          name="city"
                          autoComplete="address-level2"
                          value={city}
                          onChange={(event) => setCity(event.target.value)}
                          placeholder="Ex.: Luanda"
                          className={inputClassName}
                        />
                      </div>

                      <div>
                        <label htmlFor="request-notes" className="text-sm font-semibold text-[#263b49]">
                          Notas de entrega (opcional)
                        </label>
                        <textarea
                          id="request-notes"
                          name="deliveryNotes"
                          rows={2}
                          value={deliveryNotes}
                          onChange={(event) => setDeliveryNotes(event.target.value)}
                          placeholder="Informação adicional para localizar a morada"
                          className={`${inputClassName} resize-y`}
                        />
                      </div>

                      {orderError && (
                        <p role="alert" className="border border-[#f0d3cc] bg-[#fff7f5] px-3 py-2 text-sm text-[#914533]">
                          {orderError}
                        </p>
                      )}

                      <div className="border border-[#e1e8ec] bg-[#f7f9fa] p-4">
                        <div className="flex gap-3">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#007cc3]" aria-hidden="true" />
                          <p className="text-xs leading-5 text-[#5c6c76]">
                            O pedido fica registado para acompanhamento e abre o WhatsApp com os dados preenchidos para confirmar preço, stock e entrega.
                          </p>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingOrder}
                        className="flex min-h-12 w-full items-center justify-center gap-2 bg-[#007cc3] px-5 text-sm font-bold text-white transition-colors hover:bg-[#006aa8] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#001d3d]"
                      >
                        {submittingOrder ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                            A registar pedido…
                          </>
                        ) : (
                          <>
                            Continuar pelo WhatsApp
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
