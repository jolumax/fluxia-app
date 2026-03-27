import React from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";
import { StatusBadge } from "./common/StatusBadge";
import { Skeleton } from "./common/Skeleton";
import { export606Official } from "../utils/exportLogic";
import { InvoiceEditModal } from "./InvoiceEditModal";
import { useState } from "react";

export function SheetsView({ invoices, reloadInvoices, deleteInvoice, editInvoice, dataLoading, credits, selectedClient }) {
    const [editingInvoice, setEditingInvoice] = useState(null);
    const handleExportExcel = () => {
        const rnc = (credits?.rnc || selectedClient?.rnc || "000000000").replace(/[^0-9]/g, "");
        const periodoStr = new Date().toISOString().substring(0, 7).replace("-", "");
        export606Official(invoices, rnc, periodoStr);
    };
    return (
        <div className="page-content fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "var(--accent)", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
                        <Icon d={icons.sheet} size={14} stroke="var(--accent)" /> SINCRONIZACIÓN CON SHEETS
                    </div>
                    <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0, marginBottom: 4 }}>Registros de Facturas</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Vista detallada de los registros en tu hoja de cálculo central.</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn-secondary" onClick={handleExportExcel}><Icon d={icons.zap} size={16} /> Exportar Excel</button>
                    <button className="btn-ghost" onClick={() => reloadInvoices()}><Icon d={icons.refresh} size={16} /> Refrescar</button>
                    <button className="btn-secondary" style={{ width: "auto" }} onClick={() => window.open(import.meta.env.VITE_SHEETS_REGISTRO_URL, "_blank")}>Abrir Google Sheets</button>
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="scroll-area">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>FECHA</th>
                                <th>EMISOR</th>
                                <th>NCF</th>
                                <th>CONCEPTO</th>
                                <th>MONTO</th>
                                <th>ITBIS</th>
                                <th>ESTADO</th>
                                <th>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dataLoading ? (
                                [1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                    <tr key={i}>
                                        <td><Skeleton width={60} /></td>
                                        <td><Skeleton width={120} style={{ marginBottom: 4 }} /><Skeleton width={80} height={10} /></td>
                                        <td><Skeleton width={100} /></td>
                                        <td><Skeleton width={140} /></td>
                                        <td><Skeleton width={80} /></td>
                                        <td><Skeleton width={60} /></td>
                                        <td><Skeleton width={90} /></td>
                                        <td><Skeleton width={20} /></td>
                                    </tr>
                                ))
                            ) : (invoices || []).map((inv, i) => (
                                <tr key={i} className="hover-row">
                                    <td>{inv.fecha}</td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{inv.emisor}</div>
                                        <div style={{ fontSize: 11 }}>{inv.rnc}</div>
                                    </td>
                                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{inv.ncf}</td>
                                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{inv.concepto}</td>
                                    <td style={{ fontWeight: 700 }}>{inv.monto}</td>
                                    <td>{inv.itbis}</td>
                                    <td><StatusBadge status={inv.estado} /></td>
                                    <td>
                                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                            <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setEditingInvoice(inv)} title="Editar">
                                                <Icon d={icons.settings} size={14} />
                                            </button>
                                            {deleteInvoice && (
                                                <button className="btn-ghost" style={{ color: "var(--danger)", padding: 4 }} onClick={() => deleteInvoice(inv.airtableId)} title="Eliminar">
                                                    <Icon d={icons.trash} size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingInvoice && (
                <InvoiceEditModal
                    invoice={editingInvoice}
                    onSave={editInvoice}
                    onClose={() => setEditingInvoice(null)}
                />
            )}
        </div>
    );
}
