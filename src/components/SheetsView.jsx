import React, { useState, useMemo } from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";
import { StatusBadge } from "./common/StatusBadge";
import { Skeleton } from "./common/Skeleton";
import { exportControlReport } from "../utils/exportLogic";
import { InvoiceEditModal } from "./InvoiceEditModal";

export function SheetsView({ invoices, reloadInvoices, deleteInvoice, editInvoice, dataLoading, credits, selectedClient, filters, setFilters, searchTerm, setSearchTerm, addToast, confirmAction }) {
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [statusFilter, setStatusFilter] = useState("all");

    // invoices ya viene filtrado globalmente porApp.jsx (searchTerm, type, dateRange)
    // Aquıı́ solo aplicamos el statusFilter especıı́fico de esta vista
    const filteredInvoices = useMemo(() => {
        let list = invoices || [];
        if (statusFilter !== "all") {
            list = list.filter(inv => inv.estado === statusFilter);
        }
        return list;
    }, [invoices, statusFilter]);

    const handleExportExcel = () => {
        const rnc = (credits?.rnc || selectedClient?.rnc || "000000000").replace(/[^0-9]/g, "");
        const periodoStr = new Date().toISOString().substring(0, 7).replace("-", "");
        exportControlReport(invoices, rnc, periodoStr, "606");
    };

    return (
        <div className="page-content fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "var(--accent)", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
                        <Icon d={icons.sheet} size={14} stroke="var(--accent)" /> SINCRONIZACIÓN CON SHEETS
                    </div>
                    <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0, marginBottom: 4 }}>Registros de Facturas</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Vista detallada de los registros en tu hoja de cálculo central.</p>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn-secondary" onClick={handleExportExcel}><Icon d={icons.zap} size={16} /> Exportar Excel</button>
                    <button className="btn-ghost" onClick={() => reloadInvoices()}><Icon d={icons.refresh} size={16} /> Refrescar</button>
                    <button className="btn-secondary" style={{ width: "auto" }} onClick={() => window.open(import.meta.env.VITE_SHEETS_REGISTRO_URL, "_blank")}>Abrir Google Sheets</button>
                </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center", background: "var(--bg-card)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)" }}>
                {/* Buscador Global integrado */}
                <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
                    <input 
                        className="input-field" 
                        placeholder="Buscar por emisor, NCF o RNC..." 
                        style={{ paddingLeft: 34, fontSize: 13 }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Icon d={icons.search} size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                </div>

                {/* Filtros de Tipo Fiscal (Igual que en Dashboard) */}
                <div style={{ display: "flex", background: "var(--bg-base)", borderRadius: 8, padding: 2, border: "1px solid var(--border)" }}>
                    {["todos", "606", "607"].map(t => (
                        <button 
                            key={t}
                            onClick={() => setFilters({ ...filters, type: t })}
                            style={{ 
                                background: filters.type === t ? "var(--accent)" : "transparent",
                                color: filters.type === t ? "white" : "var(--text-muted)",
                                border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase" 
                            }}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* Rango de Fechas (Igual que en Dashboard) */}
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input 
                        type="date" 
                        value={filters.dateRange.from}
                        onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, from: e.target.value } })}
                        style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--text-primary)" }}
                        title="Desde"
                    />
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>a</span>
                    <input 
                        type="date" 
                        value={filters.dateRange.to}
                        onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, to: e.target.value } })}
                        style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--text-primary)" }}
                        title="Hasta"
                    />
                </div>

                {/* Filtro de Estado local */}
                <select 
                    className="input-field" 
                    style={{ width: "auto", minWidth: 160, fontSize: 13 }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">Cualquier Estado</option>
                    <option value="valido">Válidas ✅</option>
                    <option value="error">Con Error ❌</option>
                    <option value="duplicado">Duplicadas 🔁</option>
                </select>

                <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginLeft: "auto" }}>
                    {filteredInvoices.length} facturas
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
                                {credits?.plan !== "basic" && <th>TIPO</th>}
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
                                        {credits?.plan !== "basic" && <td><Skeleton width={20} /></td>}
                                        <td></td>
                                    </tr>
                                ))
                            ) : filteredInvoices.map((inv, i) => (
                                <tr key={i} className="hover-row">
                                    <td>{inv.fecha}</td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{inv.emisor}</div>
                                        <div style={{ fontSize: 11 }}>{inv.rnc}</div>
                                    </td>
                                    <td style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: 0.5 }}>{inv.ncf}</td>
                                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{inv.concepto}</td>
                                    <td style={{ fontWeight: 700 }}>{inv.monto}</td>
                                    <td>{inv.itbis}</td>
                                    <td><StatusBadge status={inv.estado} /></td>
                                    {credits?.plan !== "basic" && (
                                        <td>
                                            <span style={{ 
                                                fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 6,
                                                background: inv.tipo_fiscal === "607" ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.1)",
                                                color: inv.tipo_fiscal === "607" ? "var(--success)" : "var(--accent)"
                                            }}>
                                                {inv.tipo_fiscal}
                                            </span>
                                        </td>
                                    )}
                                    <td>
                                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                            <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setEditingInvoice(inv)} title="Editar">
                                                <Icon d={icons.settings} size={14} />
                                            </button>
                                            {deleteInvoice && (
                                                <button className="btn-ghost" style={{ color: "var(--danger)", padding: 4 }} onClick={() => confirmAction("¿Eliminar factura?", `Esta acción no se puede deshacer. Se eliminará permanentemente de tu registro de ${inv.tipo_fiscal}.`, () => deleteInvoice(inv.airtableId))} title="Eliminar">
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
