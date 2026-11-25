import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BarChart3, CheckCircle2, MapPin, Package, TrendingUp } from "lucide-react";
import type { StoreMetricsPeriod, StoreOrderSource, StoreOrderStatus } from "@shared/store";
import { fetchAdminMetrics } from "@/lib/storeApi";
import { formatKwanza } from "@/lib/storeFormat";

const statusLabel: Record<StoreOrderStatus, string> = {
  novo: "Novo",
  em_contacto: "Em contacto",
  confirmado: "Confirmado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const sourceLabel: Record<StoreOrderSource, string> = {
  loja_whatsapp: "Loja → WhatsApp",
  whatsapp_direto: "WhatsApp directo",
  admin: "Registo manual",
};

export function AdminAnalyticsTab() {
  const [period, setPeriod] = useState<StoreMetricsPeriod>("30d");

  const metricsQuery = useQuery({
    queryKey: ["store-admin", "metrics", period],
    queryFn: () => fetchAdminMetrics(period),
    retry: false,
  });

  const data = metricsQuery.data;
  const maxDayCount = Math.max(1, ...(data?.ordersByDay.map((d) => d.count) ?? [1]));
  const maxCityCount = Math.max(1, ...(data?.topCities.map((c) => c.count) ?? [1]));

  return (
    <div className="divide-y divide-[#e8edef]">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#007cc3]">
            Desempenho comercial
          </p>
          <h2 className="text-base font-semibold text-[#001d3d]">
            Indicadores de procura, pedidos e stock
          </h2>
        </div>

        <div className="inline-flex border border-[#cbd6dc] bg-[#f4f7f9] p-0.5" role="group" aria-label="Período das métricas">
          {(
            [
              { id: "7d", label: "7 dias" },
              { id: "30d", label: "30 dias" },
              { id: "all", label: "Todo o período" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              aria-pressed={period === item.id}
              className={`min-h-9 whitespace-nowrap px-3.5 text-xs font-semibold transition-colors ${
                period === item.id ? "bg-white text-[#001d3d] shadow-xs" : "text-[#586771] hover:text-[#001d3d]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {metricsQuery.isPending ? (
        <div className="grid gap-4 p-6 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse border border-[#e1e7ea] bg-[#f4f7f9]" />
          ))}
        </div>
      ) : !data ? (
        <div className="p-8 text-center text-sm text-[#914533]">
          Não foi possível carregar as métricas da loja.
        </div>
      ) : (
        <>
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
            <div className="border border-[#dce4e9] bg-[#fafcfd] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6d7d86]">
                Pedidos no período
              </p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[#001d3d]">{data.totalOrders}</p>
              <p className="mt-1 text-xs text-[#5d6d77] tabular-nums">
                {data.totalUnitsOrdered} unidades encomendadas
              </p>
            </div>

            <div className="border border-[#dce4e9] bg-[#fafcfd] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6d7d86]">
                Volume estimado
              </p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[#001d3d]">
                {formatKwanza(data.estimatedRevenueAoa)}
              </p>
              <p className="mt-1 text-xs text-[#5d6d77]">Exclui pedidos cancelados</p>
            </div>

            <div className="border border-[#dce4e9] bg-[#fafcfd] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6d7d86]">
                Taxa de confirmação
              </p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[#276445]">
                {data.fulfillmentRatePercent}%
              </p>
              <p className="mt-1 text-xs text-[#5d6d77] tabular-nums">
                {data.confirmedOrDeliveredOrders} confirmados/entregues · {data.cancelledOrders} cancelados
              </p>
            </div>

            <div className="border border-[#dce4e9] bg-[#fafcfd] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6d7d86]">
                Alertas de inventário
              </p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[#001d3d]">
                {data.lowStockCount + data.outOfStockCount}
              </p>
              <p className="mt-1 text-xs text-[#8a6500] tabular-nums">
                {data.lowStockCount} stock baixo · {data.outOfStockCount} esgotados
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-12">
            <div className="border border-[#dce4e9] bg-white p-5 lg:col-span-7">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#007cc3]" />
                  <h3 className="text-sm font-semibold text-[#001d3d]">Pedidos por dia</h3>
                </div>
                <span className="text-xs text-[#64737d] tabular-nums">
                  Últimos {data.ordersByDay.length} dias
                </span>
              </div>

              <div className="flex h-44 items-end gap-1.5 border-b border-[#e5ebee] pb-2 pt-4">
                {data.ordersByDay.map((day) => {
                  const pct = Math.max(4, Math.round((day.count / maxDayCount) * 100));
                  return (
                    <div
                      key={day.date}
                      className="group flex flex-1 flex-col items-center justify-end gap-1.5"
                      title={`${day.label}: ${day.count} pedido(s) (${formatKwanza(day.revenueAoa)})`}
                    >
                      <span className="text-[10px] font-semibold tabular-nums text-[#54646e] opacity-0 transition-opacity group-hover:opacity-100">
                        {day.count}
                      </span>
                      <div
                        className={`w-full transition-colors ${
                          day.count > 0 ? "bg-[#007cc3] group-hover:bg-[#001d3d]" : "bg-[#e9eff3]"
                        }`}
                        style={{ height: `${day.count > 0 ? pct : 4}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[10px] tabular-nums text-[#7c8b94]">
                <span>{data.ordersByDay[0]?.label}</span>
                <span>{data.ordersByDay[Math.floor(data.ordersByDay.length / 2)]?.label}</span>
                <span>{data.ordersByDay.at(-1)?.label}</span>
              </div>
            </div>

            <div className="border border-[#dce4e9] bg-white p-5 lg:col-span-5">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#007cc3]" />
                <h3 className="text-sm font-semibold text-[#001d3d]">Procura por cidade</h3>
              </div>

              {data.topCities.length === 0 ? (
                <p className="py-8 text-center text-xs text-[#697780]">Sem pedidos suficientes neste período.</p>
              ) : (
                <div className="space-y-3">
                  {data.topCities.map((city) => (
                    <div key={city.city} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#001d3d]">{city.city}</span>
                        <span className="tabular-nums text-[#586771]">
                          {city.count} {city.count === 1 ? "pedido" : "pedidos"}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#edf2f5]">
                        <div
                          className="h-full bg-[#007cc3]"
                          style={{ width: `${Math.round((city.count / maxCityCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-12">
            <div className="border border-[#dce4e9] bg-white p-5 lg:col-span-7">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#007cc3]" />
                <h3 className="text-sm font-semibold text-[#001d3d]">Artigos mais encomendados</h3>
              </div>
              {data.topProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#697780]">
                  <Package className="mx-auto mb-2 h-6 w-6 text-[#9aa8b0]" />
                  Ainda não existem itens encomendados neste período.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e5ebee] text-[11px] uppercase tracking-[0.06em] text-[#6d7d86]">
                      <th className="pb-2">Artigo</th>
                      <th className="pb-2 text-right">Pedidos</th>
                      <th className="pb-2 text-right">Unidades</th>
                      <th className="pb-2 text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef2f5]">
                    {data.topProducts.map((p) => (
                      <tr key={p.productName}>
                        <td className="py-2.5 font-semibold text-[#001d3d]">{p.productName}</td>
                        <td className="py-2.5 text-right tabular-nums text-[#54646e]">{p.orders}</td>
                        <td className="py-2.5 text-right font-semibold tabular-nums text-[#007cc3]">{p.units}</td>
                        <td className="py-2.5 text-right tabular-nums text-[#001d3d]">
                          {p.revenueAoa > 0 ? formatKwanza(p.revenueAoa) : "Sob consulta"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="space-y-4 lg:col-span-5">
              <div className="border border-[#dce4e9] bg-white p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#001d3d]">
                  <CheckCircle2 className="h-4 w-4 text-[#276445]" /> Estados dos pedidos
                </h3>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {data.ordersByStatus.map((row) => (
                    <div key={row.status} className="flex items-center justify-between border border-[#edf2f5] bg-[#fafcfd] px-3 py-2">
                      <span className="text-[#4d5c66]">{statusLabel[row.status]}</span>
                      <strong className="tabular-nums text-[#001d3d]">{row.count}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#dce4e9] bg-white p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#001d3d]">
                  <AlertCircle className="h-4 w-4 text-[#007cc3]" /> Origem das encomendas
                </h3>
                <div className="space-y-2 text-xs">
                  {data.ordersBySource.map((row) => (
                    <div key={row.source} className="flex items-center justify-between border border-[#edf2f5] bg-[#fafcfd] px-3 py-2">
                      <span className="text-[#4d5c66]">{sourceLabel[row.source]}</span>
                      <strong className="tabular-nums text-[#001d3d]">{row.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
