import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Redirect, Link } from "wouter";
import { useAuth, useClerk, useUser } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Boxes,
  Check,
  ImagePlus,
  LoaderCircle,
  LogOut,
  Package,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StoreCatalog, StoreCategory, StoreProduct } from "@shared/store";
import {
  storeApi,
  uploadProductImage,
  type AdminAccess,
  type StoreAdminConfig,
  type StoreApiError,
} from "@/lib/storeApi";

type ProductDraft = {
  name: string;
  slug: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  imagePublicId: string | null;
  isActive: boolean;
  sortOrder: number;
};

type CategoryDraft = {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

const fieldClass =
  "mt-1.5 min-h-11 w-full border border-[#cbd6dc] bg-white px-3 py-2.5 text-sm text-[#001d3d] outline-none placeholder:text-[#89969e] focus:border-[#007cc3] focus:ring-2 focus:ring-[#007cc3]/15";
const labelClass = "block text-sm font-semibold text-[#263b49]";
const actionClass =
  "inline-flex min-h-10 items-center justify-center gap-2 border border-[#007cc3] bg-[#007cc3] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#006ba9] disabled:cursor-not-allowed disabled:opacity-55";
const secondaryClass =
  "inline-flex min-h-10 items-center justify-center gap-2 border border-[#cbd6dc] bg-white px-4 py-2 text-sm font-semibold text-[#344754] transition-colors hover:border-[#007cc3] hover:text-[#007cc3] disabled:cursor-not-allowed disabled:opacity-55";

function apiError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function LoadingState() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm font-semibold text-[#50616c]">
      <LoaderCircle className="h-5 w-5 animate-spin text-[#007cc3]" />
      A verificar o acesso à loja…
    </div>
  );
}

function AccessMessage({ message }: { message: string }) {
  const { signOut } = useClerk();
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f9] px-4 py-12">
      <section className="w-full max-w-lg border border-[#e0e7eb] border-t-4 border-t-[#f2c92f] bg-white p-7 shadow-sm sm:p-9">
        <img src="/logo.svg" alt="Bioprev" className="mb-8 h-11 w-auto" />
        <div className="flex h-12 w-12 items-center justify-center border border-[#d6e7ef] bg-[#eff6f9] text-[#007cc3]">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-[#001d3d]">Acesso à administração</h1>
        <p className="mt-2 text-sm leading-6 text-[#5d6c75]">{message}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button type="button" className={secondaryClass} onClick={() => signOut({ redirectUrl: "/" })}>
            <LogOut className="h-4 w-4" /> Terminar sessão
          </button>
          <Link href="/" className={secondaryClass}>
            <ArrowLeft className="h-4 w-4" /> Voltar ao site
          </Link>
        </div>
      </section>
    </main>
  );
}

function AdminPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const accessQuery = useQuery({
    queryKey: ["store-admin", "access"],
    queryFn: () => storeApi<AdminAccess>("/api/admin/access"),
    enabled: isLoaded && Boolean(isSignedIn),
    retry: false,
  });

  if (!isLoaded) return <LoadingState />;
  if (!isSignedIn) return <Redirect to="/sign-in?redirect_url=%2Fadmin" />;
  if (accessQuery.isPending) return <LoadingState />;
  if (accessQuery.error) {
    return <AccessMessage message={apiError(accessQuery.error, "Não foi possível confirmar o acesso.")} />;
  }
  return <AdminWorkspace admin={accessQuery.data} />;
}

function AdminWorkspace({ admin }: { admin: AdminAccess }) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"products" | "categories">("products");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null);
  const [productFormError, setProductFormError] = useState("");
  const [productSaving, setProductSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [stagedImagePublicId, setStagedImagePublicId] = useState<string | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft | null>(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState("");

  const configQuery = useQuery({
    queryKey: ["store-admin", "config"],
    queryFn: () => storeApi<StoreAdminConfig>("/api/admin/config"),
    retry: false,
  });
  const catalogQuery = useQuery({
    queryKey: ["store-admin", "catalog"],
    queryFn: () => storeApi<StoreCatalog>("/api/admin/catalog"),
    retry: false,
  });

  const catalog = catalogQuery.data;
  const categories = catalog?.categories ?? [];
  const products = catalog?.products ?? [];
  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt");
    return products.filter((product) => {
      const matchesCategory = categoryFilter === "all" || product.categoryId === categoryFilter;
      const matchesSearch =
        !normalizedSearch ||
        `${product.name} ${product.categoryName} ${product.shortDescription} ${product.slug}`
          .toLocaleLowerCase("pt")
          .includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, products, search]);

  const refreshCatalog = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["store-admin", "catalog"] }),
      queryClient.invalidateQueries({ queryKey: ["store", "catalog"] }),
    ]);
  };

  const clearStagedImage = async () => {
    if (!stagedImagePublicId) return;
    try {
      await storeApi("/api/admin/media", {
        method: "DELETE",
        body: JSON.stringify({ publicId: stagedImagePublicId }),
      });
    } catch {
      // A failed cleanup does not prevent the administrator from continuing.
    }
    setStagedImagePublicId(null);
  };

  const openNewProduct = () => {
    setEditingProductId(null);
    setProductDraft({
      name: "",
      slug: "",
      categoryId: categories.find((category) => category.isActive)?.id ?? "",
      shortDescription: "",
      description: "",
      imagePublicId: null,
      isActive: true,
      sortOrder: 0,
    });
    setImagePreview(null);
    setProductFormError("");
    setProductDialogOpen(true);
  };

  const openEditProduct = (product: StoreProduct) => {
    setEditingProductId(product.id);
    setProductDraft({
      name: product.name,
      slug: product.slug,
      categoryId: product.categoryId,
      shortDescription: product.shortDescription,
      description: product.description,
      imagePublicId: product.imagePublicId,
      isActive: product.isActive,
      sortOrder: product.sortOrder,
    });
    setImagePreview(product.imageUrl);
    setProductFormError("");
    setProductDialogOpen(true);
  };

  const closeProductDialog = async () => {
    await clearStagedImage();
    setProductDialogOpen(false);
    setProductDraft(null);
    setImagePreview(null);
    setProductFormError("");
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productDraft) return;
    setProductSaving(true);
    setProductFormError("");
    try {
      const result = await storeApi<StoreProduct & { imageCleanupWarning?: boolean }>(
        editingProductId ? `/api/admin/products/${editingProductId}` : "/api/admin/products",
        {
          method: editingProductId ? "PUT" : "POST",
          body: JSON.stringify(productDraft),
        },
      );
      const uploadedImageWasSaved = stagedImagePublicId === result.imagePublicId;
      if (stagedImagePublicId && !uploadedImageWasSaved) await clearStagedImage();
      else setStagedImagePublicId(null);
      setProductDialogOpen(false);
      setProductDraft(null);
      setImagePreview(null);
      setNotice({
        kind: "success",
        text: result.imageCleanupWarning
          ? "Artigo guardado. Uma imagem antiga não foi removida da Cloudinary."
          : editingProductId ? "Artigo actualizado com sucesso." : "Artigo adicionado ao catálogo.",
      });
      await refreshCatalog();
    } catch (error) {
      setProductFormError(apiError(error, "Não foi possível guardar o artigo."));
    } finally {
      setProductSaving(false);
    }
  };

  const handleImageSelected = async (file?: File) => {
    if (!file || !productDraft) return;
    setImageUploading(true);
    setProductFormError("");
    try {
      const uploaded = await uploadProductImage(file);
      const previousStagedId = stagedImagePublicId;
      setProductDraft((current) => current ? { ...current, imagePublicId: uploaded.publicId } : current);
      setImagePreview(uploaded.imageUrl);
      setStagedImagePublicId(uploaded.publicId);
      if (previousStagedId) {
        try {
          await storeApi("/api/admin/media", {
            method: "DELETE",
            body: JSON.stringify({ publicId: previousStagedId }),
          });
        } catch {
          // Keep the newer image selected; a stale upload can be cleaned up in Cloudinary.
        }
      }
    } catch (error) {
      setProductFormError(apiError(error, "Não foi possível enviar a imagem."));
    } finally {
      setImageUploading(false);
    }
  };

  const removeProductImage = async () => {
    setProductDraft((current) => current ? { ...current, imagePublicId: null } : current);
    setImagePreview(null);
    await clearStagedImage();
  };

  const deleteProductById = async (product: StoreProduct) => {
    if (!window.confirm(`Apagar o artigo “${product.name}”? Esta acção não pode ser desfeita.`)) return;
    try {
      const result = await storeApi<{ deleted: boolean; imageCleanupWarning?: boolean }>(
        `/api/admin/products/${product.id}`,
        { method: "DELETE" },
      );
      setNotice({
        kind: result.imageCleanupWarning ? "error" : "success",
        text: result.imageCleanupWarning
          ? "Artigo apagado, mas não foi possível remover a imagem da Cloudinary."
          : "Artigo apagado.",
      });
      await refreshCatalog();
    } catch (error) {
      setNotice({ kind: "error", text: apiError(error, "Não foi possível apagar o artigo.") });
    }
  };

  const openNewCategory = () => {
    setEditingCategoryId(null);
    setCategoryDraft({ name: "", slug: "", description: "", isActive: true, sortOrder: 0 });
    setCategoryFormError("");
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (category: StoreCategory) => {
    setEditingCategoryId(category.id);
    setCategoryDraft({
      name: category.name,
      slug: category.slug,
      description: category.description,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    });
    setCategoryFormError("");
    setCategoryDialogOpen(true);
  };

  const saveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!categoryDraft) return;
    setCategorySaving(true);
    setCategoryFormError("");
    try {
      await storeApi<StoreCategory>(
        editingCategoryId ? `/api/admin/categories/${editingCategoryId}` : "/api/admin/categories",
        {
          method: editingCategoryId ? "PUT" : "POST",
          body: JSON.stringify(categoryDraft),
        },
      );
      setCategoryDialogOpen(false);
      setCategoryDraft(null);
      setNotice({ kind: "success", text: editingCategoryId ? "Categoria actualizada." : "Categoria criada." });
      await refreshCatalog();
    } catch (error) {
      setCategoryFormError(apiError(error, "Não foi possível guardar a categoria."));
    } finally {
      setCategorySaving(false);
    }
  };

  const deleteCategoryById = async (category: StoreCategory) => {
    if (category.productCount > 0) return;
    if (!window.confirm(`Apagar a categoria “${category.name}”? Esta acção não pode ser desfeita.`)) return;
    try {
      await storeApi(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      setNotice({ kind: "success", text: "Categoria apagada." });
      await refreshCatalog();
    } catch (error) {
      setNotice({ kind: "error", text: apiError(error, "Não foi possível apagar a categoria.") });
    }
  };

  const adminEmail = user?.primaryEmailAddress?.emailAddress ?? admin.email;
  const activeProductCount = products.filter((product) => product.isActive).length;
  const activeCategoryCount = categories.filter((category) => category.isActive).length;
  const catalogError = catalogQuery.error as StoreApiError | null;
  const needsTursoSetup = Boolean(
    configQuery.data &&
      (!configQuery.data.tursoConfigured ||
        catalogError?.code === "STORE_CONFIGURATION_REQUIRED" ||
        catalogError?.code === "STORE_SETUP_REQUIRED"),
  );

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-[#253944]">
      <header className="border-b border-[#e1e8ec] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Voltar ao site Bioprev">
            <img src="/logo.svg" alt="Bioprev" className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[#61717b] sm:inline">{adminEmail}</span>
            <Link href="/" className={secondaryClass}><ArrowLeft className="h-4 w-4" /> Ver site</Link>
            <button type="button" className={secondaryClass} onClick={() => signOut({ redirectUrl: "/" })} aria-label="Terminar sessão">
              <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#007cc3]">
              <span className="h-[3px] w-8 bg-[#f2c92f]" /> Gestão da loja
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#001d3d] sm:text-4xl">Área de administração</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#62727c]">
              Organize os artigos, as categorias e as imagens que aparecem no catálogo público.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start border border-[#cce4d7] bg-[#f1f8f4] px-3 py-2 text-xs font-semibold text-[#276445] md:self-auto">
            <ShieldCheck className="h-4 w-4" /> Sessão autorizada
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className={`mb-5 flex items-start justify-between gap-4 border px-4 py-3 text-sm ${
              notice.kind === "success"
                ? "border-[#cce4d7] bg-[#f1f8f4] text-[#276445]"
                : "border-[#f0d3cc] bg-[#fff7f5] text-[#914533]"
            }`}
          >
            {notice.text}
            <button type="button" onClick={() => setNotice(null)} aria-label="Fechar mensagem"><X className="h-4 w-4" /></button>
          </div>
        )}

        {needsTursoSetup && (
          <section className="mb-6 border border-[#e9dba3] border-l-4 border-l-[#f2c92f] bg-[#fffdf5] p-5 sm:p-6">
            <h2 className="font-semibold text-[#001d3d]">A ligação ao Turso ainda precisa de configuração</h2>
            <p className="mt-1 text-sm leading-6 text-[#5d6c75]">
              Os produtos e categorias só ficam disponíveis depois de adicionar as credenciais do Turso e inicializar as tabelas.
            </p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[#4e5f69]">
              <li>Adicione <code className="font-semibold">TURSO_DATABASE_URL</code> e <code className="font-semibold">TURSO_AUTH_TOKEN</code> aos Secrets do projecto.</li>
              <li>Execute <code className="font-semibold">npm run db:store:setup</code> uma vez para criar as tabelas e os artigos iniciais.</li>
              <li>Actualize esta página para carregar o catálogo.</li>
            </ol>
          </section>
        )}
        {configQuery.data && !configQuery.data.cloudinaryConfigured && (
          <section className="mb-6 border border-[#d8e4eb] border-l-4 border-l-[#007cc3] bg-white p-5">
            <h2 className="font-semibold text-[#001d3d]">As imagens ainda não estão ligadas</h2>
            <p className="mt-1 text-sm leading-6 text-[#5d6c75]">
              Para enviar imagens directamente para a Cloudinary, adicione <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code> e <code>CLOUDINARY_API_SECRET</code> aos Secrets.
            </p>
          </section>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard icon={<Package className="h-5 w-5" />} label="Artigos no catálogo" value={catalogQuery.data ? String(products.length) : "—"} />
          <StatCard icon={<Check className="h-5 w-5" />} label="Artigos publicados" value={catalogQuery.data ? String(activeProductCount) : "—"} />
          <StatCard icon={<Boxes className="h-5 w-5" />} label="Categorias activas" value={catalogQuery.data ? String(activeCategoryCount) : "—"} />
        </section>

        <section className="border border-[#e0e7eb] bg-white shadow-[0_2px_12px_rgba(0,29,61,0.035)]">
          <div className="flex flex-col gap-4 border-b border-[#e4eaed] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex gap-1" role="tablist" aria-label="Gestão do catálogo">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "products"}
                onClick={() => setActiveTab("products")}
                className={`min-h-10 border-b-2 px-4 text-sm font-semibold ${
                  activeTab === "products" ? "border-[#007cc3] text-[#007cc3]" : "border-transparent text-[#687780] hover:text-[#001d3d]"
                }`}
              >
                Artigos
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "categories"}
                onClick={() => setActiveTab("categories")}
                className={`min-h-10 border-b-2 px-4 text-sm font-semibold ${
                  activeTab === "categories" ? "border-[#007cc3] text-[#007cc3]" : "border-transparent text-[#687780] hover:text-[#001d3d]"
                }`}
              >
                Categorias
              </button>
            </div>
            {activeTab === "products" ? (
              <button type="button" className={actionClass} onClick={openNewProduct} disabled={!catalogQuery.data || categories.length === 0}>
                <Plus className="h-4 w-4" /> Adicionar artigo
              </button>
            ) : (
              <button type="button" className={actionClass} onClick={openNewCategory} disabled={!catalogQuery.data}>
                <Plus className="h-4 w-4" /> Adicionar categoria
              </button>
            )}
          </div>

          {catalogQuery.isPending ? (
            <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-[#60717b]">
              <LoaderCircle className="h-5 w-5 animate-spin text-[#007cc3]" /> A carregar o catálogo…
            </div>
          ) : catalogQuery.error ? (
            <div className="p-6 text-sm leading-6 text-[#914533]">
              <h2 className="font-semibold text-[#001d3d]">Não foi possível carregar os dados da loja</h2>
              <p className="mt-1">{apiError(catalogQuery.error, "Verifique a ligação à base de dados.")}</p>
              <button type="button" className={`${secondaryClass} mt-4`} onClick={() => catalogQuery.refetch()}>Tentar novamente</button>
            </div>
          ) : activeTab === "products" ? (
            <>
              <div className="grid gap-3 border-b border-[#e7ecef] p-4 sm:grid-cols-[minmax(220px,1fr)_220px] sm:px-6">
                <label className="relative block">
                  <span className="sr-only">Pesquisar artigos</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#87939a]" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar artigos…" className={`${fieldClass} mt-0 pl-10`} />
                </label>
                <label>
                  <span className="sr-only">Filtrar por categoria</span>
                  <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={`${fieldClass} mt-0`}>
                    <option value="all">Todas as categorias</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
              </div>
              {visibleProducts.length ? (
                <div className="divide-y divide-[#e8edef]">
                  {visibleProducts.map((product) => (
                    <ProductRow key={product.id} product={product} onEdit={() => openEditProduct(product)} onDelete={() => void deleteProductById(product)} />
                  ))}
                </div>
              ) : (
                <div className="px-6 py-14 text-center">
                  <Package className="mx-auto h-9 w-9 text-[#94a2aa]" />
                  <h2 className="mt-3 font-semibold text-[#001d3d]">{products.length ? "Nenhum artigo encontrado" : "Ainda não há artigos"}</h2>
                  <p className="mt-1 text-sm text-[#697780]">{products.length ? "Altere a pesquisa ou o filtro de categoria." : "Adicione o primeiro artigo para começar o catálogo."}</p>
                </div>
              )}
            </>
          ) : (
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              {categories.length ? categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onEdit={() => openEditCategory(category)}
                  onDelete={() => void deleteCategoryById(category)}
                />
              )) : (
                <div className="col-span-full py-12 text-center text-sm text-[#697780]">Ainda não há categorias. Crie uma para começar.</div>
              )}
            </div>
          )}
        </section>
      </main>

      <Dialog open={productDialogOpen} onOpenChange={(open) => { if (!open) void closeProductDialog(); }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-t-4 border-t-[#f2c92f] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#001d3d]">{editingProductId ? "Editar artigo" : "Adicionar artigo"}</DialogTitle>
            <DialogDescription>Preencha os dados que serão usados no catálogo público da loja.</DialogDescription>
          </DialogHeader>
          {productDraft && (
            <form onSubmit={saveProduct} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Nome do artigo *
                  <input required maxLength={120} value={productDraft.name} onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })} className={fieldClass} />
                </label>
                <label className={labelClass}>
                  Categoria *
                  <select required value={productDraft.categoryId} onChange={(event) => setProductDraft({ ...productDraft, categoryId: event.target.value })} className={fieldClass}>
                    <option value="" disabled>Seleccione uma categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}{category.isActive ? "" : " (inactiva)"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className={labelClass}>
                Endereço do artigo (slug)
                <input maxLength={140} value={productDraft.slug} onChange={(event) => setProductDraft({ ...productDraft, slug: event.target.value })} placeholder="Gerado automaticamente se ficar vazio" className={fieldClass} />
              </label>
              <label className={labelClass}>
                Descrição curta *
                <textarea required minLength={5} maxLength={220} rows={2} value={productDraft.shortDescription} onChange={(event) => setProductDraft({ ...productDraft, shortDescription: event.target.value })} className={`${fieldClass} resize-y`} />
              </label>
              <label className={labelClass}>
                Descrição completa
                <textarea maxLength={3000} rows={4} value={productDraft.description} onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })} className={`${fieldClass} resize-y`} />
              </label>

              <div>
                <span className={labelClass}>Imagem do artigo</span>
                <div className="mt-2 flex flex-col gap-4 border border-dashed border-[#cbd6dc] bg-[#f8fafb] p-4 sm:flex-row sm:items-center">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Pré-visualização do artigo" className="h-28 w-28 shrink-0 border border-[#dce4e8] bg-white object-cover" />
                  ) : (
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center border border-[#dce4e8] bg-white text-[#96a4ac]">
                      <ImagePlus className="h-8 w-8" />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <label className={`${secondaryClass} cursor-pointer`}>
                      {imageUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {imageUploading ? "A enviar…" : "Escolher imagem"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="sr-only"
                        disabled={imageUploading}
                        onChange={(event) => { void handleImageSelected(event.target.files?.[0]); event.target.value = ""; }}
                      />
                    </label>
                    {imagePreview && <button type="button" className={secondaryClass} onClick={() => void removeProductImage()}>Remover imagem</button>}
                    <p className="basis-full text-xs text-[#687780]">JPG, PNG, WebP ou AVIF; máximo 5 MB. O ficheiro é enviado directamente para a Cloudinary através do servidor.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Ordem no catálogo
                  <input type="number" min={0} max={10000} step={1} value={productDraft.sortOrder} onChange={(event) => setProductDraft({ ...productDraft, sortOrder: Number(event.target.value) })} className={fieldClass} />
                </label>
                <label className="flex min-h-11 items-center gap-3 self-end border border-[#dfe7eb] px-3 py-2.5 text-sm font-semibold text-[#344754]">
                  <input type="checkbox" checked={productDraft.isActive} onChange={(event) => setProductDraft({ ...productDraft, isActive: event.target.checked })} className="h-4 w-4 accent-[#007cc3]" />
                  Publicar no catálogo
                </label>
              </div>

              {productFormError && <p role="alert" className="border border-[#f0d3cc] bg-[#fff7f5] px-3 py-2 text-sm text-[#914533]">{productFormError}</p>}
              <div className="flex flex-wrap justify-end gap-3 border-t border-[#e6ecef] pt-4">
                <button type="button" className={secondaryClass} onClick={() => void closeProductDialog()} disabled={productSaving}>Cancelar</button>
                <button type="submit" className={actionClass} disabled={productSaving || imageUploading || !categories.some((category) => category.isActive)}>
                  {productSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {productSaving ? "A guardar…" : "Guardar artigo"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialogOpen} onOpenChange={(open) => { if (!open) { setCategoryDialogOpen(false); setCategoryDraft(null); } }}>
        <DialogContent className="border-t-4 border-t-[#f2c92f] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#001d3d]">{editingCategoryId ? "Editar categoria" : "Adicionar categoria"}</DialogTitle>
            <DialogDescription>As categorias activas ficam disponíveis no catálogo público.</DialogDescription>
          </DialogHeader>
          {categoryDraft && (
            <form onSubmit={saveCategory} className="space-y-4">
              <label className={labelClass}>
                Nome da categoria *
                <input required minLength={2} maxLength={80} value={categoryDraft.name} onChange={(event) => setCategoryDraft({ ...categoryDraft, name: event.target.value })} className={fieldClass} />
              </label>
              <label className={labelClass}>
                Endereço da categoria (slug)
                <input maxLength={100} value={categoryDraft.slug} onChange={(event) => setCategoryDraft({ ...categoryDraft, slug: event.target.value })} placeholder="Gerado automaticamente se ficar vazio" className={fieldClass} />
              </label>
              <label className={labelClass}>
                Descrição
                <textarea maxLength={300} rows={3} value={categoryDraft.description} onChange={(event) => setCategoryDraft({ ...categoryDraft, description: event.target.value })} className={`${fieldClass} resize-y`} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Ordem de apresentação
                  <input type="number" min={0} max={10000} value={categoryDraft.sortOrder} onChange={(event) => setCategoryDraft({ ...categoryDraft, sortOrder: Number(event.target.value) })} className={fieldClass} />
                </label>
                <label className="flex min-h-11 items-center gap-3 self-end border border-[#dfe7eb] px-3 py-2.5 text-sm font-semibold text-[#344754]">
                  <input type="checkbox" checked={categoryDraft.isActive} onChange={(event) => setCategoryDraft({ ...categoryDraft, isActive: event.target.checked })} className="h-4 w-4 accent-[#007cc3]" />
                  Activa
                </label>
              </div>
              {categoryFormError && <p role="alert" className="border border-[#f0d3cc] bg-[#fff7f5] px-3 py-2 text-sm text-[#914533]">{categoryFormError}</p>}
              <div className="flex justify-end gap-3 border-t border-[#e6ecef] pt-4">
                <button type="button" className={secondaryClass} onClick={() => { setCategoryDialogOpen(false); setCategoryDraft(null); }}>Cancelar</button>
                <button type="submit" className={actionClass} disabled={categorySaving}>
                  {categorySaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {categorySaving ? "A guardar…" : "Guardar categoria"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 border border-[#e0e7eb] bg-white px-5 py-4">
      <div className="flex h-11 w-11 items-center justify-center border border-[#dce9ef] bg-[#f1f7fa] text-[#007cc3]">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#718089]">{label}</p>
        <p className="mt-1 text-2xl font-semibold leading-none text-[#001d3d]">{value}</p>
      </div>
    </div>
  );
}

function ProductRow({ product, onEdit, onDelete }: { product: StoreProduct; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
      {product.imageUrl ? (
        <img src={product.imageUrl} alt="" className="h-16 w-16 shrink-0 border border-[#e0e7eb] bg-[#f4f7f9] object-cover" />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-[#dce9ef] bg-[#f1f7fa] text-[#007cc3]">
          <Package className="h-7 w-7" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-[#001d3d]">{product.name}</h3>
          <span className={`border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
            product.isActive ? "border-[#cce4d7] bg-[#f1f8f4] text-[#276445]" : "border-[#dfe5e8] bg-[#f5f7f8] text-[#697780]"
          }`}>{product.isActive ? "Publicado" : "Rascunho"}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#62727c]">{product.shortDescription}</p>
        <p className="mt-2 text-xs font-semibold text-[#007cc3]">{product.categoryName}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" className={secondaryClass} onClick={onEdit} aria-label={`Editar ${product.name}`}><Pencil className="h-4 w-4" /> Editar</button>
        <button type="button" className="inline-flex min-h-10 items-center justify-center border border-[#e7d2cf] px-3 text-[#9c4e40] transition-colors hover:bg-[#fff7f5]" onClick={onDelete} aria-label={`Apagar ${product.name}`}><Trash2 className="h-4 w-4" /></button>
      </div>
    </article>
  );
}

function CategoryCard({ category, onEdit, onDelete }: { category: StoreCategory; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="flex min-h-48 flex-col border border-[#e0e7eb] border-t-4 border-t-[#f2c92f] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#001d3d]">{category.name}</h3>
          <p className="mt-1 text-xs text-[#77858d]">/{category.slug}</p>
        </div>
        <span className={`border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
          category.isActive ? "border-[#cce4d7] bg-[#f1f8f4] text-[#276445]" : "border-[#dfe5e8] bg-[#f5f7f8] text-[#697780]"
        }`}>{category.isActive ? "Activa" : "Inactiva"}</span>
      </div>
      <p className="mt-3 flex-1 text-sm leading-5 text-[#65747e]">{category.description || "Sem descrição."}</p>
      <div className="mt-4 flex items-center justify-between border-t border-[#e8edef] pt-3">
        <span className="text-xs text-[#687780]">{category.productCount} {category.productCount === 1 ? "artigo" : "artigos"}</span>
        <div className="flex gap-2">
          <button type="button" className={secondaryClass} onClick={onEdit} aria-label={`Editar ${category.name}`}><Pencil className="h-4 w-4" /></button>
          <button
            type="button"
            disabled={category.productCount > 0}
            title={category.productCount ? "Mova ou apague os artigos antes de remover a categoria." : "Apagar categoria"}
            className="inline-flex min-h-10 items-center justify-center border border-[#e7d2cf] px-3 text-[#9c4e40] transition-colors hover:bg-[#fff7f5] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={onDelete}
            aria-label={`Apagar ${category.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default AdminPage;
