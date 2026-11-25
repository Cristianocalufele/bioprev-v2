import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  LoaderCircle,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StoreCustomer, StoreOrder } from "@shared/store";
import { fetchAdminCustomers, fetchCustomerOrders, storeApi } from "@/lib/storeApi";
import { formatKwanza } from "@/lib/storeFormat";

const fieldClass =
  "mt-1.5 min-h-11 w-full border border-[#cbd6dc] bg-white px-3 py-2.5 text-sm text-[#001d3d] outline-none placeholder:text-[#89969e] focus:border-[#007cc3] focus:ring-2 focus:ring-[#007cc3]/15";
const labelClass = "block text-sm font-semibold text-[#263b49]";
const actionClass =
  "inline-flex min-h-10 items-center justify-center gap-2 border border-[#007cc3] bg-[#007cc3] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#006ba9] disabled:cursor-not-allowed disabled:opacity-55";
const secondaryClass =
  "inline-flex min-h-10 items-center justify-center gap-2 border border-[#cbd6dc] bg-white px-4 py-2 text-sm font-semibold text-[#344754] transition-colors hover:border-[#007cc3] hover:text-[#007cc3] disabled:cursor-not-allowed disabled:opacity-55";

type CustomerDraft = {
  name: string;
  telephone: string;
  email: string;
  nif: string;
  defaultAddress: string;
  defaultCity: string;
  notes: string;
};

export function AdminCustomersTab({
  onCreateOrderForCustomer,
  onNotice,
}: {
  onCreateOrderForCustomer: (customer: StoreCustomer) => void;
  onNotice: (notice: { kind: "success" | "error"; text: string }) => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CustomerDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [historyCustomer, setHistoryCustomer] = useState<StoreCustomer | null>(null);

  const customersQuery = useQuery({
    queryKey: ["store-admin", "customers"],
    queryFn: fetchAdminCustomers,
    retry: false,
  });

  const customerOrdersQuery = useQuery({
    queryKey: ["store-admin", "customer-orders", historyCustomer?.id],
    queryFn: () => fetchCustomerOrders(historyCustomer!.id),
    enabled: Boolean(historyCustomer),
    retry: false,
  });

  const customers = customersQuery.data ?? [];

  const visibleCustomers = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt");
    if (!q) return customers;
    return customers.filter((c) =>
      `${c.name} ${c.telephone} ${c.nif} ${c.email} ${c.defaultCity} ${c.defaultAddress}`
        .toLocaleLowerCase("pt")
        .includes(q),
    );
  }, [customers, search]);

  const recurringCount = customers.filter((c) => c.orderCount >= 2).length;
  const totalVolumeAoa = customers.reduce((sum, c) => sum + c.totalSpentAoa, 0);

  const openNewCustomer = () => {
    setEditingCustomerId(null);
    setDraft({
      name: "",
      telephone: "",
      email: "",
      nif: "",
      defaultAddress: "",
      defaultCity: "",
      notes: "",
    });
    setFormError("");
    setDialogOpen(true);
  };

  const openEditCustomer = (c: StoreCustomer) => {
    setEditingCustomerId(c.id);
    setDraft({
      name: c.name,
      telephone: c.telephone,
      email: c.email,
      nif: c.nif,
      defaultAddress: c.defaultAddress,
      defaultCity: c.defaultCity,
      notes: c.notes,
    });
    setFormError("");
    setDialogOpen(true);
  };

  const saveCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setFormError("");
    try {
      await storeApi<StoreCustomer>(
        editingCustomerId ? `/api/admin/customers/${editingCustomerId}` : "/api/admin/customers",
        {
          method: editingCustomerId ? "PATCH" : "POST",
          body: JSON.stringify(draft),
        },
      );
      setDialogOpen(false);
      setDraft(null);
      onNotice({
        kind: "success",
        text: editingCustomerId ? "Ficha de cliente actualizada." : "Cliente registado com sucesso.",
      });
      await queryClient.invalidateQueries({ queryKey: ["store-admin", "customers"] });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível guardar o cliente.");
    } finally {
      setSaving(false);
    }
  };

  if (customersQuery.isPending) {
    return (
      <div className="divide-y divide-[#e8edef]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2.5 px-6 py-5">
            <div className="h-4 w-48 animate-pulse bg-[#edf2f5]" />
            <div className="h-3 w-72 animate-pulse bg-[#f4f7f9]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 border-b border-[#e7ecef] bg-[#fafcfd] p-4 sm:grid-cols-3 sm:px-6">
        <div className="border border-[#dce4e9] bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6d7d86]">Clientes consolidados</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[#001d3d]">{customers.length}</p>
        </div>
        <div className="border border-[#dce4e9] bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6d7d86]">Recorrentes (2+ pedidos)</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[#007cc3]">{recurringCount}</p>
        </div>
        <div className="border border-[#dce4e9] bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6d7d86]">Volume registado</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[#001d3d]">{formatKwanza(totalVolumeAoa)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-[#e7ecef] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <label className="relative block flex-1">
          <span className="sr-only">Pesquisar clientes</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#87939a]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar por nome, empresa, telefone, NIF ou cidade…"
            className={`${fieldClass} mt-0 pl-10`}
          />
        </label>
        <button type="button" onClick={openNewCustomer} className={`${actionClass} whitespace-nowrap`}>
          <Plus className="h-4 w-4" /> Adicionar cliente
        </button>
      </div>

      {visibleCustomers.length > 0 ? (
        <div className="divide-y divide-[#e8edef]">
          {visibleCustomers.map((customer) => (
            <article
              key={customer.id}
              className="flex flex-col gap-4 px-4 py-5 transition-colors hover:bg-[#fafcfd] sm:px-6 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                  <span className="font-bold text-[#001d3d]">{customer.name || "Cliente"}</span>
                  {customer.nif && (
                    <>
                      <span aria-hidden="true" className="text-[#b6c2c9]">·</span>
                      <span className="font-mono text-[#5a6b75]">NIF {customer.nif}</span>
                    </>
                  )}
                  <span aria-hidden="true" className="text-[#b6c2c9]">·</span>
                  <span className="font-semibold tabular-nums text-[#007cc3]">
                    {customer.orderCount} {customer.orderCount === 1 ? "pedido" : "pedidos"}
                  </span>
                  {customer.totalSpentAoa > 0 && (
                    <>
                      <span aria-hidden="true" className="text-[#b6c2c9]">·</span>
                      <span className="font-semibold tabular-nums text-[#276445]">
                        {formatKwanza(customer.totalSpentAoa)}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#4e5f69]">
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Phone className="h-3.5 w-3.5 text-[#007cc3]" /> {customer.telephone}
                  </span>
                  {(customer.defaultAddress || customer.defaultCity) && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#007cc3]" />
                      {customer.defaultAddress}
                      {customer.defaultCity ? `${customer.defaultAddress ? ", " : ""}${customer.defaultCity}` : ""}
                    </span>
                  )}
                </div>

                {customer.notes && (
                  <p className="text-xs text-[#61717b]">{customer.notes}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                <button
                  type="button"
                  onClick={() => setHistoryCustomer(customer)}
                  className={`${secondaryClass} whitespace-nowrap`}
                >
                  <ClipboardList className="h-4 w-4" /> Histórico
                </button>
                <button
                  type="button"
                  onClick={() => onCreateOrderForCustomer(customer)}
                  className={`${secondaryClass} whitespace-nowrap border-[#007cc3] text-[#007cc3]`}
                >
                  <Plus className="h-4 w-4" /> Novo pedido
                </button>
                <button
                  type="button"
                  onClick={() => openEditCustomer(customer)}
                  className={secondaryClass}
                  aria-label={`Editar ${customer.name}`}
                >
                  <Pencil className="h-4 w-4" /> Editar
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="px-6 py-14 text-center">
          <Users className="mx-auto h-9 w-9 text-[#94a2aa]" />
          <h2 className="mt-3 font-semibold text-[#001d3d]">
            {customers.length ? "Nenhum cliente encontrado" : "Ainda sem clientes consolidados"}
          </h2>
          <p className="mt-1 text-sm text-[#697780]">
            {customers.length
              ? "Tente outro nome, telefone ou cidade."
              : "Sempre que entra um pedido pela loja ou pelo WhatsApp, o cliente é consolidado automaticamente pelo telefone."}
          </p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setDraft(null); } }}>
        <DialogContent className="border-t-4 border-t-[#f2c92f] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#001d3d]">
              {editingCustomerId ? "Editar cliente" : "Adicionar cliente"}
            </DialogTitle>
            <DialogDescription>
              Os dados padrão preenchem automaticamente novos pedidos deste contacto.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <form onSubmit={saveCustomer} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Nome / Empresa *
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  Telefone *
                  <input
                    required
                    minLength={6}
                    maxLength={40}
                    value={draft.telephone}
                    onChange={(e) => setDraft({ ...draft, telephone: e.target.value })}
                    placeholder="+244 9XX XXX XXX"
                    className={fieldClass}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  NIF (opcional)
                  <input
                    maxLength={40}
                    value={draft.nif}
                    onChange={(e) => setDraft({ ...draft, nif: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  E-mail (opcional)
                  <input
                    type="email"
                    maxLength={120}
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    className={fieldClass}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
                <label className={labelClass}>
                  Morada habitual
                  <input
                    maxLength={500}
                    value={draft.defaultAddress}
                    onChange={(e) => setDraft({ ...draft, defaultAddress: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  Cidade
                  <input
                    maxLength={100}
                    value={draft.defaultCity}
                    onChange={(e) => setDraft({ ...draft, defaultCity: e.target.value })}
                    className={fieldClass}
                  />
                </label>
              </div>

              <label className={labelClass}>
                Notas internas
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className={`${fieldClass} resize-y`}
                />
              </label>

              {formError && (
                <p role="alert" className="border border-[#f0d3cc] bg-[#fff7f5] px-3 py-2 text-sm text-[#914533]">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-[#e6ecef] pt-4">
                <button type="button" className={secondaryClass} onClick={() => setDialogOpen(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className={actionClass} disabled={saving}>
                  {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {saving ? "A guardar…" : "Guardar cliente"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(historyCustomer)} onOpenChange={(open) => { if (!open) setHistoryCustomer(null); }}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-t-4 border-t-[#f2c92f] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-[#001d3d]">
              <UserCheck className="h-5 w-5 text-[#007cc3]" />
              {historyCustomer?.name || "Histórico do cliente"}
            </DialogTitle>
            <DialogDescription>
              {historyCustomer?.telephone}
              {historyCustomer?.defaultCity ? ` · ${historyCustomer.defaultCity}` : ""}
            </DialogDescription>
          </DialogHeader>

          {customerOrdersQuery.isPending ? (
            <div className="py-8 text-center text-sm text-[#61707a]">A carregar pedidos…</div>
          ) : (customerOrdersQuery.data ?? []).length === 0 ? (
            <p className="py-6 text-sm text-[#61707a]">Este cliente ainda não tem pedidos registados.</p>
          ) : (
            <div className="divide-y divide-[#e8edef] border border-[#dce4e9]">
              {(customerOrdersQuery.data as StoreOrder[]).map((order) => (
                <div key={order.id} className="space-y-1.5 p-4 text-sm">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-bold text-[#001d3d]">{order.reference}</span>
                    <span className="tabular-nums text-[#64737d]">
                      {new Date(order.createdAt).toLocaleDateString("pt-AO")}
                    </span>
                  </div>
                  <p className="font-semibold text-[#001d3d]">
                    {order.productName} <span className="tabular-nums text-[#007cc3]">× {order.quantity}</span>
                  </p>
                  <div className="flex items-center justify-between text-xs text-[#54646e] tabular-nums">
                    <span>Estado: {order.status}</span>
                    <span className="font-semibold text-[#001d3d]">{formatKwanza(order.totalAoa)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
