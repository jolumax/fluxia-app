import React, { useMemo } from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";
import { Skeleton } from "./common/Skeleton";
import { StatusBadge } from "./common/StatusBadge";
import { checkNCFAlerts, suggestExpenseCategory, validateNCF } from "../utils/helpers";
import { export606Official } from "../utils/exportLogic";
import { bulkUpdateInvoiceStatus } from "../utils/airtableActions";
import { InvoiceEditModal } from "./InvoiceEditModal";
import { useState } from "react";

function FacturasAVencer({ invoices }) {
    const { total, alerts } = checkNCFAlerts(invoices);
    if (total === 0) return null;
    return (
        <div className="card fade-in" style={{ borderLeft: "4px solid var(--danger)", marginBottom: 24, padding: "24px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 42, height: 42, background: "rgba(239,68,68,0.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon d={icons.alert} size={20} stroke="var(--danger)" />
                    </div>
                    <div>
                        <h3 className="font-display" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Facturas Próximas a Vencer</h3>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Tienes {total} comprobante(s) que deben reportarse antes del día 15 del próximo mes.</div>
                    </div>
                </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {alerts.slice(0, 4).map((inv, i) => (
                    <div key={i} style={{ padding: 12, borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inv.emisor}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{inv.ncf} — {inv.fecha}</div>
                        </div>
                        <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: 13 }}>{inv.monto}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function Dashboard({ setPage, invoices, mockInvoices, setMockInvoices, dataLoading, credits, selectedClient, reloadInvoices, deleteInvoice, editInvoice }) {
    const [selectedIds, setSelectedIds] = useState([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);

    // Combinar facturas reales con mocks de prueba
    const allInvoices = useMemo(() => {
        return [...(invoices || []), ...mockInvoices];
    }, [invoices, mockInvoices]);

    const toggleSelectAll = () => {
        if (selectedIds.length === (allInvoices || []).length) {
            setSelectedIds([]);
        } else {
            setSelectedIds((allInvoices || []).map(inv => inv.airtableId || inv.id));
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkConfirm = async () => {
        if (!selectedIds.length) return;
        setIsUpdating(true);
        try {
            await bulkUpdateInvoiceStatus(selectedIds, "confirmed");
            setSelectedIds([]);
            if (reloadInvoices) reloadInvoices();
        } catch (err) {
            alert("Error al confirmar: " + err.message);
        } finally {
            setIsUpdating(false);
        }
    };
    const handleExportExcel = () => {
        const rnc = (credits?.rnc || selectedClient?.rnc || "000000000").replace(/[^0-9]/g, "");
        const periodoStr = new Date().toISOString().substring(0, 7).replace("-", "");
        export606Official(allInvoices, rnc, periodoStr);
    };
    const stats = useMemo(() => {
        if (!allInvoices) return { total: 0, itbis: 0, pending: 0, errors: 0, itbis_ventas: 0, itbis_compras: 0, ventas_totales: 0, gastos_totales: 0, fiscalRisks: 0 };
        const data = allInvoices;
        
        const gastos_totales = data.filter(i => i.tipo_fiscal === "606").reduce((acc, inv) => acc + (inv.monto_total || 0), 0);
        const ventas_totales = data.filter(i => i.tipo_fiscal === "607").reduce((acc, inv) => acc + (inv.monto_total || 0), 0);
        
        const itbis_compras = data.filter(i => i.tipo_fiscal === "606").reduce((acc, inv) => acc + (inv.itbis_total || 0), 0);
        const itbis_ventas = data.filter(i => i.tipo_fiscal === "607").reduce((acc, inv) => acc + (inv.itbis_total || 0), 0);
        
        const pending = data.filter(i => i.estado === "revision").length;
        const errors = data.filter(i => i.estado === "error").length;
        const fiscalRisks = data.filter(i => !validateNCF(i.ncf, i.tipo_fiscal).valid).length;
        
        const b01 = data.filter(i => i.ncf && (i.ncf.startsWith("B01") || i.ncf.startsWith("E31"))).length;
        const b02 = data.filter(i => i.ncf && (i.ncf.startsWith("B02") || i.ncf.startsWith("E32"))).length;
        const b04 = data.filter(i => i.ncf && (i.ncf.startsWith("B04") || i.ncf.startsWith("E34"))).length;
        
        return { 
            ventas_totales, 
            gastos_totales, 
            itbis: itbis_compras, 
            facturasTotales: data.length, 
            pending, 
            errors, 
            conError: errors,
            validas: data.filter(i => i.estado === "valido").length,
            fiscalRisks,
            b01, b02, b04,
            itbis_ventas,
            itbis_a_pagar: itbis_ventas - itbis_compras
        };
    }, [allInvoices]);

    if (dataLoading) {
        return (
            <div className="page-content fade-in">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20, marginBottom: 32 }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="kpi-card">
                            <Skeleton width="40%" height={10} style={{ marginBottom: 12 }} />
                            <Skeleton width="70%" height={24} />
                        </div>
                    ))}
                </div>
                <div className="card">
                    <Skeleton width="30%" height={18} style={{ marginBottom: 20 }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton key={i} height={40} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content fade-in">
            {selectedClient && (
                <div style={{ marginBottom: 40, textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12, color: "var(--accent)", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
                        <Icon d={icons.layers} size={16} stroke="var(--accent)" /> PANEL DE CONTROL
                    </div>
                    <h1 className="font-display" style={{ 
                        fontSize: "clamp(32px, 5vw, 48px)", 
                        fontWeight: 900, 
                        lineHeight: 1.1, 
                        color: "var(--text-primary)", 
                        textTransform: "uppercase",
                        margin: "0 0 12px",
                        letterSpacing: "-1px"
                    }}>
                        {selectedClient.nombre}
                    </h1>
                    <div style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>
                        Gestionando facturación de <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{selectedClient.rnc}</span>
                    </div>
                </div>
            )}

            <FacturasAVencer invoices={invoices} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20, marginBottom: 32 }}>
                {[
                    { label: "INGRESOS (607)", val: credits?.plan === "basic" ? "💎 Lock" : `RD$${stats.ventas_totales.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`, icon: icons.trending, color: "var(--success)", locked: credits?.plan === "basic" },
                    { label: "GASTOS (606)", val: `RD$${stats.gastos_totales.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`, icon: icons.layers, color: "var(--accent)" },
                    { label: "ITBIS A PAGAR (EST.)", val: credits?.plan === "basic" ? "💎 Lock" : `RD$${stats.itbis_a_pagar.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`, icon: icons.zap, color: stats.itbis_a_pagar > 0 ? "var(--danger)" : "var(--success)", sub: "Saldo del Mes", locked: credits?.plan === "basic" },
                    { label: "RIESGO FISCAL", val: stats.fiscalRisks, icon: icons.alert, color: stats.fiscalRisks > 0 ? "var(--danger)" : "var(--success)", sub: "No Deducibles" },
                    { label: "CON ERRORES", val: stats.errors, icon: icons.x, color: "var(--danger)", sub: "Requerido" },
                    { label: "FACTURAS TOTALES", val: stats.facturasTotales, icon: icons.file, color: "var(--text-primary)", sub: "Este mes" },
                ].map((k, i) => (
                    <div key={i} className={`kpi-card ${k.locked ? "locked-kpi" : ""}`} style={{ position: "relative" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                            <div style={{ width: 34, height: 34, background: `${k.color}15`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Icon d={k.icon} size={16} stroke={k.color} />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{k.sub || (k.locked ? "PRO Feature" : "Info")}</span>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: k.locked ? "var(--accent)" : "var(--text-primary)", letterSpacing: -0.5 }}>{k.val}</div>
                        {k.locked && (
                            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.05)", cursor: "pointer", borderRadius: 16 }} onClick={() => { alert("🔒 Esta función disponible en Plan Pro Y Premium"); window.location.href = "/?plan=pro"; }} title="Mejora a un plan PRO para desbloquear" />
                        )}
                    </div>
                ))}
            </div>

            {/* Dashboard Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, marginBottom: 32 }}>
                {/* Bar Chart */}
                <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Volumen de Procesamiento</h3>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Facturas digitalizadas por mes</div>
                        </div>
                        <div className="badge badge-success" style={{ background: "rgba(16,185,129,0.1)", padding: "4px 10px" }}>
                            ↑ Tendencia positiva
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", height: 180, gap: 14, paddingTop: 20, position: "relative" }}>
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "var(--accent2)" }} />
                        <div className="chart-bar" style={{ flex: "none", width: 40, margin: "0 auto", zIndex: 1 }} title={`Mes Actual: ${stats.facturasTotales}`}>
                            <div className="fill" style={{ height: "100%", background: "var(--accent)" }} />
                            <div style={{ position: "absolute", bottom: "50%", left: "50%", transform: "translate(-50%, 50%)", fontSize: 13, color: "white", fontWeight: 800 }}>{stats.facturasTotales}</div>
                            <div style={{ position: "absolute", bottom: -24, left: "50%", transform: "translateX(-50%)", fontSize: 10, color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap" }}>Mes Actual</div>
                        </div>
                    </div>
                </div>

                {/* Donut Chart */}
                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>Estado de Facturas</h3>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 30, marginBottom: 24 }}>
                        <div className="donut-ring">
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
                                <div style={{ fontSize: 20, fontWeight: 800 }}>
                                    {stats.facturasTotales > 0 ? Math.round((stats.validas / stats.facturasTotales) * 100) : 0}%
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "2px", background: "var(--success)" }} />
                                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Válidas DGII</span>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--success)" }}>{stats.validas} ({stats.facturasTotales > 0 ? Math.round((stats.validas / stats.facturasTotales) * 100) : 0}%)</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "2px", background: "var(--danger)" }} />
                                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Con error</span>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--danger)" }}>{stats.conError} ({stats.facturasTotales > 0 ? Math.round((stats.conError / stats.facturasTotales) * 100) : 0}%)</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 16, background: "var(--bg-surface)", padding: "16px", borderRadius: 12, marginTop: "auto" }}>
                        <div style={{ textAlign: "center", flex: 1 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--success)", marginBottom: 4 }}>B01</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Crédito Fiscal</div>
                            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{stats.b01}</div>
                        </div>
                        <div style={{ textAlign: "center", flex: 1, borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)", marginBottom: 4 }}>B02</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Consumidor Final</div>
                            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{stats.b02}</div>
                        </div>
                        <div style={{ textAlign: "center", flex: 1 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent2)", marginBottom: 4 }}>B04</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Gubernamental</div>
                            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{stats.b04}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Últimas Facturas Procesadas</h3>
                    <div style={{ display: "flex", gap: 12 }}>
                        <button className="btn-secondary" onClick={handleExportExcel} style={{ fontSize: 12, padding: "6px 14px", height: "auto" }}>
                            <Icon d={icons.zap} size={14} /> Exportar Excel
                        </button>
                        <button className="btn-ghost" onClick={() => {
                            if (window.confirm("¿Deseas generar una simulación de factura con errores fiscales para validar el sistema gráficamente?")) {
                                const d = new Date();
                                const todayISO = d.toISOString().split("T")[0]; // YYYY-MM-DD
                                const todayLocal = d.toLocaleDateString("es-DO"); // DD/MM/YYYY

                                // 1. Riesgo B02 en Gastos
                                const newMock1 = {
                                    id: "TEST-01",
                                    emisor: "SOPORTE FLUXIA (SIMULACIÓN DE RIESGO B02)",
                                    rnc: "101999999",
                                    ncf: "B0200000001", // ERROR: B02 en un 606
                                    monto: "RD$1,500.00",
                                    monto_total: 1500.00,
                                    itbis: "RD$270.00",
                                    itbis_total: 270.00,
                                    fecha: todayISO,
                                    fecha_emision: todayLocal,
                                    tipo_fiscal: "606",
                                    estado: "valido",
                                    isMock: true
                                };

                                // 2. Riesgo de Extemporaneidad (Factura vieja)
                                const dOld = new Date();
                                dOld.setMonth(dOld.getMonth() - 2); // Hace 2 meses
                                const oldISO = dOld.toISOString().split("T")[0];
                                const oldLocal = dOld.toLocaleDateString("es-DO");

                                const newMock2 = {
                                    id: "TEST-02",
                                    emisor: "SOPORTE FLUXIA (EXTEMPORÁNEA)",
                                    rnc: "101999999",
                                    ncf: "B0100000123", // Valido
                                    monto: "RD$3,000.00",
                                    monto_total: 3000.00,
                                    itbis: "RD$540.00",
                                    itbis_total: 540.00,
                                    fecha: oldISO,
                                    fecha_emision: oldLocal,
                                    tipo_fiscal: "606",
                                    estado: "valido",
                                    isMock: true
                                };

                                setMockInvoices([newMock1, newMock2, ...mockInvoices]);
                                alert("Simulación activada. Se ha inyectado una factura con riesgo fiscal en la vista actual.");
                            }
                        }} style={{ fontSize: 11, padding: "6px 14px", height: "auto", border: "1px dashed var(--accent)", color: "var(--accent)", background: "var(--accent-glow)" }}>
                            🧪 Simular Riesgo
                        </button>
                        <button className="btn-ghost" onClick={() => setPage("procesar")}>Ver todo →</button>
                    </div>
                </div>
                <div className="scroll-area">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 40 }}>
                                    <div 
                                        className={`checkbox-custom ${selectedIds.length > 0 && selectedIds.length === (allInvoices || []).length ? "checked" : ""}`}
                                        onClick={toggleSelectAll}
                                    />
                                </th>
                                <th>FECHA</th>
                                <th>EMISOR / RNC</th>
                                <th>NCF</th>
                                <th>MONTO</th>
                                <th>ESTADO</th>
                                {credits?.plan !== "basic" && <th>TIPO</th>}
                                <th>TAG</th>
                                <th>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(allInvoices || []).slice(0, 8).map((inv, i) => (
                                <tr key={inv.airtableId || inv.id || i} className={`hover-row ${selectedIds.includes(inv.airtableId || inv.id) ? "selected-row" : ""}`} onClick={() => toggleSelect(inv.airtableId || inv.id)}>
                                    <td>
                                        <div 
                                            className={`checkbox-custom ${selectedIds.includes(inv.airtableId || inv.id) ? "checked" : ""}`}
                                            onClick={(e) => { e.stopPropagation(); toggleSelect(inv.airtableId || inv.id); }}
                                        />
                                    </td>
                                    <td>{inv.fecha}</td>
                                    <td>
                                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{inv.emisor}</div>
                                        <div style={{ fontSize: 11 }}>{inv.rnc}</div>
                                    </td>
                                    <td style={{ fontFamily: "monospace", fontSize: 12, position: "relative" }}>
                                        {inv.ncf}
                                        {validateNCF(inv.ncf, inv.tipo_fiscal).valid === false && (
                                            <span 
                                                style={{ marginLeft: 8, cursor: "help" }} 
                                                title={validateNCF(inv.ncf, inv.tipo_fiscal).message}
                                            >
                                                <Icon d={icons.alert} size={14} stroke={validateNCF(inv.ncf, inv.tipo_fiscal).severity === 'error' ? "var(--danger)" : "var(--warning)"} />
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ fontWeight: 700 }}>{inv.monto}</td>
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
                                    <td><span className="tag">{suggestExpenseCategory(inv.concepto)}</span></td>
                                    <td>
                                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
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

            {/* Floating Bulk Actions Bar */}
            <div className={`bulk-actions-bar ${selectedIds.length > 0 ? "active" : ""}`}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                    {selectedIds.length} facturas seleccionadas
                </div>
                <div style={{ width: 1, height: 24, background: "var(--border)" }} />
                <button 
                    className="btn-primary" 
                    style={{ width: "auto", height: 36, padding: "0 20px", fontSize: 12 }}
                    onClick={handleBulkConfirm}
                    disabled={isUpdating}
                >
                    {isUpdating ? "Confirmando..." : "Confirmar Selección"}
                </button>
                <button 
                    className="btn-ghost" 
                    style={{ padding: "8px 12px", fontSize: 12 }}
                    onClick={() => setSelectedIds([])}
                    disabled={isUpdating}
                >
                    Cancelar
                </button>
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
