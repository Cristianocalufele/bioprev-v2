import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Brush,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Hand,
  MapPin,
  Package,
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
import type { StoreProduct } from "@shared/store";
import { publicStoreCatalog, StoreApiError } from "@/lib/storeApi";

const inputClassName =
  "mt-2 min-h-12 w-full border border-[#c8d2da] bg-white px-4 py-3 text-[15px] text-[#001d3d] outline-none transition-colors placeholder:text-[#8a969e] focus:border-[#007cc3] focus:ring-2 focus:ring-[#007cc3]/15";

function productIcon(product: StoreProduct): LucideIcon {
  const category = product.categorySlug.toLocaleLowerCase("pt");
  if (category.includes("limpeza")) return product.slug.includes("pulverizador") ? SprayCan : Brush;
  if (category.includes("protec") || category.includes("prote")) return product.slug.includes("luvas") ? Hand : Shield;
  return product.slug.includes("armadilha") ? ClipboardList : Target;
}

export default function Loja() {
  const catalogQuery = useQuery({
    queryKey: ["store", "catalog"],
    queryFn: publicStoreCatalog,
    retry: false,
  });
  const products = catalogQuery.data?.products ?? [];
  const categories = catalogQuery.data?.categories ?? [];
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [telephone, setTelephone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const visibleProducts = useMemo(() => {
    const normalisedSearch = searchTerm.trim().toLocaleLowerCase("pt");
    return products.filter((product) => {
      const matchesCategory = activeCategory === "Todos" || product.categoryName === activeCategory;
      const matchesSearch =
        normalisedSearch.length === 0 ||
        `${product.name} ${product.categoryName} ${product.shortDescription}`.toLocaleLowerCase("pt").includes(normalisedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, products, searchTerm]);

  const openProduct = (product: StoreProduct) => {
    setSelectedProduct(product);
    setQuantity("1");
    setTelephone("");
    setAddress("");
    setCity("");
    setDeliveryNotes("");
  };

  const handleRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProduct) return;

    const message = [
      "Olá, Bioprev. Gostaria de consultar este artigo:",
      "",
      `Artigo: ${selectedProduct.name}`,
      `Quantidade: ${quantity}`,
      `Telefone para contacto: ${telephone.trim()}`,
      `Morada de entrega: ${address.trim()}`,
      city.trim() ? `Cidade: ${city.trim()}` : "",
      deliveryNotes.trim() ? `Notas de entrega: ${deliveryNotes.trim()}` : "",
      "",
      "Por favor, confirmem a disponibilidade, o preço e as condições de entrega.",
    ]
      .filter(Boolean)
      .join("\n");

    const whatsappUrl = `https://wa.me/244928737888?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
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
        <section className="relative overflow-hidden border-b border-[#e4e9ec] bg-[#f4f7f9]">
          <div className="absolute inset-y-0 right-0 hidden w-[38%] bg-[#e7f1f6] md:block" aria-hidden="true" />

          <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:py-9">
            <nav aria-label="Trilho de navegação" className="mb-5 flex items-center gap-2 text-sm text-[#64737d]">
              <Link href="/" className="transition-colors hover:text-[#007cc3]">Início</Link>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              <span className="font-semibold text-[#001d3d]" aria-current="page">Loja</span>
            </nav>

            <div className="space-y-5">
              <div className="flex items-center gap-3">
                  <span className="h-[3px] w-10 bg-[#f2c92f]" />
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#007cc3]">Bioprev Angola</p>
              </div>

              <div className="w-full">
                <label htmlFor="product-search" className="mb-3 block text-xs font-bold uppercase tracking-[0.15em] text-[#007cc3]">
                  Pesquisar no catálogo
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#71808a]" aria-hidden="true" />
                  <input
                    id="product-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Nome do artigo ou categoria"
                    className="min-h-14 w-full border border-[#c8d2da] bg-white pl-12 pr-12 text-sm text-[#001d3d] shadow-sm outline-none transition-colors placeholder:text-[#839099] focus:border-[#007cc3] focus:ring-2 focus:ring-[#007cc3]/15"
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
                <p className="mt-3 text-sm text-[#64737d]">Pesquise por nome ou categoria do artigo.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="artigos" className="scroll-mt-6 py-10 sm:py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-7 md:mb-9">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[#007cc3]">Catálogo de referência</p>
                <h2 className="text-2xl font-semibold tracking-tight text-[#001d3d] sm:text-3xl">Artigos em destaque</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64737d]">
                  Consulte a equipa para confirmar disponibilidade, preço e condições de entrega.
                </p>
              </div>
            </div>

            <div className="mb-7 flex flex-wrap gap-2" role="group" aria-label="Filtrar artigos por categoria">
              {["Todos", ...categories.map((category) => category.name)].map((category) => {
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveCategory(category)}
                    className={`min-h-10 border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007cc3] ${
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

            {catalogQuery.isPending ? (
              <div className="border border-[#dfe7eb] bg-[#f7f9fa] px-5 py-12 text-center text-sm text-[#64737d]">
                A carregar o catálogo…
              </div>
            ) : catalogQuery.error ? (
              <div className="border border-[#e9dba3] border-t-4 border-t-[#f2c92f] bg-[#fffdf5] px-5 py-8 text-center">
                <Package className="mx-auto h-8 w-8 text-[#007cc3]" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold text-[#001d3d]">O catálogo está temporariamente indisponível</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64737d]">
                  {catalogQuery.error instanceof StoreApiError
                    ? catalogQuery.error.message
                    : "Não foi possível carregar os artigos. Tente novamente mais tarde."}
                </p>
              </div>
            ) : visibleProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleProducts.map((product, index) => {
                  const Icon = productIcon(product);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => openProduct(product)}
                      aria-label={`Ver detalhes de ${product.name}`}
                      className="group flex min-h-[300px] flex-col border border-[#e1e7ea] border-t-4 border-t-[#f2c92f] bg-white p-5 text-left shadow-[0_2px_10px_rgba(0,29,61,0.035)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-[#c9dbe5] hover:shadow-[0_12px_28px_rgba(0,29,61,0.09)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007cc3] sm:p-6"
                      style={{ animationDelay: `${index * 45}ms` }}
                    >
                      <div className="mb-6 flex items-start justify-between gap-4">
                        <div className="flex h-[76px] w-[76px] items-center justify-center border border-[#d9e8ef] bg-[#eff6f9] text-[#007cc3] transition-colors group-hover:bg-[#e4f1f6]">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Icon className="h-10 w-10" strokeWidth={1.3} aria-hidden="true" />
                          )}
                        </div>
                        <span className="border border-[#d9e3e8] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64737d]">
                          {product.categoryName}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold leading-snug text-[#001d3d] group-hover:text-[#007cc3]">{product.name}</h3>
                      <p className="mt-2 flex-grow text-sm leading-6 text-[#687680]">{product.shortDescription}</p>
                      <div className="mt-5 flex items-end justify-between border-t border-[#e9eef0] pt-4">
                        <div>
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#829099]">Preço</span>
                          <span className="mt-1 block text-sm font-bold text-[#001d3d]">Sob consulta</span>
                        </div>
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-[#007cc3]">
                          Consultar
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : products.length === 0 ? (
              <div className="border border-[#dfe7eb] border-t-4 border-t-[#f2c92f] bg-[#f7f9fa] px-5 py-10 text-center sm:py-14">
                <Package className="mx-auto h-8 w-8 text-[#007cc3]" strokeWidth={1.5} aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold text-[#001d3d]">Ainda não há artigos publicados</h3>
                <p className="mt-2 text-sm text-[#687680]">Estamos a preparar o catálogo. Volte a consultar esta página em breve.</p>
              </div>
            ) : (
              <div className="border border-[#dfe7eb] border-t-4 border-t-[#f2c92f] bg-[#f7f9fa] px-5 py-10 text-center sm:py-14">
                <Search className="mx-auto h-8 w-8 text-[#007cc3]" strokeWidth={1.5} aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold text-[#001d3d]">Não encontrámos esse artigo</h3>
                <p className="mt-2 text-sm text-[#687680]">Experimente outro termo ou veja todas as categorias.</p>
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

            <div className="mt-7 flex items-start gap-3 border-l-4 border-[#f2c92f] bg-[#f4f7f9] px-4 py-4 sm:px-5">
              <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-[#007cc3]" strokeWidth={1.8} aria-hidden="true" />
              <p className="text-sm leading-6 text-[#4f5f69]">
                <span className="font-bold text-[#001d3d]">Antes de pedir:</span> o catálogo é apenas uma selecção de referência. A equipa confirma disponibilidade, preço e condições de entrega pelo WhatsApp.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#f4f7f9] py-10 sm:py-12">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#d5e4eb] bg-white text-[#007cc3]">
                <MapPin className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#001d3d]">Precisa de ajuda a escolher?</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-[#65747e]">
                  Fale com a equipa Bioprev para esclarecer dúvidas sobre os artigos e a entrega.
                </p>
              </div>
            </div>
            <a
              href="https://wa.me/244928737888"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-[#007cc3] px-5 text-sm font-bold text-[#007cc3] transition-colors hover:bg-[#007cc3] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#001d3d]"
            >
              Contactar a equipa
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <Footer />

      <Sheet
        open={Boolean(selectedProduct)}
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full max-w-[520px] overflow-y-auto border-l-4 border-l-[#f2c92f] bg-white p-0 sm:max-w-[520px]"
          aria-describedby="product-panel-description"
        >
          {selectedProduct && (
            <div className="flex min-h-full flex-col">
              {selectedProduct.imageUrl && (
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="max-h-64 w-full border-b border-[#e5ebee] bg-[#f4f7f9] object-contain" />
              )}
              <div className="border-b border-[#e5ebee] bg-[#f4f7f9] px-5 pb-5 pt-12 sm:px-8 sm:pt-14">
                <div className="mb-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#007cc3]">
                  <span className="h-[2px] w-6 bg-[#f2c92f]" />
                  {selectedProduct.categoryName}
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-[#d4e4ec] bg-white text-[#007cc3]">
                    {selectedProduct.imageUrl
                      ? <Package className="h-8 w-8" strokeWidth={1.35} aria-hidden="true" />
                      : (() => {
                          const Icon = productIcon(selectedProduct);
                          return <Icon className="h-9 w-9" strokeWidth={1.35} aria-hidden="true" />;
                        })()}
                  </div>
                  <div className="pr-7">
                    <SheetHeader className="space-y-2 text-left">
                      <SheetTitle className="text-2xl font-semibold leading-tight tracking-tight text-[#001d3d]">
                        {selectedProduct.name}
                      </SheetTitle>
                      <SheetDescription id="product-panel-description" className="text-sm leading-6 text-[#62727c]">
                        {selectedProduct.description}
                      </SheetDescription>
                    </SheetHeader>
                  </div>
                </div>
              </div>

              <div className="flex-grow px-5 py-6 sm:px-8">
                <div className="border-l-4 border-[#007cc3] bg-[#f4f7f9] px-4 py-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.11em] text-[#64737d]">
                    <Package className="h-4 w-4 text-[#007cc3]" aria-hidden="true" />
                    Detalhes do artigo
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#4f5f69]">{selectedProduct.description || selectedProduct.shortDescription}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-[#dfe7eb] pt-3">
                    <span className="text-sm text-[#64737d]">Preço</span>
                    <span className="text-sm font-bold text-[#001d3d]">Sob consulta</span>
                  </div>
                </div>

                <div className="mb-5 mt-7">
                  <h3 className="text-lg font-semibold text-[#001d3d]">Consultar este artigo</h3>
                  <p className="mt-1 text-sm leading-6 text-[#64737d]">
                    Indique os seus dados para preparar uma mensagem à equipa.
                  </p>
                </div>

                <form onSubmit={handleRequest} className="space-y-5">
                  <div>
                    <label htmlFor="request-quantity" className="text-sm font-semibold text-[#263b49]">
                      Quantidade <span className="text-[#007cc3]">*</span>
                    </label>
                    <input
                      id="request-quantity"
                      name="quantity"
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      className={inputClassName}
                    />
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
                    <label htmlFor="request-city" className="text-sm font-semibold text-[#263b49]">Cidade (opcional)</label>
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
                    <label htmlFor="request-notes" className="text-sm font-semibold text-[#263b49]">Notas de entrega (opcional)</label>
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

                  <div className="border border-[#e1e8ec] bg-[#f7f9fa] p-4">
                    <div className="flex gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#007cc3]" aria-hidden="true" />
                      <p className="text-xs leading-5 text-[#5c6c76]">
                        Disponibilidade, preço e entrega são confirmados pela equipa. Os dados indicados só serão incluídos numa mensagem de WhatsApp quando escolher continuar.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="flex min-h-12 w-full items-center justify-center gap-2 bg-[#007cc3] px-5 text-sm font-bold text-white transition-colors hover:bg-[#006aa8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#001d3d]"
                  >
                    Continuar pelo WhatsApp
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <p className="pb-2 text-center text-xs leading-5 text-[#74828b]">
                    O WhatsApp abre com a mensagem preenchida para rever e enviar.
                  </p>
                </form>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
