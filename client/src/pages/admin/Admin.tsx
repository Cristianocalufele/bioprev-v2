import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Redirect, Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Check,
  CheckCircle2,
  ClipboardList,
  CloudUpload,
  Database,
  Download,
  Eye,
  EyeOff,
  FileText,
  ImagePlus,
  KeyRound,
  LayoutGrid,
  List,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  Package,
  Pencil,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Upload,
  Users,
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
  type ProductSpecItem,
  type ProductStockMode,
  type StoreCatalog,
  type StoreCategory,
  type StoreCustomer,
  type StoreOrder,
  type StoreOrderSource,
  type StoreOrderStatus,
  type StoreProduct,
} from "@shared/store";
import {
  fetchAdminCustomers,
  getAdminToken,
  runStoreSync,
  setAdminToken,
  storeApi,
  uploadProductDatasheet,
  uploadProductImage,
  type AdminAccess,
  type AdminAuthStatus,
  type StoreAdminConfig,
  type StoreSyncResult,
} from "@/lib/storeApi";
import { formatKwanza, stockStatusInfo } from "@/lib/storeFormat";
import { resolveProductImage } from "@/lib/storeImages";
import { AdminAnalyticsTab } from "./AdminAnalyticsTab";
import { AdminCustomersTab } from "./AdminCustomersTab";
import { AdminOrderDocumentDialog } from "./AdminOrderDocumentDialog";

type AdminTab = "products" | "categories" | "orders" | "customers" | "metrics" | "sync";

type GalleryImageDraft = {
  imagePublicId: string;
  imageUrl: string | null;
  altText: string;
  sortOrder: number;
};

type ProductDraft = {
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  priceAoa: number | null;
  unitLabel: string;
  stockQuantity: number;
  lowStockThreshold: number;
  stockMode: ProductStockMode;
  isFeatured: boolean;
  specs: ProductSpecItem[];
  imagePublicId: string | null;
  galleryImages: GalleryImageDraft[];
  datasheetPublicId: string | null;
  datasheetExternalUrl: string;
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

type OrderItemDraft = {
  productId: string | null;
  productName: string;
  sku: string;
  quantity: number;
  unitPriceAoa: number | null;
  unitLabel: string;
};

type OrderDraft = {
  customerId: string | null;
  items: OrderItemDraft[];
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

const orderStatusTextClass: Record<StoreOrderStatus, string> = {
  novo: "text-[#8a6500]",
  em_contacto: "text-[#005f96]",
  confirmado: "text-[#276445]",
  entregue: "text-[#1e573b]",
  cancelado: "text-[#914533]",
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
  const itemsText = order.items.map((i) => `${i.productName} ×${i.quantity}`).join(", ");
  const text = `Olá${order.customerName ? ` ${order.customerName}` : ""}, aqui é a Bioprev Angola sobre o seu pedido ${order.reference} (${itemsText}).`;
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
}

function sanitizeCsvCell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function downloadOrdersCsv(orders: StoreOrder[]) {
  const header = [
    "Referência",
    "Data",
    "Estado",
    "Origem",
    "Cliente",
    "Telefone",
    "Morada",
    "Cidade",
    "Artigos",
    "Quantidade Total",
    "Total (Kz)",
    "Notas de entrega",
    "Notas internas",
  ];
  const rows = orders.map((o) => [
    o.reference,
    formatDateTime(o.createdAt),
    orderStatusLabel[o.status],
    orderSourceLabel[o.source],
    o.customerName,
    o.telephone,
    o.address,
    o.city,
    o.items.map((i) => `${i.productName} x${i.quantity}`).join("; "),
    o.quantity,
    o.totalAoa !== null ? o.totalAoa : "Sob consulta",
    o.deliveryNotes,
    o.adminNotes,
  ]);
  const csv = [header, ...rows].map((row) => row.map(sanitizeCsvCell).join(";")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pedidos-bioprev-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
  const [activeTab, setActiveTab] = useState<AdminTab>("products");
  const [productView, setProductView] = useState<"grid" | "list">("grid");
  const [productStockFilter, setProductStockFilter] = useState<"all" | "low" | "out" | "featured">("all");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const [overwriteSyncImages, setOverwriteSyncImages] = useState(false);
  const [syncRunning, setSyncRunning] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncResult, setSyncResult] = useState<StoreSyncResult | null>(null);

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null);
  const [productFormError, setProductFormError] = useState("");
  const [productSaving, setProductSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [datasheetUploading, setDatasheetUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [stagedImagePublicIds, setStagedImagePublicIds] = useState<string[]>([]);
  const [stagedDatasheetPublicId, setStagedDatasheetPublicId] = useState<string | null>(null);

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

  const [documentOrder, setDocumentOrder] = useState<StoreOrder | null>(null);
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
  const customersQuery = useQuery({
    queryKey: ["store-admin", "customers"],
    queryFn: fetchAdminCustomers,
    retry: false,
  });

  const catalog = catalogQuery.data;
  const categories = catalog?.categories ?? [];
  const products = catalog?.products ?? [];
  const orders = ordersQuery.data ?? [];
  const customers = customersQuery.data ?? [];

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt");
    return products.filter((product) => {
      const matchesCategory = categoryFilter === "all" || product.categoryId === categoryFilter;
      const matchesStockFilter =
        productStockFilter === "all" ||
        (productStockFilter === "low" && product.stockStatus === "stock_reduzido") ||
        (productStockFilter === "out" && product.stockStatus === "esgotado") ||
        (productStockFilter === "featured" && product.isFeatured);
      const matchesSearch =
        !normalizedSearch ||
        `${product.name} ${product.sku} ${product.categoryName} ${product.shortDescription} ${product.slug}`
          .toLocaleLowerCase("pt")
          .includes(normalizedSearch);
      return matchesCategory && matchesStockFilter && matchesSearch;
    });
  }, [categoryFilter, productStockFilter, products, search]);

  const visibleOrders = useMemo(() => {
    const normalizedSearch = orderSearch.trim().toLocaleLowerCase("pt");
    return orders.filter((order) => {
      const matchesStatus = orderStatusFilter === "all" || order.status === orderStatusFilter;
      const itemsText = order.items.map((i) => `${i.productName} ${i.sku}`).join(" ");
      const matchesSearch =
        !normalizedSearch ||
        `${order.reference} ${order.productName} ${itemsText} ${order.customerName} ${order.telephone} ${order.address} ${order.city}`
          .toLocaleLowerCase("pt")
          .includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }, [orderSearch, orderStatusFilter, orders]);

  const refreshCatalog = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["store-admin", "catalog"] }),
      queryClient.invalidateQueries({ queryKey: ["store", "catalog"] }),
      queryClient.invalidateQueries({ queryKey: ["store-admin", "metrics"] }),
    ]);
  };

  const refreshOrders = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["store-admin", "orders"] }),
      queryClient.invalidateQueries({ queryKey: ["store-admin", "customers"] }),
      queryClient.invalidateQueries({ queryKey: ["store-admin", "metrics"] }),
      queryClient.invalidateQueries({ queryKey: ["store-admin", "catalog"] }),
      queryClient.invalidateQueries({ queryKey: ["store", "catalog"] }),
    ]);
  };

  const cleanupStagedAssets = async (keepPublicIds: Set<string>, keepDatasheetId: string | null) => {
    for (const id of stagedImagePublicIds) {
      if (keepPublicIds.has(id)) continue;
      try {
        await storeApi("/api/admin/media", { method: "DELETE", body: JSON.stringify({ publicId: id }) });
      } catch {
        // Ignore cleanup failure
      }
    }
    if (stagedDatasheetPublicId && stagedDatasheetPublicId !== keepDatasheetId) {
      try {
        await storeApi("/api/admin/datasheet", {
          method: "DELETE",
          body: JSON.stringify({ publicId: stagedDatasheetPublicId }),
        });
      } catch {
        // Ignore cleanup failure
      }
    }
    setStagedImagePublicIds([]);
    setStagedDatasheetPublicId(null);
  };

  const openNewProduct = () => {
    setEditingProductId(null);
    setProductDraft({
      name: "",
      slug: "",
      sku: "",
      categoryId: categories.find((category) => category.isActive)?.id ?? "",
      shortDescription: "",
      description: "",
      priceAoa: null,
      unitLabel: "unidade",
      stockQuantity: 0,
      lowStockThreshold: 5,
      stockMode: "por_encomenda",
      isFeatured: false,
      specs: [],
      imagePublicId: null,
      galleryImages: [],
      datasheetPublicId: null,
      datasheetExternalUrl: "",
      isActive: true,
      sortOrder: 0,
    });
    setImagePreview(null);
    setStagedImagePublicIds([]);
    setStagedDatasheetPublicId(null);
    setProductFormError("");
    setProductDialogOpen(true);
  };

  const openEditProduct = (product: StoreProduct) => {
    setEditingProductId(product.id);
    setProductDraft({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      categoryId: product.categoryId,
      shortDescription: product.shortDescription,
      description: product.description,
      priceAoa: product.priceAoa,
      unitLabel: product.unitLabel,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      stockMode: product.stockMode,
      isFeatured: product.isFeatured,
      specs: product.specs.map((s) => ({ ...s })),
      imagePublicId: product.imagePublicId,
      galleryImages: product.galleryImages.map((g) => ({
        imagePublicId: g.imagePublicId,
        imageUrl: g.imageUrl,
        altText: g.altText,
        sortOrder: g.sortOrder,
      })),
      datasheetPublicId: product.datasheetPublicId,
      datasheetExternalUrl: product.datasheetExternalUrl,
      isActive: product.isActive,
      sortOrder: product.sortOrder,
    });
    setImagePreview(product.imageUrl);
    setStagedImagePublicIds([]);
    setStagedDatasheetPublicId(null);
    setProductFormError("");
    setProductDialogOpen(true);
  };

  const closeProductDialog = async () => {
    await cleanupStagedAssets(new Set(), null);
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
      const payload = {
        ...productDraft,
        specs: productDraft.specs.filter((s) => s.label.trim() && s.value.trim()),
        galleryImages: productDraft.galleryImages.map((g, idx) => ({
          imagePublicId: g.imagePublicId,
          altText: g.altText,
          sortOrder: idx,
        })),
      };

      const result = await storeApi<StoreProduct & { imageCleanupWarning?: boolean }>(
        editingProductId ? `/api/admin/products/${editingProductId}` : "/api/admin/products",
        {
          method: editingProductId ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );

      const savedIds = new Set<string>([
        ...(result.imagePublicId ? [result.imagePublicId] : []),
        ...result.galleryImages.map((g) => g.imagePublicId),
      ]);
      await cleanupStagedAssets(savedIds, result.datasheetPublicId);

      setProductDialogOpen(false);
      setProductDraft(null);
      setImagePreview(null);
      setNotice({
        kind: "success",
        text: result.imageCleanupWarning
          ? "Artigo guardado. Um ficheiro antigo não foi removido da Cloudinary."
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
      setProductDraft((current) => current ? { ...current, imagePublicId: uploaded.publicId } : current);
      setImagePreview(uploaded.imageUrl);
      setStagedImagePublicIds((prev) => [...prev, uploaded.publicId]);
    } catch (error) {
      setProductFormError(apiError(error, "Não foi possível enviar a imagem."));
    } finally {
      setImageUploading(false);
    }
  };

  const handleGalleryImageSelected = async (file?: File) => {
    if (!file || !productDraft) return;
    setGalleryUploading(true);
    setProductFormError("");
    try {
      const uploaded = await uploadProductImage(file);
      setProductDraft((current) =>
        current
          ? {
              ...current,
              galleryImages: [
                ...current.galleryImages,
                {
                  imagePublicId: uploaded.publicId,
                  imageUrl: uploaded.imageUrl,
                  altText: current.name,
                  sortOrder: current.galleryImages.length,
                },
              ],
            }
          : current,
      );
      setStagedImagePublicIds((prev) => [...prev, uploaded.publicId]);
    } catch (error) {
      setProductFormError(apiError(error, "Não foi possível enviar a imagem da galeria."));
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleDatasheetSelected = async (file?: File) => {
    if (!file || !productDraft) return;
    setDatasheetUploading(true);
    setProductFormError("");
    try {
      const uploaded = await uploadProductDatasheet(file);
      setProductDraft((current) => (current ? { ...current, datasheetPublicId: uploaded.publicId } : current));
      setStagedDatasheetPublicId(uploaded.publicId);
    } catch (error) {
      setProductFormError(apiError(error, "Não foi possível enviar a ficha técnica PDF."));
    } finally {
      setDatasheetUploading(false);
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

  const openNewOrder = (preselectedCustomer?: StoreCustomer) => {
    const firstProduct = products[0];
    setEditingOrderId(null);
    setOrderDraft({
      customerId: preselectedCustomer?.id ?? null,
      items: [
        {
          productId: firstProduct?.id ?? null,
          productName: firstProduct?.name ?? "",
          sku: firstProduct?.sku ?? "",
          quantity: 1,
          unitPriceAoa: firstProduct?.priceAoa ?? null,
          unitLabel: firstProduct?.unitLabel ?? "unidade",
        },
      ],
      customerName: preselectedCustomer?.name ?? "",
      telephone: preselectedCustomer?.telephone ?? "",
      address: preselectedCustomer?.defaultAddress ?? "",
      city: preselectedCustomer?.defaultCity ?? "",
      deliveryNotes: "",
      status: "novo",
      source: preselectedCustomer ? "admin" : "whatsapp_direto",
      adminNotes: "",
    });
    setOrderFormError("");
    setOrderDialogOpen(true);
  };

  const openEditOrder = (order: StoreOrder) => {
    setEditingOrderId(order.id);
    setOrderDraft({
      customerId: order.customerId,
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPriceAoa: item.unitPriceAoa,
        unitLabel: item.unitLabel,
      })),
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
      const validItems = orderDraft.items.filter((i) => i.productName.trim().length >= 2);
      if (validItems.length === 0) {
        setOrderFormError("Adicione pelo menos um artigo válido ao pedido.");
        setOrderSaving(false);
        return;
      }

      await storeApi<StoreOrder>(
        editingOrderId ? `/api/admin/orders/${editingOrderId}` : "/api/admin/orders",
        {
          method: editingOrderId ? "PATCH" : "POST",
          body: JSON.stringify({
            customerId: orderDraft.customerId,
            items: validItems,
            customerName: orderDraft.customerName,
            telephone: orderDraft.telephone,
            address: orderDraft.address,
            city: orderDraft.city,
            deliveryNotes: orderDraft.deliveryNotes,
            status: orderDraft.status,
            source: orderDraft.source,
            adminNotes: orderDraft.adminNotes,
          }),
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
      setNotice({
        kind: "success",
        text: `Estado do pedido ${order.reference} alterado para “${orderStatusLabel[status]}”.`,
      });
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
            ? "Artigo apagado, mas um ficheiro não foi removido da Cloudinary."
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

  const executeSync = async () => {
    if (!configQuery.data?.syncReady || syncRunning) return;
    setSyncRunning(true);
    setSyncError("");
    try {
      const result = await runStoreSync(overwriteSyncImages);
      setSyncResult(result);
      setNotice({
        kind: "success",
        text: `Sincronização concluída: ${result.categoriesCreated + result.categoriesUpdated} categorias, ${result.productsCreated + result.productsUpdated} artigos e ${result.imagesUploaded} imagens enviadas para a Cloudinary.`,
      });
      await Promise.all([refreshCatalog(), refreshOrders(), configQuery.refetch()]);
    } catch (error) {
      const message = apiError(error, "Não foi possível sincronizar os dados.");
      setSyncError(message);
      setNotice({ kind: "error", text: message });
    } finally {
      setSyncRunning(false);
    }
  };

  const activeProductCount = products.filter((product) => product.isActive).length;
  const lowOrOutStockCount = products.filter(
    (p) => p.stockStatus === "stock_reduzido" || p.stockStatus === "esgotado",
  ).length;
  const newOrdersCount = orders.filter((order) => order.status === "novo").length;
  const editingProduct = editingProductId ? products.find((p) => p.id === editingProductId) ?? null : null;
  const defaultProductPreview = editingProduct && !imagePreview ? resolveProductImage(editingProduct) : null;

  const sectionMeta =
    activeTab === "products"
      ? {
          eyebrow: "Catálogo e inventário",
          title: "Artigos",
          description: "Gira preços em Kwanzas, SKU, stock, galeria de fotos e fichas técnicas dos equipamentos.",
        }
      : activeTab === "categories"
        ? {
            eyebrow: "Organização da loja",
            title: "Categorias",
            description: "Organize as categorias activas utilizadas para filtrar artigos na loja.",
          }
        : activeTab === "orders"
          ? {
              eyebrow: "Encomendas e WhatsApp",
              title: "Pedidos",
              description: "Acompanhe pedidos multi-artigo, emita orçamentos ou guias de entrega em PDF e exporte CSV.",
            }
          : activeTab === "customers"
            ? {
                eyebrow: "Carteira de contactos",
                title: "Clientes",
                description: "Consulte clientes e empresas recorrentes consolidados pelo telefone e o histórico de pedidos.",
              }
            : activeTab === "metrics"
              ? {
                  eyebrow: "Análise de resultados",
                  title: "Métricas",
                  description: "Acompanhe volume de pedidos, cidades com maior procura, artigos mais pedidos e inventário.",
                }
              : {
                  eyebrow: "Base de dados e armazenamento",
                  title: "Sincronização de dados",
                  description: "Transfira as categorias e artigos do código para o Turso, envie as imagens para a Cloudinary e ligue automaticamente todas as relações.",
                };

  const selectTab = (tab: AdminTab) => {
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
        <div role="tablist" aria-orientation="vertical" aria-label="Secções da loja" className="space-y-0.5">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "products"}
            onClick={() => selectTab("products")}
            className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm transition-colors ${
              activeTab === "products"
                ? "border-r-2 border-r-[#007cc3] bg-[#eff6fa] font-semibold text-[#001d3d]"
                : "font-medium text-[#4f606a] hover:bg-[#f4f7f9] hover:text-[#001d3d]"
            }`}
          >
            <span className="inline-flex items-center gap-3 whitespace-nowrap">
              <Package className={`h-4 w-4 ${activeTab === "products" ? "text-[#007cc3]" : "text-[#6c7b84]"}`} />
              Artigos
            </span>
            <span className="text-xs font-semibold tabular-nums text-[#55656f]">
              {catalogQuery.data ? products.length : "—"}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "categories"}
            onClick={() => selectTab("categories")}
            className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm transition-colors ${
              activeTab === "categories"
                ? "border-r-2 border-r-[#007cc3] bg-[#eff6fa] font-semibold text-[#001d3d]"
                : "font-medium text-[#4f606a] hover:bg-[#f4f7f9] hover:text-[#001d3d]"
            }`}
          >
            <span className="inline-flex items-center gap-3 whitespace-nowrap">
              <Boxes className={`h-4 w-4 ${activeTab === "categories" ? "text-[#007cc3]" : "text-[#6c7b84]"}`} />
              Categorias
            </span>
            <span className="text-xs font-semibold tabular-nums text-[#55656f]">
              {catalogQuery.data ? categories.length : "—"}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "orders"}
            onClick={() => selectTab("orders")}
            className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm transition-colors ${
              activeTab === "orders"
                ? "border-r-2 border-r-[#007cc3] bg-[#eff6fa] font-semibold text-[#001d3d]"
                : "font-medium text-[#4f606a] hover:bg-[#f4f7f9] hover:text-[#001d3d]"
            }`}
          >
            <span className="inline-flex items-center gap-3 whitespace-nowrap">
              <ClipboardList className={`h-4 w-4 ${activeTab === "orders" ? "text-[#007cc3]" : "text-[#6c7b84]"}`} />
              Pedidos
            </span>
            {newOrdersCount > 0 ? (
              <span className="bg-[#fff8de] px-2 py-0.5 text-xs font-bold tabular-nums text-[#8a6500]">
                {newOrdersCount}
              </span>
            ) : (
              <span className="text-xs font-semibold tabular-nums text-[#55656f]">
                {ordersQuery.data ? orders.length : "—"}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "customers"}
            onClick={() => selectTab("customers")}
            className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm transition-colors ${
              activeTab === "customers"
                ? "border-r-2 border-r-[#007cc3] bg-[#eff6fa] font-semibold text-[#001d3d]"
                : "font-medium text-[#4f606a] hover:bg-[#f4f7f9] hover:text-[#001d3d]"
            }`}
          >
            <span className="inline-flex items-center gap-3 whitespace-nowrap">
              <Users className={`h-4 w-4 ${activeTab === "customers" ? "text-[#007cc3]" : "text-[#6c7b84]"}`} />
              Clientes
            </span>
            <span className="text-xs font-semibold tabular-nums text-[#55656f]">
              {customersQuery.data ? customers.length : "—"}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "metrics"}
            onClick={() => selectTab("metrics")}
            className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm transition-colors ${
              activeTab === "metrics"
                ? "border-r-2 border-r-[#007cc3] bg-[#eff6fa] font-semibold text-[#001d3d]"
                : "font-medium text-[#4f606a] hover:bg-[#f4f7f9] hover:text-[#001d3d]"
            }`}
          >
            <span className="inline-flex items-center gap-3 whitespace-nowrap">
              <BarChart3 className={`h-4 w-4 ${activeTab === "metrics" ? "text-[#007cc3]" : "text-[#6c7b84]"}`} />
              Métricas
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "sync"}
            onClick={() => selectTab("sync")}
            className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm transition-colors ${
              activeTab === "sync"
                ? "border-r-2 border-r-[#007cc3] bg-[#eff6fa] font-semibold text-[#001d3d]"
                : "font-medium text-[#4f606a] hover:bg-[#f4f7f9] hover:text-[#001d3d]"
            }`}
          >
            <span className="inline-flex items-center gap-3 whitespace-nowrap">
              <RefreshCw className={`h-4 w-4 ${activeTab === "sync" ? "text-[#007cc3]" : "text-[#6c7b84]"}`} />
              Sincronização
            </span>
            <span className={`text-[11px] font-semibold ${configQuery.data?.syncReady ? "text-[#276445]" : "text-[#7c8b94]"}`}>
              {configQuery.data?.syncReady ? "Pronta" : "Pendente"}
            </span>
          </button>
        </div>

        <div className="mt-6 border-t border-[#e8edef] pt-5">
          <p className="px-5 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7c8b94]">
            Atalhos
          </p>
          <div className="space-y-0.5">
            <Link
              href="/loja"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-[#4f606a] transition-colors hover:bg-[#f4f7f9] hover:text-[#001d3d]"
            >
              <ShoppingBag className="h-4 w-4 text-[#6c7b84]" /> Ver loja pública
            </Link>
            <Link
              href="/"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-[#4f606a] transition-colors hover:bg-[#f4f7f9] hover:text-[#001d3d]"
            >
              <ArrowLeft className="h-4 w-4 text-[#6c7b84]" /> Voltar ao site
            </Link>
          </div>
        </div>
      </nav>

      <div className="border-t border-[#e4eaed] bg-[#f8fafb] p-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#276445]">
          <ShieldCheck className="h-4 w-4 shrink-0" /> Sessão autorizada
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
          <div className="fixed inset-0 bg-[#001d3d]/45" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative z-10 h-full w-72 max-w-[85vw] border-r border-[#e1e8ec] bg-white shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 border-b border-[#e1e8ec] bg-white px-4 py-3 lg:hidden">
          <button type="button" onClick={() => setMobileNavOpen(true)} className={secondaryClass} aria-label="Abrir menu lateral">
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
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-[#001d3d] sm:text-4xl">
                {sectionMeta.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#62727c]">
                {sectionMeta.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              {activeTab === "products" ? (
                <button type="button" className={`${actionClass} whitespace-nowrap`} onClick={openNewProduct} disabled={!catalogQuery.data || categories.length === 0}>
                  <Plus className="h-4 w-4" /> Adicionar artigo
                </button>
              ) : activeTab === "categories" ? (
                <button type="button" className={`${actionClass} whitespace-nowrap`} onClick={openNewCategory} disabled={!catalogQuery.data}>
                  <Plus className="h-4 w-4" /> Adicionar categoria
                </button>
              ) : activeTab === "orders" ? (
                <>
                  <button
                    type="button"
                    className={`${secondaryClass} whitespace-nowrap`}
                    onClick={() => downloadOrdersCsv(visibleOrders)}
                    disabled={visibleOrders.length === 0}
                  >
                    <Download className="h-4 w-4" /> Exportar CSV
                  </button>
                  <button type="button" className={`${actionClass} whitespace-nowrap`} onClick={() => openNewOrder()}>
                    <Plus className="h-4 w-4" /> Registar pedido
                  </button>
                </>
              ) : activeTab === "sync" ? (
                <button
                  type="button"
                  className={`${secondaryClass} whitespace-nowrap`}
                  onClick={() => void configQuery.refetch()}
                  disabled={configQuery.isFetching}
                >
                  <RefreshCw className={`h-4 w-4 ${configQuery.isFetching ? "animate-spin" : ""}`} />
                  {configQuery.isFetching ? "A verificar…" : "Verificar ligações"}
                </button>
              ) : null}
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
              <span>{notice.text}</span>
              <button type="button" onClick={() => setNotice(null)} aria-label="Fechar mensagem">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {configQuery.data && activeTab !== "sync" && (
            <section className="mb-6 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 border border-[#dce4e9] bg-white p-4 text-sm">
                {configQuery.data.tursoConnected ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#276445]" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#9c6f00]" />
                )}
                <div>
                  <p className="font-semibold text-[#001d3d]">
                    {configQuery.data.tursoConnected
                      ? "Turso 100% conectado"
                      : configQuery.data.tursoConfigured
                        ? "Falha na ligação ao Turso"
                        : "Base Turso em modo de pré-visualização"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#5c6c76]">
                    {configQuery.data.tursoConnected
                      ? "Artigos, categorias, stock, clientes e pedidos estão a ser persistidos no Turso."
                      : configQuery.data.tursoError ?? "A loja funciona em memória. Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN no Vercel."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 border border-[#dce4e9] bg-white p-4 text-sm">
                {configQuery.data.cloudinaryConnected ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#276445]" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#007cc3]" />
                )}
                <div>
                  <p className="font-semibold text-[#001d3d]">
                    {configQuery.data.cloudinaryConnected
                      ? "Cloudinary 100% conectada"
                      : configQuery.data.cloudinaryConfigured
                        ? "Falha na ligação à Cloudinary"
                        : "Cloudinary pronta para configurar"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#5c6c76]">
                    {configQuery.data.cloudinaryConnected
                      ? "Galeria de imagens e fichas técnicas PDF activos na Cloudinary."
                      : configQuery.data.cloudinaryError ?? "Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no Vercel."}
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<Package className="h-5 w-5" />}
              label="Artigos publicados"
              value={catalogQuery.data ? `${activeProductCount} / ${products.length}` : "—"}
              active={activeTab === "products" && productStockFilter === "all"}
              onClick={() => { setProductStockFilter("all"); selectTab("products"); }}
            />
            <StatCard
              icon={<AlertCircle className="h-5 w-5" />}
              label="Alertas de stock"
              value={catalogQuery.data ? String(lowOrOutStockCount) : "—"}
              active={activeTab === "products" && productStockFilter === "low"}
              onClick={() => { setProductStockFilter("low"); selectTab("products"); }}
            />
            <StatCard
              icon={<ClipboardList className="h-5 w-5" />}
              label={newOrdersCount ? `Pedidos (${newOrdersCount} novos)` : "Pedidos registados"}
              value={ordersQuery.data ? String(orders.length) : "—"}
              active={activeTab === "orders"}
              onClick={() => selectTab("orders")}
            />
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="Clientes registados"
              value={customersQuery.data ? String(customers.length) : "—"}
              active={activeTab === "customers"}
              onClick={() => selectTab("customers")}
            />
          </section>

          <section className="border border-[#dce4e9] bg-white">
            {activeTab === "customers" ? (
              <AdminCustomersTab
                onCreateOrderForCustomer={(customer) => {
                  selectTab("orders");
                  openNewOrder(customer);
                }}
                onNotice={setNotice}
              />
            ) : activeTab === "metrics" ? (
              <AdminAnalyticsTab />
            ) : activeTab === "sync" ? (
              <div className="divide-y divide-[#e8edef]">
                <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                  <div className="border border-[#dce4e9] bg-[#fafcfd] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center border border-[#dce9ef] bg-white text-[#007cc3]">
                          <Database className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-base font-semibold text-[#001d3d]">Turso (Base de Dados)</h2>
                          <p className="text-xs text-[#61717b]">Tabelas, categorias, artigos, stock e relações</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        configQuery.data?.tursoConnected ? "text-[#276445]" : "text-[#9c6f00]"
                      }`}>
                        {configQuery.data?.tursoConnected ? (
                          <><CheckCircle2 className="h-4 w-4" /> Conectado</>
                        ) : (
                          <><AlertCircle className="h-4 w-4" /> Pendente</>
                        )}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[#5c6c76]">
                      {configQuery.data?.tursoConnected
                        ? `Ligação verificada em tempo real${configQuery.data.tursoLatencyMs !== null ? ` (${configQuery.data.tursoLatencyMs} ms)` : ""}. Pronto para receber e relacionar categorias e artigos.`
                        : configQuery.data?.tursoError ?? "Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN nas variáveis de ambiente para activar a ligação."}
                    </p>
                  </div>

                  <div className="border border-[#dce4e9] bg-[#fafcfd] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center border border-[#dce9ef] bg-white text-[#007cc3]">
                          <CloudUpload className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-base font-semibold text-[#001d3d]">Cloudinary (Imagens)</h2>
                          <p className="text-xs text-[#61717b]">Pasta bioprev/products</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        configQuery.data?.cloudinaryConnected ? "text-[#276445]" : "text-[#9c6f00]"
                      }`}>
                        {configQuery.data?.cloudinaryConnected ? (
                          <><CheckCircle2 className="h-4 w-4" /> Conectada</>
                        ) : (
                          <><AlertCircle className="h-4 w-4" /> Pendente</>
                        )}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[#5c6c76]">
                      {configQuery.data?.cloudinaryConnected
                        ? "API da Cloudinary autenticada e operacional. As fotografias locais serão enviadas directamente e ligadas aos produtos."
                        : configQuery.data?.cloudinaryError ?? "Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET nas variáveis de ambiente."}
                    </p>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#007cc3]">
                        Conteúdo encontrado no código
                      </p>
                      <h3 className="text-lg font-semibold text-[#001d3d]">
                        {configQuery.data?.codeCatalogSummary
                          ? `${configQuery.data.codeCatalogSummary.categories} categorias · ${configQuery.data.codeCatalogSummary.products} artigos · ${configQuery.data.codeCatalogSummary.productsWithLocalImages} fotografias prontas`
                          : "Catálogo base da loja"}
                      </h3>
                      <p className="max-w-2xl text-sm leading-6 text-[#5f6e78]">
                        Ao executar a sincronização, o sistema cria ou actualiza as categorias, SKU, preços e fichas técnicas no Turso, envia as fotografias do projecto para a Cloudinary e liga todas as relações.
                      </p>
                      <label className="inline-flex items-center gap-2.5 pt-2 text-xs font-medium text-[#455660]">
                        <input
                          type="checkbox"
                          checked={overwriteSyncImages}
                          onChange={(event) => setOverwriteSyncImages(event.target.checked)}
                          className="h-4 w-4 accent-[#007cc3]"
                        />
                        Reenviar e substituir imagens na Cloudinary mesmo para artigos que já tenham imagem associada
                      </label>
                    </div>

                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => void executeSync()}
                        disabled={!configQuery.data?.syncReady || syncRunning || configQuery.isFetching}
                        className={`${actionClass} min-h-12 whitespace-nowrap px-6`}
                      >
                        {syncRunning ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" /> A sincronizar dados…
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" /> Sincronizar catálogo e imagens
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {!configQuery.data?.syncReady && (
                    <div className="mt-5 flex items-start gap-3 border border-[#e9dba3] bg-[#fffdf5] p-4 text-xs leading-5 text-[#7a5a00]">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        O botão de sincronização só é activado quando <strong>ambos</strong> o Turso e a Cloudinary estiverem 100% conectados e validados acima. Depois de configurar as credenciais no Vercel ou nos Secrets, clique em <strong>Verificar ligações</strong>.
                      </span>
                    </div>
                  )}

                  {syncError && (
                    <p role="alert" className="mt-4 border border-[#f0d3cc] bg-[#fff7f5] px-4 py-3 text-sm text-[#914533]">
                      {syncError}
                    </p>
                  )}
                </div>

                {syncResult && (
                  <div className="p-5 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-[#001d3d]">Resultado da última sincronização</h3>
                      <span className="text-xs tabular-nums text-[#64737d]">{formatDateTime(syncResult.syncedAt)}</span>
                    </div>

                    <div className="mb-5 grid gap-3 sm:grid-cols-3">
                      <div className="border border-[#dce4e9] bg-[#f8fafb] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6d7d86]">Categorias no Turso</p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-[#001d3d]">
                          {syncResult.categoriesCreated} criadas · {syncResult.categoriesUpdated} verificadas
                        </p>
                      </div>
                      <div className="border border-[#dce4e9] bg-[#f8fafb] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6d7d86]">Artigos relacionados</p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-[#001d3d]">
                          {syncResult.productsCreated} criados · {syncResult.productsUpdated} actualizados
                        </p>
                      </div>
                      <div className="border border-[#dce4e9] bg-[#f8fafb] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6d7d86]">Imagens Cloudinary</p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-[#001d3d]">
                          {syncResult.imagesUploaded} enviadas · {syncResult.imagesAlreadyLinked} já ligadas
                        </p>
                      </div>
                    </div>

                    <div className="divide-y divide-[#e8edef] border border-[#dce4e9]">
                      {syncResult.items.map((item) => (
                        <div key={item.slug} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} referrerPolicy="no-referrer" className="aspect-[4/3] w-16 shrink-0 border border-[#dce4e9] bg-[#f4f7f9] object-cover" />
                            ) : (
                              <div className="flex aspect-[4/3] w-16 shrink-0 items-center justify-center border border-[#dce4e9] bg-[#f4f7f9] text-[#007cc3]">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-[#001d3d]">{item.name}</p>
                              <p className="text-xs text-[#5d6d77]">
                                Categoria: <strong className="text-[#007cc3]">{item.categoryName}</strong>
                                {item.imagePublicId && (
                                  <> · <span className="font-mono text-[11px]">{item.imagePublicId}</span></>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-semibold">
                            <span className="text-[#276445]">
                              {item.action === "criado" ? "Criado no Turso" : "Actualizado no Turso"}
                            </span>
                            <span aria-hidden="true" className="text-[#b6c2c9]">·</span>
                            <span className="text-[#007cc3]">
                              {item.imageStatus === "enviada_cloudinary"
                                ? "Enviada para Cloudinary"
                                : item.imageStatus === "ja_ligada"
                                  ? "Imagem já ligada"
                                  : "Sem imagem local"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === "orders" ? (
              ordersQuery.isPending ? (
                <div className="divide-y divide-[#e8edef]">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="space-y-2.5 px-6 py-5">
                      <div className="h-3 w-48 animate-pulse bg-[#edf2f5]" />
                      <div className="h-5 w-64 animate-pulse bg-[#edf2f5]" />
                      <div className="h-4 w-80 animate-pulse bg-[#f4f7f9]" />
                    </div>
                  ))}
                </div>
              ) : ordersQuery.error ? (
                <div className="p-6 text-sm leading-6 text-[#914533]">
                  <h2 className="font-semibold text-[#001d3d]">Não foi possível carregar os pedidos</h2>
                  <p className="mt-1">{apiError(ordersQuery.error, "Verifique a ligação à base de dados.")}</p>
                  <button type="button" className={`${secondaryClass} mt-4`} onClick={() => ordersQuery.refetch()}>
                    Tentar novamente
                  </button>
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
                          onOpenDocument={() => setDocumentOrder(order)}
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
                      {!orders.length && (
                        <button type="button" className={`${actionClass} mt-5`} onClick={() => openNewOrder()}>
                          <Plus className="h-4 w-4" /> Registar primeiro pedido
                        </button>
                      )}
                    </div>
                  )}
                </>
              )
            ) : catalogQuery.isPending ? (
              <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="border border-[#e1e7ea] bg-white">
                    <div className="aspect-[4/3] animate-pulse bg-[#edf2f5]" />
                    <div className="space-y-3 p-5">
                      <div className="h-3 w-24 animate-pulse bg-[#edf2f5]" />
                      <div className="h-5 w-3/4 animate-pulse bg-[#edf2f5]" />
                      <div className="h-8 w-full animate-pulse bg-[#f4f7f9]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : catalogQuery.error ? (
              <div className="p-6 text-sm leading-6 text-[#914533]">
                <h2 className="font-semibold text-[#001d3d]">Não foi possível carregar os dados da loja</h2>
                <p className="mt-1">{apiError(catalogQuery.error, "Verifique a ligação à base de dados.")}</p>
                <button type="button" className={`${secondaryClass} mt-4`} onClick={() => catalogQuery.refetch()}>
                  Tentar novamente
                </button>
              </div>
            ) : activeTab === "products" ? (
              <>
                <div className="space-y-3 border-b border-[#e7ecef] p-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <label className="relative block flex-1">
                      <span className="sr-only">Pesquisar artigos</span>
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#87939a]" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Pesquisar por nome, código SKU ou descrição…"
                        className={`${fieldClass} mt-0 pl-10`}
                      />
                    </label>
                    <label className="sm:w-52">
                      <span className="sr-only">Filtrar por categoria</span>
                      <select
                        value={categoryFilter}
                        onChange={(event) => setCategoryFilter(event.target.value)}
                        className={`${fieldClass} mt-0`}
                      >
                        <option value="all">Todas as categorias</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </label>
                    <div className="flex shrink-0 border border-[#cbd6dc] bg-[#f8fafb] p-0.5" role="group" aria-label="Modo de visualização">
                      <button
                        type="button"
                        onClick={() => setProductView("grid")}
                        aria-pressed={productView === "grid"}
                        className={`inline-flex min-h-9 items-center gap-1.5 px-3 text-xs font-semibold transition-colors ${
                          productView === "grid" ? "bg-white text-[#001d3d] shadow-xs" : "text-[#5f6e78] hover:text-[#001d3d]"
                        }`}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" /> Grelha
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductView("list")}
                        aria-pressed={productView === "list"}
                        className={`inline-flex min-h-9 items-center gap-1.5 px-3 text-xs font-semibold transition-colors ${
                          productView === "list" ? "bg-white text-[#001d3d] shadow-xs" : "text-[#5f6e78] hover:text-[#001d3d]"
                        }`}
                      >
                        <List className="h-3.5 w-3.5" /> Lista
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1 border border-[#dce4e9] bg-[#f4f7f9] p-0.5" role="group" aria-label="Filtro de inventário">
                      {(
                        [
                          { id: "all", label: "Todos" },
                          { id: "low", label: "Stock baixo" },
                          { id: "out", label: "Esgotados" },
                          { id: "featured", label: "Recomendados" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          aria-pressed={productStockFilter === opt.id}
                          onClick={() => setProductStockFilter(opt.id)}
                          className={`min-h-8 px-3 text-xs font-semibold transition-colors ${
                            productStockFilter === opt.id ? "bg-white text-[#001d3d] shadow-xs" : "text-[#586771] hover:text-[#001d3d]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {lowOrOutStockCount > 0 && productStockFilter === "all" && (
                      <button
                        type="button"
                        onClick={() => setProductStockFilter("low")}
                        className="text-xs font-semibold text-[#8a6500] hover:underline tabular-nums"
                      >
                        {lowOrOutStockCount} {lowOrOutStockCount === 1 ? "artigo precisa" : "artigos precisam"} de reposição
                      </button>
                    )}
                  </div>
                </div>

                {visibleProducts.length ? (
                  productView === "grid" ? (
                    <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
                      {visibleProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onEdit={() => openEditProduct(product)}
                          onDelete={() => setConfirmTarget({ kind: "product", item: product })}
                        />
                      ))}
                    </div>
                  ) : (
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
                  )
                ) : (
                  <div className="px-6 py-14 text-center">
                    <Package className="mx-auto h-9 w-9 text-[#94a2aa]" />
                    <h2 className="mt-3 font-semibold text-[#001d3d]">{products.length ? "Nenhum artigo encontrado" : "Ainda não há artigos"}</h2>
                    <p className="mt-1 text-sm text-[#697780]">{products.length ? "Altere a pesquisa ou o filtro de categoria." : "Adicione o primeiro artigo para começar o catálogo."}</p>
                    {!products.length && categories.length > 0 && (
                      <button type="button" className={`${actionClass} mt-5`} onClick={openNewProduct}>
                        <Plus className="h-4 w-4" /> Adicionar primeiro artigo
                      </button>
                    )}
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
                  <div className="col-span-full py-12 text-center text-sm text-[#697780]">
                    Ainda não há categorias. Crie uma para começar.
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Product Create / Edit Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={(open) => { if (!open) void closeProductDialog(); }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-t-4 border-t-[#f2c92f] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#001d3d]">{editingProductId ? "Editar artigo" : "Adicionar artigo"}</DialogTitle>
            <DialogDescription>Configure preço, SKU, stock, galeria de fotos e ficha técnica para a loja.</DialogDescription>
          </DialogHeader>
          {productDraft && (
            <form onSubmit={saveProduct} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Nome do artigo *
                  <input required maxLength={120} value={productDraft.name} onChange={(e) => setProductDraft({ ...productDraft, name: e.target.value })} className={fieldClass} />
                </label>
                <label className={labelClass}>
                  Categoria *
                  <select required value={productDraft.categoryId} onChange={(e) => setProductDraft({ ...productDraft, categoryId: e.target.value })} className={fieldClass}>
                    <option value="" disabled>Seleccione uma categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}{category.isActive ? "" : " (inactiva)"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Código interno (SKU)
                  <input maxLength={40} value={productDraft.sku} onChange={(e) => setProductDraft({ ...productDraft, sku: e.target.value })} placeholder="Ex.: BP-MON-001" className={fieldClass} />
                </label>
                <label className={labelClass}>
                  Endereço do artigo (slug)
                  <input maxLength={140} value={productDraft.slug} onChange={(e) => setProductDraft({ ...productDraft, slug: e.target.value })} placeholder="Gerado automaticamente se ficar vazio" className={fieldClass} />
                </label>
              </div>

              <div className="grid gap-4 border border-[#e2e8ec] bg-[#f8fafb] p-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Preço em Kwanzas (vazio = Sob consulta)
                  <input
                    type="number"
                    min={0}
                    max={1000000000}
                    step={1}
                    value={productDraft.priceAoa === null ? "" : productDraft.priceAoa}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setProductDraft({ ...productDraft, priceAoa: val === "" ? null : Math.max(0, Math.trunc(Number(val) || 0)) });
                    }}
                    placeholder="Sob consulta"
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  Unidade de venda
                  <input
                    maxLength={40}
                    value={productDraft.unitLabel}
                    onChange={(e) => setProductDraft({ ...productDraft, unitLabel: e.target.value })}
                    placeholder="Ex.: unidade, caixa, litro"
                    className={fieldClass}
                  />
                </label>

                <label className={labelClass}>
                  Controlo de disponibilidade
                  <select
                    value={productDraft.stockMode}
                    onChange={(e) => setProductDraft({ ...productDraft, stockMode: e.target.value as ProductStockMode })}
                    className={fieldClass}
                  >
                    <option value="stock">Com controlo de stock</option>
                    <option value="por_encomenda">Por encomenda (sempre disponível sob consulta)</option>
                  </select>
                </label>

                {productDraft.stockMode === "stock" && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className={labelClass}>
                      Qtd. em stock
                      <input
                        type="number"
                        min={0}
                        max={1000000}
                        value={productDraft.stockQuantity}
                        onChange={(e) => setProductDraft({ ...productDraft, stockQuantity: Math.max(0, Number(e.target.value) || 0) })}
                        className={fieldClass}
                      />
                    </label>
                    <label className={labelClass}>
                      Alerta baixo
                      <input
                        type="number"
                        min={0}
                        max={100000}
                        value={productDraft.lowStockThreshold}
                        onChange={(e) => setProductDraft({ ...productDraft, lowStockThreshold: Math.max(0, Number(e.target.value) || 0) })}
                        className={fieldClass}
                      />
                    </label>
                  </div>
                )}
              </div>

              <label className={labelClass}>
                Descrição curta *
                <textarea required minLength={5} maxLength={220} rows={2} value={productDraft.shortDescription} onChange={(e) => setProductDraft({ ...productDraft, shortDescription: e.target.value })} className={`${fieldClass} resize-y`} />
              </label>
              <label className={labelClass}>
                Descrição completa
                <textarea maxLength={3000} rows={3} value={productDraft.description} onChange={(e) => setProductDraft({ ...productDraft, description: e.target.value })} className={`${fieldClass} resize-y`} />
              </label>

              {/* Main Image */}
              <div>
                <span className={labelClass}>Imagem principal (Cloudinary)</span>
                <div className="mt-2 flex flex-col gap-4 border border-dashed border-[#cbd6dc] bg-[#f8fafb] p-4 sm:flex-row sm:items-center">
                  {imagePreview || defaultProductPreview ? (
                    <img
                      src={imagePreview ?? defaultProductPreview ?? undefined}
                      alt="Pré-visualização do artigo"
                      referrerPolicy="no-referrer"
                      className="aspect-[4/3] w-36 shrink-0 border border-[#dce4e8] bg-white object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] w-36 shrink-0 items-center justify-center border border-[#dce4e8] bg-white text-[#96a4ac]">
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
                        onChange={(e) => { void handleImageSelected(e.target.files?.[0]); e.target.value = ""; }}
                      />
                    </label>
                    {imagePreview && (
                      <button
                        type="button"
                        className={secondaryClass}
                        onClick={() => {
                          setProductDraft({ ...productDraft, imagePublicId: null });
                          setImagePreview(null);
                        }}
                      >
                        Remover imagem
                      </button>
                    )}
                    <p className="basis-full text-xs text-[#687780]">
                      {defaultProductPreview
                        ? "A usar a fotografia padrão do catálogo. Pode substituí-la enviando uma foto para a Cloudinary."
                        : "JPG, PNG, WebP ou AVIF; máximo 5 MB."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Extra Gallery Images */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className={labelClass}>Galeria de imagens adicionais ({productDraft.galleryImages.length})</span>
                  <label className={`${secondaryClass} min-h-9 cursor-pointer px-3 text-xs`}>
                    {galleryUploading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    {galleryUploading ? "A enviar…" : "Adicionar foto"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="sr-only"
                      disabled={galleryUploading}
                      onChange={(e) => { void handleGalleryImageSelected(e.target.files?.[0]); e.target.value = ""; }}
                    />
                  </label>
                </div>
                {productDraft.galleryImages.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {productDraft.galleryImages.map((img, idx) => (
                      <div key={`${img.imagePublicId}-${idx}`} className="relative border border-[#dce4e9] bg-white">
                        {img.imageUrl ? (
                          <img src={img.imageUrl} alt={img.altText || productDraft.name} referrerPolicy="no-referrer" className="aspect-[4/3] w-full object-cover" />
                        ) : (
                          <div className="flex aspect-[4/3] items-center justify-center bg-[#f4f7f9] text-xs text-[#687780]">Foto</div>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setProductDraft({
                              ...productDraft,
                              galleryImages: productDraft.galleryImages.filter((_, i) => i !== idx),
                            })
                          }
                          aria-label="Remover foto da galeria"
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-[#001d3d]/80 text-white hover:bg-[#914533]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Technical Specifications */}
              <div className="border border-[#e2e8ec] bg-[#f8fafb] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#263b49]">Especificações técnicas</span>
                  <button
                    type="button"
                    onClick={() =>
                      setProductDraft({
                        ...productDraft,
                        specs: [...productDraft.specs, { label: "", value: "" }],
                      })
                    }
                    className={`${secondaryClass} min-h-9 px-3 text-xs`}
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar linha
                  </button>
                </div>
                {productDraft.specs.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {productDraft.specs.map((spec, idx) => (
                      <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                        <input
                          value={spec.label}
                          maxLength={80}
                          placeholder="Característica (ex.: Capacidade)"
                          onChange={(e) => {
                            const next = [...productDraft.specs];
                            next[idx] = { ...next[idx], label: e.target.value };
                            setProductDraft({ ...productDraft, specs: next });
                          }}
                          className={`${fieldClass} mt-0 min-h-9 py-1.5`}
                        />
                        <input
                          value={spec.value}
                          maxLength={160}
                          placeholder="Valor (ex.: 5 Litros)"
                          onChange={(e) => {
                            const next = [...productDraft.specs];
                            next[idx] = { ...next[idx], value: e.target.value };
                            setProductDraft({ ...productDraft, specs: next });
                          }}
                          className={`${fieldClass} mt-0 min-h-9 py-1.5`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setProductDraft({
                              ...productDraft,
                              specs: productDraft.specs.filter((_, i) => i !== idx),
                            })
                          }
                          aria-label="Remover especificação"
                          className="inline-flex h-10 items-center justify-center border border-[#e7d2cf] bg-white px-2.5 text-[#9c4e40] hover:bg-[#fff7f5]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[#687780]">
                    Adicione atributos como material, dimensões, capacidade ou normas para exibir na página do produto.
                  </p>
                )}
              </div>

              {/* PDF Technical Datasheet */}
              <div className="border border-[#e2e8ec] bg-[#f8fafb] p-4">
                <span className="block text-sm font-semibold text-[#263b49]">Ficha técnica (PDF)</span>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className={`${secondaryClass} min-h-9 cursor-pointer px-3 text-xs`}>
                    {datasheetUploading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                    {datasheetUploading ? "A enviar PDF…" : "Carregar PDF (Cloudinary)"}
                    <input
                      type="file"
                      accept="application/pdf"
                      className="sr-only"
                      disabled={datasheetUploading}
                      onChange={(e) => { void handleDatasheetSelected(e.target.files?.[0]); e.target.value = ""; }}
                    />
                  </label>
                  {productDraft.datasheetPublicId && (
                    <span className="inline-flex items-center gap-2 border border-[#cce4d7] bg-[#f1f8f4] px-2.5 py-1 text-xs font-semibold text-[#276445]">
                      PDF carregado
                      <button
                        type="button"
                        onClick={() => setProductDraft({ ...productDraft, datasheetPublicId: null })}
                        aria-label="Remover PDF"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                </div>
                <label className="mt-3 block text-xs font-medium text-[#54646e]">
                  Ou link externo HTTPS para ficha técnica PDF (opcional)
                  <input
                    type="url"
                    maxLength={500}
                    value={productDraft.datasheetExternalUrl}
                    onChange={(e) => setProductDraft({ ...productDraft, datasheetExternalUrl: e.target.value })}
                    placeholder="https://..."
                    className={`${fieldClass} mt-1 min-h-9 py-1.5`}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className={labelClass}>
                  Ordem no catálogo
                  <input type="number" min={0} max={10000} step={1} value={productDraft.sortOrder} onChange={(e) => setProductDraft({ ...productDraft, sortOrder: Number(e.target.value) })} className={fieldClass} />
                </label>
                <label className="flex min-h-11 items-center gap-3 self-end border border-[#dfe7eb] px-3 py-2.5 text-sm font-semibold text-[#344754]">
                  <input type="checkbox" checked={productDraft.isActive} onChange={(e) => setProductDraft({ ...productDraft, isActive: e.target.checked })} className="h-4 w-4 accent-[#007cc3]" />
                  Publicar na loja
                </label>
                <label className="flex min-h-11 items-center gap-3 self-end border border-[#dfe7eb] px-3 py-2.5 text-sm font-semibold text-[#344754]">
                  <input type="checkbox" checked={productDraft.isFeatured} onChange={(e) => setProductDraft({ ...productDraft, isFeatured: e.target.checked })} className="h-4 w-4 accent-[#007cc3]" />
                  Recomendado
                </label>
              </div>

              {productFormError && <p role="alert" className="border border-[#f0d3cc] bg-[#fff7f5] px-3 py-2 text-sm text-[#914533]">{productFormError}</p>}
              <div className="flex flex-wrap justify-end gap-3 border-t border-[#e6ecef] pt-4">
                <button type="button" className={secondaryClass} onClick={() => void closeProductDialog()} disabled={productSaving}>Cancelar</button>
                <button
                  type="submit"
                  className={actionClass}
                  disabled={productSaving || imageUploading || galleryUploading || datasheetUploading || !categories.some((category) => category.isActive)}
                >
                  {productSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {productSaving ? "A guardar…" : "Guardar artigo"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
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
                <input required minLength={2} maxLength={80} value={categoryDraft.name} onChange={(e) => setCategoryDraft({ ...categoryDraft, name: e.target.value })} className={fieldClass} />
              </label>
              <label className={labelClass}>
                Endereço da categoria (slug)
                <input maxLength={100} value={categoryDraft.slug} onChange={(e) => setCategoryDraft({ ...categoryDraft, slug: e.target.value })} placeholder="Gerado automaticamente se ficar vazio" className={fieldClass} />
              </label>
              <label className={labelClass}>
                Descrição
                <textarea maxLength={300} rows={3} value={categoryDraft.description} onChange={(e) => setCategoryDraft({ ...categoryDraft, description: e.target.value })} className={`${fieldClass} resize-y`} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Ordem de apresentação
                  <input type="number" min={0} max={10000} value={categoryDraft.sortOrder} onChange={(e) => setCategoryDraft({ ...categoryDraft, sortOrder: Number(e.target.value) })} className={fieldClass} />
                </label>
                <label className="flex min-h-11 items-center gap-3 self-end border border-[#dfe7eb] px-3 py-2.5 text-sm font-semibold text-[#344754]">
                  <input type="checkbox" checked={categoryDraft.isActive} onChange={(e) => setCategoryDraft({ ...categoryDraft, isActive: e.target.checked })} className="h-4 w-4 accent-[#007cc3]" />
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

      {/* Multi-item Order Create / Edit Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={(open) => { if (!open) { setOrderDialogOpen(false); setOrderDraft(null); } }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-t-4 border-t-[#f2c92f] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#001d3d]">{editingOrderId ? "Editar pedido" : "Registar pedido"}</DialogTitle>
            <DialogDescription>
              Suporta vários artigos por encomenda. Ao marcar como Confirmado ou Entregue, o stock é actualizado automaticamente.
            </DialogDescription>
          </DialogHeader>
          {orderDraft && (
            <form onSubmit={saveOrder} className="space-y-4">
              {!editingOrderId && customers.length > 0 && (
                <label className={labelClass}>
                  Preencher a partir de cliente registado (opcional)
                  <select
                    value={orderDraft.customerId ?? ""}
                    onChange={(e) => {
                      const cid = e.target.value || null;
                      const found = customers.find((c) => c.id === cid);
                      setOrderDraft({
                        ...orderDraft,
                        customerId: cid,
                        customerName: found ? found.name : orderDraft.customerName,
                        telephone: found ? found.telephone : orderDraft.telephone,
                        address: found ? found.defaultAddress || orderDraft.address : orderDraft.address,
                        city: found ? found.defaultCity || orderDraft.city : orderDraft.city,
                      });
                    }}
                    className={fieldClass}
                  >
                    <option value="">Novo contacto ou escrever manualmente</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.telephone}){c.defaultCity ? ` · ${c.defaultCity}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="border border-[#e2e8ec] bg-[#f8fafb] p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#001d3d]">
                    Artigos do pedido ({orderDraft.items.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const first = products[0];
                      setOrderDraft({
                        ...orderDraft,
                        items: [
                          ...orderDraft.items,
                          {
                            productId: first?.id ?? null,
                            productName: first?.name ?? "",
                            sku: first?.sku ?? "",
                            quantity: 1,
                            unitPriceAoa: first?.priceAoa ?? null,
                            unitLabel: first?.unitLabel ?? "unidade",
                          },
                        ],
                      });
                    }}
                    className={`${secondaryClass} min-h-9 px-3 text-xs`}
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar artigo
                  </button>
                </div>

                <div className="space-y-3">
                  {orderDraft.items.map((item, idx) => (
                    <div key={idx} className="grid gap-2 border border-[#dce4e9] bg-white p-3 sm:grid-cols-12 sm:items-end">
                      <label className="block text-xs font-semibold text-[#455660] sm:col-span-4">
                        Catálogo
                        <select
                          value={item.productId ?? ""}
                          onChange={(e) => {
                            const nextId = e.target.value || null;
                            const found = products.find((p) => p.id === nextId);
                            const nextItems = [...orderDraft.items];
                            nextItems[idx] = {
                              ...nextItems[idx],
                              productId: nextId,
                              productName: found ? found.name : nextItems[idx].productName,
                              sku: found ? found.sku : nextItems[idx].sku,
                              unitPriceAoa: found ? found.priceAoa : nextItems[idx].unitPriceAoa,
                              unitLabel: found ? found.unitLabel : nextItems[idx].unitLabel,
                            };
                            setOrderDraft({ ...orderDraft, items: nextItems });
                          }}
                          className={`${fieldClass} mt-1 min-h-9 py-1.5 text-xs`}
                        >
                          <option value="">Artigo manual</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({formatKwanza(p.priceAoa)})
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block text-xs font-semibold text-[#455660] sm:col-span-3">
                        Descrição *
                        <input
                          required
                          minLength={2}
                          maxLength={160}
                          value={item.productName}
                          onChange={(e) => {
                            const nextItems = [...orderDraft.items];
                            nextItems[idx] = { ...nextItems[idx], productName: e.target.value };
                            setOrderDraft({ ...orderDraft, items: nextItems });
                          }}
                          className={`${fieldClass} mt-1 min-h-9 py-1.5 text-xs`}
                        />
                      </label>

                      <label className="block text-xs font-semibold text-[#455660] sm:col-span-2">
                        Qtd. *
                        <input
                          type="number"
                          required
                          min={1}
                          max={10000}
                          value={item.quantity}
                          onChange={(e) => {
                            const nextItems = [...orderDraft.items];
                            nextItems[idx] = { ...nextItems[idx], quantity: Math.max(1, Number(e.target.value) || 1) };
                            setOrderDraft({ ...orderDraft, items: nextItems });
                          }}
                          className={`${fieldClass} mt-1 min-h-9 py-1.5 text-xs tabular-nums`}
                        />
                      </label>

                      <label className="block text-xs font-semibold text-[#455660] sm:col-span-2">
                        Preço (Kz)
                        <input
                          type="number"
                          min={0}
                          value={item.unitPriceAoa === null ? "" : item.unitPriceAoa}
                          placeholder="Consulta"
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            const nextItems = [...orderDraft.items];
                            nextItems[idx] = {
                              ...nextItems[idx],
                              unitPriceAoa: val === "" ? null : Math.max(0, Math.trunc(Number(val) || 0)),
                            };
                            setOrderDraft({ ...orderDraft, items: nextItems });
                          }}
                          className={`${fieldClass} mt-1 min-h-9 py-1.5 text-xs tabular-nums`}
                        />
                      </label>

                      <div className="flex justify-end sm:col-span-1">
                        <button
                          type="button"
                          disabled={orderDraft.items.length <= 1}
                          onClick={() =>
                            setOrderDraft({
                              ...orderDraft,
                              items: orderDraft.items.filter((_, i) => i !== idx),
                            })
                          }
                          aria-label="Remover artigo do pedido"
                          className="inline-flex h-9 w-9 items-center justify-center border border-[#e7d2cf] text-[#9c4e40] hover:bg-[#fff7f5] disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Estado *
                  <select
                    value={orderDraft.status}
                    onChange={(e) => setOrderDraft({ ...orderDraft, status: e.target.value as StoreOrderStatus })}
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
                    onChange={(e) => setOrderDraft({ ...orderDraft, source: e.target.value as StoreOrderSource })}
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
                    onChange={(e) => setOrderDraft({ ...orderDraft, customerName: e.target.value })}
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
                    onChange={(e) => setOrderDraft({ ...orderDraft, telephone: e.target.value })}
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
                    onChange={(e) => setOrderDraft({ ...orderDraft, address: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  Cidade
                  <input
                    maxLength={100}
                    value={orderDraft.city}
                    onChange={(e) => setOrderDraft({ ...orderDraft, city: e.target.value })}
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
                  onChange={(e) => setOrderDraft({ ...orderDraft, deliveryNotes: e.target.value })}
                  className={`${fieldClass} resize-y`}
                />
              </label>

              <label className={labelClass}>
                Notas internas da equipa
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={orderDraft.adminNotes}
                  onChange={(e) => setOrderDraft({ ...orderDraft, adminNotes: e.target.value })}
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

      {/* Printable Orçamento / Nota de Entrega PDF Dialog */}
      <AdminOrderDocumentDialog
        order={documentOrder}
        open={Boolean(documentOrder)}
        onOpenChange={(open) => { if (!open) setDocumentOrder(null); }}
      />

      {/* Delete Confirmation Dialog */}
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

function StatCard({
  icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 border bg-white px-5 py-4 text-left transition-colors ${
        active ? "border-[#007cc3]" : "border-[#dce4e9] hover:border-[#007cc3]"
      }`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#dce9ef] bg-[#f1f7fa] text-[#007cc3]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#718089]">{label}</p>
        <p className="mt-1 text-2xl font-semibold leading-none tabular-nums text-[#001d3d]">{value}</p>
      </div>
    </button>
  );
}

function ProductCard({ product, onEdit, onDelete }: { product: StoreProduct; onEdit: () => void; onDelete: () => void }) {
  const imageSrc = resolveProductImage(product);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const stock = stockStatusInfo(product);

  return (
    <article className="group flex flex-col border border-[#dce4e9] bg-white transition-colors hover:border-[#007cc3]">
      <div className="aspect-[4/3] w-full overflow-hidden border-b border-[#e5ebee] bg-[#f4f7f9]">
        {imageSrc && failedSrc !== imageSrc ? (
          <img
            src={imageSrc}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={() => setFailedSrc(imageSrc)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#6b7b85]">
            <Package className="h-8 w-8 text-[#007cc3]" strokeWidth={1.4} />
            <span className="text-xs">Sem imagem</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="font-bold uppercase tracking-[0.08em] text-[#007cc3]">{product.categoryName}</span>
          <span aria-hidden="true" className="text-[#b6c2c9]">·</span>
          <span className={`font-semibold ${product.isActive ? "text-[#276445]" : "text-[#697780]"}`}>
            {product.isActive ? "Publicado" : "Rascunho"}
          </span>
          <span aria-hidden="true" className="text-[#b6c2c9]">·</span>
          <span className={`font-semibold tabular-nums ${stock.textClass}`}>{stock.shortLabel}</span>
        </div>
        <h3 className="mt-1.5 text-base font-semibold leading-snug text-[#001d3d]">{product.name}</h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-5 text-[#62727c]">{product.shortDescription}</p>
        <div className="mt-3 flex items-baseline justify-between gap-2 text-xs">
          <span className="font-bold tabular-nums text-[#001d3d]">{formatKwanza(product.priceAoa)}</span>
          <span className="font-mono text-[#7c8b94]">{product.sku || `/${product.slug}`}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#e8edef] pt-3">
          <span className="text-xs tabular-nums text-[#61717b]">
            {product.stockMode === "stock" ? `Stock: ${product.stockQuantity}` : "Sob encomenda"}
          </span>
          <div className="flex shrink-0 gap-2">
            <button type="button" className={secondaryClass} onClick={onEdit} aria-label={`Editar ${product.name}`}>
              <Pencil className="h-4 w-4" /> Editar
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center border border-[#e7d2cf] px-3 text-[#9c4e40] transition-colors hover:bg-[#fff7f5]"
              onClick={onDelete}
              aria-label={`Apagar ${product.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProductRow({ product, onEdit, onDelete }: { product: StoreProduct; onEdit: () => void; onDelete: () => void }) {
  const imageSrc = resolveProductImage(product);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const stock = stockStatusInfo(product);

  return (
    <article className="flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-[#fafcfd] sm:flex-row sm:items-center sm:px-6">
      <div className="aspect-[4/3] w-28 shrink-0 overflow-hidden border border-[#e0e7eb] bg-[#f4f7f9]">
        {imageSrc && failedSrc !== imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setFailedSrc(imageSrc)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#007cc3]">
            <Package className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="font-bold uppercase tracking-[0.08em] text-[#007cc3]">{product.categoryName}</span>
          <span aria-hidden="true" className="text-[#b6c2c9]">·</span>
          <span className={`font-semibold ${product.isActive ? "text-[#276445]" : "text-[#697780]"}`}>
            {product.isActive ? "Publicado" : "Rascunho"}
          </span>
          <span aria-hidden="true" className="text-[#b6c2c9]">·</span>
          <span className={`font-semibold tabular-nums ${stock.textClass}`}>{stock.label}</span>
          {product.sku && (
            <>
              <span aria-hidden="true" className="text-[#b6c2c9]">·</span>
              <span className="font-mono text-[#7c8b94]">{product.sku}</span>
            </>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <h3 className="font-semibold text-[#001d3d]">{product.name}</h3>
          <span className="text-sm font-bold tabular-nums text-[#001d3d]">{formatKwanza(product.priceAoa)}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#62727c]">{product.shortDescription}</p>
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
    <article className="flex min-h-44 flex-col border border-[#dce4e9] bg-white p-5 transition-colors hover:border-[#007cc3]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold ${category.isActive ? "text-[#276445]" : "text-[#697780]"}`}>
            {category.isActive ? "Activa" : "Inactiva"}
          </p>
          <h3 className="mt-1 font-semibold text-[#001d3d]">{category.name}</h3>
        </div>
        <span className="font-mono text-xs text-[#77858d]">/{category.slug}</span>
      </div>
      <p className="mt-3 flex-1 text-sm leading-5 text-[#65747e]">{category.description || "Sem descrição."}</p>
      <div className="mt-4 flex items-center justify-between border-t border-[#e8edef] pt-3">
        <span className="text-xs font-medium tabular-nums text-[#687780]">
          {category.productCount} {category.productCount === 1 ? "artigo" : "artigos"}
        </span>
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
  onOpenDocument,
  onEdit,
  onDelete,
}: {
  order: StoreOrder;
  onStatusChange: (status: StoreOrderStatus) => void;
  onOpenDocument: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="flex flex-col gap-4 px-4 py-5 transition-colors hover:bg-[#fafcfd] sm:px-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
          <span className="font-mono font-bold tabular-nums text-[#001d3d]">{order.reference}</span>
          <span aria-hidden="true" className="text-[#b6c2c9]">·</span>
          <span className={`font-semibold ${orderStatusTextClass[order.status]}`}>
            {orderStatusLabel[order.status]}
          </span>
          <span aria-hidden="true" className="text-[#b6c2c9]">·</span>
          <span className="text-[#5a6b75]">{orderSourceLabel[order.source]}</span>
          <span aria-hidden="true" className="text-[#b6c2c9]">·</span>
          <span className="tabular-nums text-[#798790]">{formatDateTime(order.createdAt)}</span>
          {order.stockDeducted && (
            <>
              <span aria-hidden="true" className="text-[#b6c2c9]">·</span>
              <span className="font-medium text-[#276445]">Stock reservado</span>
            </>
          )}
        </div>

        <div className="space-y-1">
          {order.items.map((item) => (
            <p key={item.id} className="text-sm font-semibold text-[#001d3d]">
              {item.productName}{" "}
              <span className="tabular-nums text-[#007cc3]">× {item.quantity}</span>
              {item.subtotalAoa !== null && (
                <span className="ml-2 text-xs font-medium tabular-nums text-[#54646e]">
                  ({formatKwanza(item.subtotalAoa)})
                </span>
              )}
            </p>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#4e5f69]">
          {order.customerName && <span className="font-medium text-[#001d3d]">{order.customerName}</span>}
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Phone className="h-3.5 w-3.5 text-[#007cc3]" /> {order.telephone}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-[#007cc3]" />
            {order.address}{order.city ? `, ${order.city}` : ""}
          </span>
          {order.totalAoa !== null && (
            <span className="font-bold tabular-nums text-[#001d3d]">
              Total: {formatKwanza(order.totalAoa)}
            </span>
          )}
        </div>

        {order.deliveryNotes && (
          <p className="text-xs text-[#61717b]">
            <strong>Notas de entrega:</strong> {order.deliveryNotes}
          </p>
        )}
        {order.adminNotes && (
          <p className="border border-[#e6ecef] bg-[#f8fafb] px-3 py-2 text-xs text-[#4f5f69]">
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
        <button
          type="button"
          onClick={onOpenDocument}
          className={`${secondaryClass} whitespace-nowrap`}
          title="Emitir Orçamento ou Nota de Entrega (PDF)"
        >
          <Printer className="h-4 w-4" /> PDF
        </button>
        <a
          href={whatsappHrefForOrder(order)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${secondaryClass} whitespace-nowrap`}
          title="Responder ao cliente pelo WhatsApp"
        >
          WhatsApp <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
        <button type="button" className={`${secondaryClass} whitespace-nowrap`} onClick={onEdit} aria-label={`Editar pedido ${order.reference}`}>
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
