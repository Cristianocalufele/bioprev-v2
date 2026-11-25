import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Redirect, Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  Check,
  ClipboardList,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  Package,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
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
import {
  orderSources,
  orderStatuses,
  type StoreCatalog,
  type StoreCategory,
  type StoreOrder,
  type StoreOrderSource,
  type StoreOrderStatus,
  type StoreProduct,
} from "@shared/store";
import {
  getAdminToken,
  setAdminToken,
  storeApi,
  uploadProductImage,
  type AdminAccess,
  type AdminAuthStatus,
  type StoreAdminConfig,
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

type OrderDraft = {
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
};

type ConfirmTarget =
  | { kind: "product"; item: StoreProduct }
  | { kind: "category"; item: StoreCategory }
  | { kind: "order"; item: StoreOrder }
  | null;

const fieldClass =
  "mt-1.5 min-h-11 w-full border border-[#cbd6dc] bg-white px-3 py-2.5 text-sm text-[#001d3d] outline-none placeholder:text-[#89969e] focus:border-[#007cc3] focus:ring-2 focus:ring-[#007cc3]/15";
const labelClass = "block text-sm font-semibold text-[#263b49]";
const actionClass =
  "inline-flex min-h-10 items-center justify-center gap-2 border border-[#007cc3] bg-[#007cc3] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#006ba9] disabled:cursor-not-allowed disabled:opacity-55";
const secondaryClass =
  "inline-flex min-h-10 items-center justify-center gap-2 border border-[#cbd6dc] bg-white px-4 py-2 text-sm font-semibold text-[#344754] transition-colors hover:border-[#007cc3] hover:text-[#007cc3] disabled:cursor-not-allowed disabled:opacity-55";

const orderStatusLabel: Record<StoreOrderStatus, string> = {
  novo: "Novo",
  em_contacto: "Em contacto",
  confirmado: "Confirmado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const orderStatusBadgeClass: Record<StoreOrderStatus, string> = {
  novo: "border-[#e9dba3] bg-[#fffdf5] text-[#8a6500]",
  em_contacto: "border-[#c8dfec] bg-[#eff6fa] text-[#005f96]",
  confirmado: "border-[#cce4d7] bg-[#f1f8f4] text-[#276445]",
  entregue: "border-[#bfe0ce] bg-[#e9f5ee] text-[#1e573b]",
  cancelado: "border-[#f0d3cc] bg-[#fff7f5] text-[#914533]",
};

const orderSourceLabel: Record<StoreOrderSource, string> = {
  loja_whatsapp: "Loja → WhatsApp",
  whatsapp_direto: "WhatsApp directo",
  admin: "Registo manual",
};

function apiError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-AO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function whatsappHrefForOrder(order: StoreOrder): string {
  const digits = order.telephone.replace(/\D/g, "");
  const target = digits.length >= 9 ? (digits.startsWith("244") ? digits : `244${digits}`) : "244928737888";
  const text = `Olá${order.customerName ? ` ${order.customerName}` : ""}, aqui é a Bioprev Angola sobre o seu pedido ${order.reference} (${order.productName} x${order.quantity}).`;
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm font-semibold text-[#50616c]">
      <LoaderCircle className="h-5 w-5 animate-spin text-[#007cc3]" />
      A verificar o acesso à loja…
    </div>
  );
}

export function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const authStatusQuery = useQuery({
    queryKey: ["store-admin", "auth-status"],
    queryFn: () => storeApi<AdminAuthStatus>("/api/admin/auth/status"),
    retry: false,
  });

  if (getAdminToken()) {
    return <Redirect to="/admin" />;
  }

  if (authStatusQuery.isPending) {
    return <LoadingState />;
  }

  const needsSetup = Boolean(authStatusQuery.data?.needsSetup);
  const usingSecretEnv = Boolean(authStatusQuery.data?.usingSecretEnv);

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    if (needsSetup && passcode !== confirmPasscode) {
      setAuthError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = needsSetup ? "/api/admin/auth/setup" : "/api/admin/auth/login";
      const result = await storeApi<{ token: string; email: string }>(endpoint, {
        method: "POST",
        body: JSON.stringify({ passcode }),
      });
      setAdminToken(result.token);
      setPasscode("");
      setConfirmPasscode("");
      await queryClient.invalidateQueries({ queryKey: ["store-admin"] });
      setLocation("/admin");
    } catch (error) {
      setAuthError(apiError(error, "Não foi possível validar a senha."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f9] px-4 py-12">
      <section className="w-full max-w-md border border-[#e0e7eb] border-t-4 border-t-[#f2c92f] bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-7 flex items-center justify-between gap-4">
          <img src="/logo.svg" alt="Bioprev" className="h-11 w-auto" />
          <span className="border border-[#d9e5ec] bg-[#f4f8fa] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#007cc3]">
            Loja
          </span>
        </div>

        <div className="flex h-12 w-12 items-center justify-center border border-[#d6e7ef] bg-[#eff6f9] text-[#007cc3]">
          <KeyRound className="h-6 w-6" />
        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-[#007cc3]">
          Área reservada da loja
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[#001d3d]">
          {needsSetup ? "Definir senha de acesso" : "Entrar na administração"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#5d6c75]">
          {usingSecretEnv
            ? "Introduza a senha configurada nos Secrets do projecto (ADMIN_PASSCODE ou ADMIN_PASSWORD) para gerir artigos e pedidos."
            : needsSetup
              ? "A variável ADMIN_PASSCODE (ou ADMIN_PASSWORD) ainda não está definida nos Secrets. Defina uma senha inicial abaixo para aceder já à loja, ou adicione a variável nos Secrets."
              : "Introduza a senha de administrador para gerir os artigos, categorias e pedidos da loja."}
        </p>

        {authStatusQuery.error && (
          <p role="alert" className="mt-4 border border-[#f0d3cc] bg-[#fff7f5] px-3 py-2 text-sm text-[#914533]">
            {apiError(authStatusQuery.error, "Não foi possível verificar o estado da autenticação.")}
          </p>
        )}

        <form onSubmit={handleAuthSubmit} className="mt-6 space-y-4">
          <label className={labelClass}>
            {needsSetup ? "Nova senha (mín. 6 caracteres)" : "Senha de acesso"}
            <div className="relative">
              <input
                type={showPasscode ? "text" : "password"}
                required
                minLength={needsSetup ? 6 : 1}
                autoComplete={needsSetup ? "new-password" : "current-password"}
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                placeholder="Introduza a senha"
                className={`${fieldClass} pr-11`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPasscode((v) => !v)}
                aria-label={showPasscode ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-2.5 top-[calc(50%+3px)] flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#6b7b85] hover:text-[#001d3d]"
              >
                {showPasscode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {needsSetup && (
            <label className={labelClass}>
              Confirmar senha
              <input
                type={showPasscode ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPasscode}
                onChange={(event) => setConfirmPasscode(event.target.value)}
                placeholder="Repita a senha"
                className={fieldClass}
              />
            </label>
          )}

          {authError && (
            <p role="alert" className="border border-[#f0d3cc] bg-[#fff7f5] px-3 py-2 text-sm text-[#914533]">
              {authError}
            </p>
          )}

          <button type="submit" className={`${actionClass} w-full`} disabled={submitting}>
            {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {needsSetup ? "Guardar senha e entrar" : "Entrar na loja"}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-[#e8edef] pt-5">
          <Link href="/loja" className={secondaryClass}>
            <ShoppingBag className="h-4 w-4" /> Ver loja
          </Link>
          <Link href="/" className={secondaryClass}>
            <ArrowLeft className="h-4 w-4" /> Voltar ao site
          </Link>
        </div>
      </section>
    </main>
  );
}

export function AdminPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const token = getAdminToken();

  const accessQuery = useQuery({
    queryKey: ["store-admin", "access", token],
    queryFn: () => storeApi<AdminAccess>("/api/admin/access"),
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    if (token && accessQuery.isError) {
      setAdminToken(null);
      queryClient.removeQueries({ queryKey: ["store-admin"] });
      setLocation("/admin/login");
    }
  }, [accessQuery.isError, queryClient, setLocation, token]);

  if (!token) {
    return <Redirect to="/admin/login" />;
  }

  if (accessQuery.isPending) {
    return <LoadingState />;
  }

  if (accessQuery.isError || !accessQuery.data) {
    return <Redirect to="/admin/login" />;
  }

  const handleSignOut = () => {
    setAdminToken(null);
    queryClient.removeQueries({ queryKey: ["store-admin"] });
    setLocation("/admin/login");
  };

  return <AdminWorkspace adminEmail={accessQuery.data.email} onSignOut={handleSignOut} />;
}

function AdminWorkspace({ adminEmail, onSignOut }: { adminEmail: string; onSignOut: () => void }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "orders">("products");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
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

  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderFormError, setOrderFormError] = useState("");

  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const [confirmDeleting, setConfirmDeleting] = useState(false);

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
  const ordersQuery = useQuery({
    queryKey: ["store-admin", "orders"],
    queryFn: () => storeApi<StoreOrder[]>("/api/admin/orders"),
    retry: false,
  });

  const catalog = catalogQuery.data;
  const categories = catalog?.categories ?? [];
  const products = catalog?.products ?? [];
  const orders = ordersQuery.data ?? [];

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

  const visibleOrders = useMemo(() => {
    const normalizedSearch = orderSearch.trim().toLocaleLowerCase("pt");
    return orders.filter((order) => {
      const matchesStatus = orderStatusFilter === "all" || order.status === orderStatusFilter;
      const matchesSearch =
        !normalizedSearch ||
        `${order.reference} ${order.productName} ${order.customerName} ${order.telephone} ${order.address} ${order.city}`
          .toLocaleLowerCase("pt")
          .includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }, [orderSearch, orderStatusFilter, orders]);

  const refreshCatalog = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["store-admin", "catalog"] }),
      queryClient.invalidateQueries({ queryKey: ["store", "catalog"] }),
    ]);
  };

  const refreshOrders = async () => {
    await queryClient.invalidateQueries({ queryKey: ["store-admin", "orders"] });
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
          : editingProductId ? "Artigo actualizado com sucesso." : "Artigo adicionado ao catálogo da loja.",
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
          // Keep the newer image selected.
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

  const openNewOrder = () => {
    const firstProduct = products[0];
    setEditingOrderId(null);
    setOrderDraft({
      productId: firstProduct?.id ?? null,
      productName: firstProduct?.name ?? "",
      quantity: 1,
      customerName: "",
      telephone: "",
      address: "",
      city: "",
      deliveryNotes: "",
      status: "novo",
      source: "whatsapp_direto",
      adminNotes: "",
    });
    setOrderFormError("");
    setOrderDialogOpen(true);
  };

  const openEditOrder = (order: StoreOrder) => {
    setEditingOrderId(order.id);
    setOrderDraft({
      productId: order.productId,
      productName: order.productName,
      quantity: order.quantity,
      customerName: order.customerName,
      telephone: order.telephone,
      address: order.address,
      city: order.city,
      deliveryNotes: order.deliveryNotes,
      status: order.status,
      source: order.source,
      adminNotes: order.adminNotes,
    });
    setOrderFormError("");
    setOrderDialogOpen(true);
  };

  const saveOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orderDraft) return;
    setOrderSaving(true);
    setOrderFormError("");
    try {
      await storeApi<StoreOrder>(
        editingOrderId ? `/api/admin/orders/${editingOrderId}` : "/api/admin/orders",
        {
          method: editingOrderId ? "PATCH" : "POST",
          body: JSON.stringify(orderDraft),
        },
      );
      setOrderDialogOpen(false);
      setOrderDraft(null);
      setNotice({
        kind: "success",
        text: editingOrderId ? "Pedido actualizado com sucesso." : "Pedido registado na gestão da loja.",
      });
      await refreshOrders();
    } catch (error) {
      setOrderFormError(apiError(error, "Não foi possível guardar o pedido."));
    } finally {
      setOrderSaving(false);
    }
  };

  const updateOrderStatus = async (order: StoreOrder, status: StoreOrderStatus) => {
    try {
      await storeApi<StoreOrder>(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setNotice({ kind: "success", text: `Estado do pedido ${order.reference} alterado para “${orderStatusLabel[status]}”.` });
      await refreshOrders();
    } catch (error) {
      setNotice({ kind: "error", text: apiError(error, "Não foi possível actualizar o estado do pedido.") });
    }
  };

  const executeConfirmDelete = async () => {
    if (!confirmTarget || confirmDeleting) return;
    setConfirmDeleting(true);
    try {
      if (confirmTarget.kind === "product") {
        const result = await storeApi<{ deleted: boolean; imageCleanupWarning?: boolean }>(
          `/api/admin/products/${confirmTarget.item.id}`,
          { method: "DELETE" },
        );
        setNotice({
          kind: result.imageCleanupWarning ? "error" : "success",
          text: result.imageCleanupWarning
            ? "Artigo apagado, mas não foi possível remover a imagem da Cloudinary."
            : "Artigo apagado do catálogo.",
        });
        await refreshCatalog();
      } else if (confirmTarget.kind === "category") {
        await storeApi(`/api/admin/categories/${confirmTarget.item.id}`, { method: "DELETE" });
        setNotice({ kind: "success", text: "Categoria apagada." });
        await refreshCatalog();
      } else {
        await storeApi(`/api/admin/orders/${confirmTarget.item.id}`, { method: "DELETE" });
        setNotice({ kind: "success", text: `Pedido ${confirmTarget.item.reference} removido.` });
        await refreshOrders();
      }
      setConfirmTarget(null);
    } catch (error) {
      setNotice({ kind: "error", text: apiError(error, "Não foi possível apagar o registo.") });
    } finally {
      setConfirmDeleting(false);
    }
  };

  const activeProductCount = products.filter((product) => product.isActive).length;
  const activeCategoryCount = categories.filter((category) => category.isActive).length;
  const newOrdersCount = orders.filter((order) => order.status === "novo").length;

  const sectionMeta =
    activeTab === "products"
      ? {
          eyebrow: "Catálogo da loja",
          title: "Artigos",
          description: "Adicione, edite, publique ou remova os produtos apresentados na loja Bioprev.",
        }
      : activeTab === "categories"
        ? {
            eyebrow: "Organização da loja",
            title: "Categorias",
            description: "Organize as categorias activas utilizadas para filtrar artigos na loja.",
          }
        : {
            eyebrow: "Encomendas e WhatsApp",
            title: "Pedidos",
            description: "Acompanhe os pedidos enviados pela loja ou registe encomendas recebidas directamente pelo WhatsApp.",
          };

  const selectTab = (tab: "products" | "categories" | "orders") => {
    setActiveTab(tab);
    setMobileNavOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white">
      <div className="border-t-4 border-t-[#f2c92f] border-b border-[#e4eaed] px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" aria-label="Voltar ao site Bioprev">
            <img src="/logo.svg" alt="Bioprev" className="h-9 w-auto" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center border border-[#dce4e8] text-[#4f606a] hover:text-[#001d3d] lg:hidden"
            aria-label="Fechar menu lateral"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#007cc3]">
          Administração da Loja
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4" aria-label="Navegação da administração">
        <p className="px-5 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7c8b94]">
          Gestão
        </p>
        <div role="tablist" aria-orientation="vertical" aria-label="Secções da loja" className="space-y-1">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "products"}
            onClick={() => selectTab("products")}
            className={`flex w-full items-center justify-between gap-3 border-l-4 px-5 py-3 text-left text-sm transition-colors ${
              activeTab === "products"
                ? "border-l-[#007cc3] bg-[#eff6fa] font-semibold text-[#001d3d]"
                : "border-l-transparent font-medium text-[#4f606a] hover:bg-[#f4f7f9] hover:text-[#001d3d]"
            }`}
          >
            <span className="inline-flex items-center gap-3">
              <Package className={`h-4 w-4 ${activeTab === "products" ? "text-[#007cc3]" : "text-[#6c7b84]"}`} />
              Artigos
            </span>
            <span className="border border-[#dce4e8] bg-white px-2 py-0.5 text-xs font-semibold text-[#55656f]">
              {catalogQuery.data ? products.length : "—"}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "categories"}
            onClick={() => selectTab("categories")}
            className={`flex w-full items-center justify-between gap-3 border-l-4 px-5 py-3 text-left text-sm transition-colors ${
              activeTab === "categories"
                ? "border-l-[#007cc3] bg-[#eff6fa] font-semibold text-[#001d3d]"
                : "border-l-transparent font-medium text-[#4f606a] hover:bg-[#f4f7f9] hover:text-[#001d3d]"
            }`}
          >
            <span className="inline-flex items-center gap-3">
              <Boxes className={`h-4 w-4 ${activeTab === "categories" ? "text-[#007cc3]" : "text-[#6c7b84]"}`} />
              Categorias
            </span>
            <span className="border border-[#dce4e8] bg-white px-2 py-0.5 text-xs font-semibold text-[#55656f]">
              {catalogQuery.data ? categories.length : "—"}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "orders"}
            onClick={() => selectTab("orders")}
            className={`flex w-full items-center justify-between gap-3 border-l-4 px-5 py-3 text-left text-sm transition-colors ${
              activeTab === "orders"
                ? "border-l-[#007cc3] bg-[#eff6fa] font-semibold text-[#001d3d]"
                : "border-l-transparent font-medium text-[#4f606a] hover:bg-[#f4f7f9] hover:text-[#001d3d]"
            }`}
          >
            <span className="inline-flex items-center gap-3">
              <ClipboardList className={`h-4 w-4 ${activeTab === "orders" ? "text-[#007cc3]" : "text-[#6c7b84]"}`} />
              Pedidos
            </span>
            {newOrdersCount > 0 ? (
              <span className="border border-[#e9dba3] bg-[#fffdf5] px-2 py-0.5 text-xs font-bold text-[#8a6500]">
                {newOrdersCount}
              </span>
            ) : (
              <span className="border border-[#dce4e8] bg-white px-2 py-0.5 text-xs font-semibold text-[#55656f]">
                {ordersQuery.data ? orders.length : "—"}
              </span>
            )}
          </button>
        </div>

        <div className="mt-6 border-t border-[#e8edef] pt-5">
          <p className="px-5 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7c8b94]">
            Atalhos
          </p>
          <div className="space-y-1">
            <Link
              href="/loja"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 border-l-4 border-l-transparent px-5 py-2.5 text-sm font-medium text-[#4f606a] transition-colors hover:bg-[#f4f7f9] hover:text-[#001d3d]"
            >
              <ShoppingBag className="h-4 w-4 text-[#6c7b84]" /> Ver loja pública
            </Link>
            <Link
              href="/"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 border-l-4 border-l-transparent px-5 py-2.5 text-sm font-medium text-[#4f606a] transition-colors hover:bg-[#f4f7f9] hover:text-[#001d3d]"
            >
              <ArrowLeft className="h-4 w-4 text-[#6c7b84]" /> Voltar ao site
            </Link>
          </div>
        </div>
      </nav>

      <div className="border-t border-[#e4eaed] bg-[#f8fafb] p-5">
        <div className="mb-3 inline-flex items-center gap-2 border border-[#cce4d7] bg-[#f1f8f4] px-2.5 py-1 text-[11px] font-semibold text-[#276445]">
          <ShieldCheck className="h-3.5 w-3.5" /> Sessão autorizada
        </div>
        <p className="truncate text-xs text-[#61717b]" title={adminEmail}>
          {adminEmail}
        </p>
        <button
          type="button"
          className={`${secondaryClass} mt-3 w-full justify-center`}
          onClick={onSignOut}
          aria-label="Terminar sessão"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-[#253944] lg:flex">
      <aside className="hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:w-68 lg:shrink-0 lg:border-r lg:border-[#e1e8ec]">
        {sidebarContent}
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu de administração">
          <div
            className="fixed inset-0 bg-[#001d3d]/45"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-10 h-full w-72 max-w-[85vw] border-r border-[#e1e8ec] bg-white shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 border-b border-[#e1e8ec] bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className={secondaryClass}
            aria-label="Abrir menu lateral"
          >
            <Menu className="h-4 w-4" /> Menu
          </button>
          <span className="text-sm font-semibold text-[#001d3d]">{sectionMeta.title}</span>
        </div>

        <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#007cc3]">
                <span className="h-[3px] w-8 bg-[#f2c92f]" /> {sectionMeta.eyebrow}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[#001d3d] sm:text-4xl">
                {sectionMeta.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#62727c]">
                {sectionMeta.description}
              </p>
            </div>
            <div className="shrink-0">
              {activeTab === "products" ? (
                <button type="button" className={actionClass} onClick={openNewProduct} disabled={!catalogQuery.data || categories.length === 0}>
                  <Plus className="h-4 w-4" /> Adicionar artigo
                </button>
              ) : activeTab === "categories" ? (
                <button type="button" className={actionClass} onClick={openNewCategory} disabled={!catalogQuery.data}>
                  <Plus className="h-4 w-4" /> Adicionar categoria
                </button>
              ) : (
                <button type="button" className={actionClass} onClick={openNewOrder}>
                  <Plus className="h-4 w-4" /> Registar pedido
                </button>
              )}
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

          {configQuery.data && (
            <section className="mb-6 grid gap-3 sm:grid-cols-2">
              <div className={`border border-l-4 p-4 text-sm ${
                configQuery.data.tursoConfigured
                  ? "border-[#cce4d7] border-l-[#276445] bg-[#f1f8f4]"
                  : "border-[#e9dba3] border-l-[#f2c92f] bg-[#fffdf5]"
              }`}>
                <p className="font-semibold text-[#001d3d]">
                  {configQuery.data.tursoConfigured ? "Turso conectado" : "Base Turso em modo de pré-visualização"}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#55656f]">
                  {configQuery.data.tursoConfigured
                    ? "Os artigos, categorias e pedidos estão a ser persistidos directamente na base de dados Turso."
                    : "A loja funciona com dados em memória. Ao definir TURSO_DATABASE_URL e TURSO_AUTH_TOKEN no Vercel, as tabelas são criadas automaticamente."}
                </p>
              </div>
              <div className={`border border-l-4 p-4 text-sm ${
                configQuery.data.cloudinaryConfigured
                  ? "border-[#cce4d7] border-l-[#276445] bg-[#f1f8f4]"
                  : "border-[#d8e4eb] border-l-[#007cc3] bg-white"
              }`}>
                <p className="font-semibold text-[#001d3d]">
                  {configQuery.data.cloudinaryConfigured ? "Cloudinary conectada" : "Cloudinary pronta para configurar"}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#55656f]">
                  {configQuery.data.cloudinaryConfigured
                    ? "O envio, pré-visualização e remoção de imagens dos artigos está activo na pasta bioprev/products."
                    : "Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no Vercel para guardar imagens dos produtos."}
                </p>
              </div>
            </section>
          )}

          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={<Package className="h-5 w-5" />} label="Artigos no catálogo" value={catalogQuery.data ? String(products.length) : "—"} />
            <StatCard icon={<Check className="h-5 w-5" />} label="Artigos publicados" value={catalogQuery.data ? String(activeProductCount) : "—"} />
            <StatCard icon={<Boxes className="h-5 w-5" />} label="Categorias activas" value={catalogQuery.data ? String(activeCategoryCount) : "—"} />
            <StatCard
              icon={<ClipboardList className="h-5 w-5" />}
              label={newOrdersCount ? `Pedidos (${newOrdersCount} novos)` : "Pedidos registados"}
              value={ordersQuery.data ? String(orders.length) : "—"}
            />
          </section>

          <section className="border border-[#e0e7eb] bg-white shadow-[0_2px_12px_rgba(0,29,61,0.035)]">

          {activeTab === "orders" ? (
            ordersQuery.isPending ? (
              <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-[#60717b]">
                <LoaderCircle className="h-5 w-5 animate-spin text-[#007cc3]" /> A carregar os pedidos…
              </div>
            ) : ordersQuery.error ? (
              <div className="p-6 text-sm leading-6 text-[#914533]">
                <h2 className="font-semibold text-[#001d3d]">Não foi possível carregar os pedidos</h2>
                <p className="mt-1">{apiError(ordersQuery.error, "Verifique a ligação à base de dados.")}</p>
                <button type="button" className={`${secondaryClass} mt-4`} onClick={() => ordersQuery.refetch()}>Tentar novamente</button>
              </div>
            ) : (
              <>
                <div className="grid gap-3 border-b border-[#e7ecef] p-4 sm:grid-cols-[minmax(220px,1fr)_220px] sm:px-6">
                  <label className="relative block">
                    <span className="sr-only">Pesquisar pedidos</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#87939a]" />
                    <input
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                      placeholder="Pesquisar por referência, telefone, cliente ou artigo…"
                      className={`${fieldClass} mt-0 pl-10`}
                    />
                  </label>
                  <label>
                    <span className="sr-only">Filtrar por estado</span>
                    <select
                      value={orderStatusFilter}
                      onChange={(event) => setOrderStatusFilter(event.target.value)}
                      className={`${fieldClass} mt-0`}
                    >
                      <option value="all">Todos os estados</option>
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>{orderStatusLabel[status]}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {visibleOrders.length ? (
                  <div className="divide-y divide-[#e8edef]">
                    {visibleOrders.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        onStatusChange={(status) => void updateOrderStatus(order, status)}
                        onEdit={() => openEditOrder(order)}
                        onDelete={() => setConfirmTarget({ kind: "order", item: order })}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-14 text-center">
                    <ClipboardList className="mx-auto h-9 w-9 text-[#94a2aa]" />
                    <h2 className="mt-3 font-semibold text-[#001d3d]">
                      {orders.length ? "Nenhum pedido encontrado" : "Ainda não há pedidos registados"}
                    </h2>
                    <p className="mt-1 text-sm text-[#697780]">
                      {orders.length
                        ? "Altere o termo de pesquisa ou o filtro de estado."
                        : "Todos os pedidos enviados na loja (mesmo quando seguem para o WhatsApp) aparecem aqui automaticamente, ou pode registar um pedido manual."}
                    </p>
                  </div>
                )}
              </>
            )
          ) : catalogQuery.isPending ? (
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
                    <ProductRow
                      key={product.id}
                      product={product}
                      onEdit={() => openEditProduct(product)}
                      onDelete={() => setConfirmTarget({ kind: "product", item: product })}
                    />
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
                  onDelete={() => setConfirmTarget({ kind: "category", item: category })}
                />
              )) : (
                <div className="col-span-full py-12 text-center text-sm text-[#697780]">Ainda não há categorias. Crie uma para começar.</div>
              )}
            </div>
          )}
          </section>
        </main>
      </div>

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
                <span className={labelClass}>Imagem do artigo (Cloudinary)</span>
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
                    <p className="basis-full text-xs text-[#687780]">JPG, PNG, WebP ou AVIF; máximo 5 MB. Enviado para a Cloudinary através do servidor.</p>
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

      <Dialog open={orderDialogOpen} onOpenChange={(open) => { if (!open) { setOrderDialogOpen(false); setOrderDraft(null); } }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-t-4 border-t-[#f2c92f] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#001d3d]">{editingOrderId ? "Editar pedido" : "Registar pedido"}</DialogTitle>
            <DialogDescription>
              Registe ou actualize pedidos recebidos pela loja ou directamente pelo WhatsApp.
            </DialogDescription>
          </DialogHeader>
          {orderDraft && (
            <form onSubmit={saveOrder} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Artigo do catálogo
                  <select
                    value={orderDraft.productId ?? ""}
                    onChange={(event) => {
                      const nextId = event.target.value || null;
                      const found = products.find((p) => p.id === nextId);
                      setOrderDraft({
                        ...orderDraft,
                        productId: nextId,
                        productName: found ? found.name : orderDraft.productName,
                      });
                    }}
                    className={fieldClass}
                  >
                    <option value="">Outro artigo (escrever manualmente)</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  Nome do artigo *
                  <input
                    required
                    minLength={2}
                    maxLength={160}
                    value={orderDraft.productName}
                    onChange={(event) => setOrderDraft({ ...orderDraft, productName: event.target.value })}
                    className={fieldClass}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className={labelClass}>
                  Quantidade *
                  <input
                    type="number"
                    required
                    min={1}
                    max={10000}
                    value={orderDraft.quantity}
                    onChange={(event) => setOrderDraft({ ...orderDraft, quantity: Math.max(1, Number(event.target.value) || 1) })}
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  Estado *
                  <select
                    value={orderDraft.status}
                    onChange={(event) => setOrderDraft({ ...orderDraft, status: event.target.value as StoreOrderStatus })}
                    className={fieldClass}
                  >
                    {orderStatuses.map((status) => (
                      <option key={status} value={status}>{orderStatusLabel[status]}</option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  Origem *
                  <select
                    value={orderDraft.source}
                    onChange={(event) => setOrderDraft({ ...orderDraft, source: event.target.value as StoreOrderSource })}
                    className={fieldClass}
                  >
                    {orderSources.map((source) => (
                      <option key={source} value={source}>{orderSourceLabel[source]}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Nome do cliente / empresa
                  <input
                    maxLength={120}
                    value={orderDraft.customerName}
                    onChange={(event) => setOrderDraft({ ...orderDraft, customerName: event.target.value })}
                    placeholder="Opcional"
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  Telefone para contacto *
                  <input
                    type="tel"
                    required
                    minLength={6}
                    maxLength={40}
                    value={orderDraft.telephone}
                    onChange={(event) => setOrderDraft({ ...orderDraft, telephone: event.target.value })}
                    placeholder="+244 9XX XXX XXX"
                    className={fieldClass}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                <label className={labelClass}>
                  Morada de entrega *
                  <input
                    required
                    minLength={4}
                    maxLength={500}
                    value={orderDraft.address}
                    onChange={(event) => setOrderDraft({ ...orderDraft, address: event.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  Cidade
                  <input
                    maxLength={100}
                    value={orderDraft.city}
                    onChange={(event) => setOrderDraft({ ...orderDraft, city: event.target.value })}
                    placeholder="Ex.: Luanda"
                    className={fieldClass}
                  />
                </label>
              </div>

              <label className={labelClass}>
                Notas de entrega do cliente
                <textarea
                  rows={2}
                  maxLength={500}
                  value={orderDraft.deliveryNotes}
                  onChange={(event) => setOrderDraft({ ...orderDraft, deliveryNotes: event.target.value })}
                  className={`${fieldClass} resize-y`}
                />
              </label>

              <label className={labelClass}>
                Notas internas da equipa (preço acordado, previsão de entrega, observações)
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={orderDraft.adminNotes}
                  onChange={(event) => setOrderDraft({ ...orderDraft, adminNotes: event.target.value })}
                  placeholder="Ex.: Orçamento enviado por WhatsApp; entrega agendada."
                  className={`${fieldClass} resize-y`}
                />
              </label>

              {orderFormError && <p role="alert" className="border border-[#f0d3cc] bg-[#fff7f5] px-3 py-2 text-sm text-[#914533]">{orderFormError}</p>}
              <div className="flex justify-end gap-3 border-t border-[#e6ecef] pt-4">
                <button type="button" className={secondaryClass} onClick={() => { setOrderDialogOpen(false); setOrderDraft(null); }} disabled={orderSaving}>
                  Cancelar
                </button>
                <button type="submit" className={actionClass} disabled={orderSaving}>
                  {orderSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {orderSaving ? "A guardar…" : "Guardar pedido"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmTarget)} onOpenChange={(open) => { if (!open && !confirmDeleting) setConfirmTarget(null); }}>
        <DialogContent className="border-t-4 border-t-[#f2c92f] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#001d3d]">Confirmar remoção</DialogTitle>
            <DialogDescription>
              {confirmTarget?.kind === "product"
                ? `Apagar o artigo “${confirmTarget.item.name}” do catálogo da loja? Esta acção não pode ser desfeita.`
                : confirmTarget?.kind === "category"
                  ? `Apagar a categoria “${confirmTarget.item.name}”? Esta acção não pode ser desfeita.`
                  : confirmTarget?.kind === "order"
                    ? `Remover o pedido ${confirmTarget.item.reference} (${confirmTarget.item.productName})? Esta acção não pode ser desfeita.`
                    : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className={secondaryClass} onClick={() => setConfirmTarget(null)} disabled={confirmDeleting}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void executeConfirmDelete()}
              disabled={confirmDeleting}
              className="inline-flex min-h-10 items-center justify-center gap-2 border border-[#a44232] bg-[#a44232] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#8c3628] disabled:opacity-60"
            >
              {confirmDeleting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Apagar
            </button>
          </div>
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

function OrderRow({
  order,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  order: StoreOrder;
  onStatusChange: (status: StoreOrderStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="flex flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold text-[#001d3d]">{order.reference}</span>
          <span className={`border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${orderStatusBadgeClass[order.status]}`}>
            {orderStatusLabel[order.status]}
          </span>
          <span className="border border-[#dce4e8] bg-[#f8fafb] px-2 py-0.5 text-[11px] font-semibold text-[#5a6b75]">
            {orderSourceLabel[order.source]}
          </span>
          <span className="text-xs text-[#798790]">{formatDateTime(order.createdAt)}</span>
        </div>

        <h3 className="text-base font-semibold text-[#001d3d]">
          {order.productName} <span className="text-[#007cc3]">× {order.quantity}</span>
        </h3>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#4e5f69]">
          {order.customerName && <span className="font-medium text-[#001d3d]">{order.customerName}</span>}
          <span className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-[#007cc3]" /> {order.telephone}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-[#007cc3]" />
            {order.address}{order.city ? `, ${order.city}` : ""}
          </span>
        </div>

        {order.deliveryNotes && (
          <p className="text-xs text-[#61717b]">
            <strong>Notas de entrega:</strong> {order.deliveryNotes}
          </p>
        )}
        {order.adminNotes && (
          <p className="border-l-2 border-[#f2c92f] bg-[#fffdf5] px-2.5 py-1.5 text-xs text-[#4f5f69]">
            <strong>Notas internas:</strong> {order.adminNotes}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
        <select
          aria-label={`Estado do pedido ${order.reference}`}
          value={order.status}
          onChange={(event) => onStatusChange(event.target.value as StoreOrderStatus)}
          className="min-h-10 border border-[#cbd6dc] bg-white px-2.5 text-sm font-medium text-[#001d3d] outline-none focus:border-[#007cc3]"
        >
          {orderStatuses.map((status) => (
            <option key={status} value={status}>{orderStatusLabel[status]}</option>
          ))}
        </select>
        <a
          href={whatsappHrefForOrder(order)}
          target="_blank"
          rel="noopener noreferrer"
          className={secondaryClass}
          title="Responder ao cliente pelo WhatsApp"
        >
          WhatsApp <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
        <button type="button" className={secondaryClass} onClick={onEdit} aria-label={`Editar pedido ${order.reference}`}>
          <Pencil className="h-4 w-4" /> Editar
        </button>
        <button
          type="button"
          className="inline-flex min-h-10 items-center justify-center border border-[#e7d2cf] px-3 text-[#9c4e40] transition-colors hover:bg-[#fff7f5]"
          onClick={onDelete}
          aria-label={`Apagar pedido ${order.reference}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

export default AdminPage;
