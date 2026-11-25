import { useState } from "react";
import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StoreOrder } from "@shared/store";
import { formatKwanza } from "@/lib/storeFormat";

type DocumentKind = "orcamento" | "nota_entrega";

export function AdminOrderDocumentDialog({
  order,
  open,
  onOpenChange,
}: {
  order: StoreOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [docKind, setDocKind] = useState<DocumentKind>("orcamento");
  const [validityNote, setValidityNote] = useState("Validade da proposta: 7 dias úteis. Pagamento por transferência bancária ou TPA.");

  if (!order) return null;

  const docPrefix = docKind === "orcamento" ? "ORC" : "NE";
  const docNumber = `${docPrefix}-${order.reference}`;
  const docTitle = docKind === "orcamento" ? "Orçamento Comercial" : "Nota de Entrega";
  const issueDate = new Date(order.createdAt).toLocaleDateString("pt-AO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto border-t-4 border-t-[#f2c92f] sm:max-w-3xl print:max-h-none print:border-0 print:shadow-none">
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #bioprev-print-document,
            #bioprev-print-document * {
              visibility: visible !important;
            }
            #bioprev-print-document {
              position: fixed !important;
              inset: 0 !important;
              width: 100% !important;
              background: #ffffff !important;
              padding: 20px !important;
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
          }
        `}</style>

        <DialogHeader className="print:hidden">
          <DialogTitle className="text-xl text-[#001d3d]">Emitir documento da encomenda</DialogTitle>
          <DialogDescription>
            Seleccione o tipo de documento e clique em imprimir ou guardar como PDF no navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5ebee] pb-4 print:hidden">
          <div className="inline-flex border border-[#cbd6dc] bg-[#f4f7f9] p-0.5">
            <button
              type="button"
              onClick={() => setDocKind("orcamento")}
              className={`min-h-9 px-3.5 text-xs font-semibold transition-colors ${
                docKind === "orcamento" ? "bg-white text-[#001d3d] shadow-xs" : "text-[#586771] hover:text-[#001d3d]"
              }`}
            >
              Orçamento (PDF)
            </button>
            <button
              type="button"
              onClick={() => setDocKind("nota_entrega")}
              className={`min-h-9 px-3.5 text-xs font-semibold transition-colors ${
                docKind === "nota_entrega" ? "bg-white text-[#001d3d] shadow-xs" : "text-[#586771] hover:text-[#001d3d]"
              }`}
            >
              Nota de Entrega (PDF)
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex min-h-10 items-center gap-2 border border-[#007cc3] bg-[#007cc3] px-4 text-sm font-bold text-white transition-colors hover:bg-[#006ba9]"
          >
            <Printer className="h-4 w-4" />
            Imprimir / Guardar PDF
          </button>
        </div>

        <div className="print:hidden">
          <label className="block text-xs font-semibold text-[#455660]">
            Observação no rodapé do documento
            <input
              type="text"
              value={validityNote}
              onChange={(event) => setValidityNote(event.target.value)}
              className="mt-1 min-h-9 w-full border border-[#cbd6dc] bg-white px-3 text-xs text-[#001d3d] outline-none focus:border-[#007cc3]"
            />
          </label>
        </div>

        <div
          id="bioprev-print-document"
          className="border border-[#dce4e9] bg-white p-6 text-[#1e2f38] sm:p-8"
        >
          <div className="flex flex-col justify-between gap-4 border-b-2 border-[#001d3d] pb-5 sm:flex-row sm:items-start">
            <div>
              <img src="/logo.svg" alt="Bioprev Angola" className="h-10 w-auto" />
              <p className="mt-2 text-xs leading-5 text-[#54646e]">
                Bioprev Angola — Controlo de Pragas, Limpeza e Equipamentos
                <br />
                Luanda · Benguela · Huambo · Tel: +244 928 737 888
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#007cc3]">
                Documento Oficial
              </p>
              <h2 className="mt-0.5 text-xl font-bold text-[#001d3d]">{docTitle}</h2>
              <p className="mt-1 font-mono text-xs font-semibold text-[#001d3d]">{docNumber}</p>
              <p className="text-xs tabular-nums text-[#61707a]">Emitido em: {issueDate}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 border border-[#e2e8ec] bg-[#f8fafb] p-4 text-xs sm:grid-cols-2">
            <div>
              <p className="font-bold uppercase tracking-[0.08em] text-[#64737d]">Cliente / Destinatário</p>
              <p className="mt-1 text-sm font-semibold text-[#001d3d]">
                {order.customerName || "Cliente particular"}
              </p>
              <p className="mt-0.5 tabular-nums text-[#455660]">Tel.: {order.telephone}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-[0.08em] text-[#64737d]">Local de entrega</p>
              <p className="mt-1 text-[#001d3d]">
                {order.address}
                {order.city ? `, ${order.city}` : ""}
              </p>
              <p className="mt-0.5 font-mono text-[#54646e]">Ref. Pedido: {order.reference}</p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b-2 border-[#dce4e9] bg-[#f4f7f9] text-[11px] font-bold uppercase tracking-[0.06em] text-[#455660]">
                  <th className="px-3 py-2.5">SKU</th>
                  <th className="px-3 py-2.5">Artigo</th>
                  <th className="px-3 py-2.5 text-right">Qtd.</th>
                  <th className="px-3 py-2.5">Unid.</th>
                  <th className="px-3 py-2.5 text-right">Preço Unit.</th>
                  <th className="px-3 py-2.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8edef]">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 font-mono text-[#64737d]">{item.sku || "—"}</td>
                    <td className="px-3 py-3 font-semibold text-[#001d3d]">{item.productName}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{item.quantity}</td>
                    <td className="px-3 py-3 text-[#54646e]">{item.unitLabel}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatKwanza(item.unitPriceAoa)}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-[#001d3d]">
                      {formatKwanza(item.subtotalAoa)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-col items-end border-t border-[#dce4e9] pt-4">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-xs text-[#54646e] tabular-nums">
                <span>Total de unidades</span>
                <span>{order.quantity}</span>
              </div>
              <div className="flex justify-between border-t border-[#e5ebee] pt-2 text-base font-bold text-[#001d3d] tabular-nums">
                <span>{order.hasConsultationItems && order.totalAoa !== null ? "Total parcial" : "Total"}</span>
                <span>{formatKwanza(order.totalAoa)}</span>
              </div>
              {order.hasConsultationItems && (
                <p className="text-right text-[11px] text-[#64737d]">
                  * Inclui itens com valor sob consulta.
                </p>
              )}
            </div>
          </div>

          {(order.deliveryNotes || order.adminNotes || validityNote) && (
            <div className="mt-6 space-y-2 border-t border-[#e5ebee] pt-4 text-xs text-[#4d5c66]">
              {order.deliveryNotes && (
                <p>
                  <strong>Notas de entrega:</strong> {order.deliveryNotes}
                </p>
              )}
              {order.adminNotes && (
                <p>
                  <strong>Condições / Notas comerciais:</strong> {order.adminNotes}
                </p>
              )}
              {validityNote && <p className="text-[#64737d]">{validityNote}</p>}
            </div>
          )}

          {docKind === "nota_entrega" && (
            <div className="mt-8 grid gap-8 border-t border-[#e5ebee] pt-6 text-xs text-[#54646e] sm:grid-cols-2">
              <div>
                <div className="h-10 border-b border-[#9aa7b0]" />
                <p className="mt-1.5 font-semibold text-[#001d3d]">Entregue por (Bioprev Angola)</p>
              </div>
              <div>
                <div className="h-10 border-b border-[#9aa7b0]" />
                <p className="mt-1.5 font-semibold text-[#001d3d]">Recebido em boa ordem (Cliente)</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
