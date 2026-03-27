import React, { useState, useMemo } from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";
import { export606Txt, export606Official } from "../utils/exportLogic";

export function Reporteria({ invoices, credits, selectedClient }) {
    const [period, setPeriod] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });

    const filtered = useMemo(() => {
        return invoices.filter(inv => {
            const raw = inv.fecha_emision;
            if (!raw || raw === "—") return false;
            // YYYY-MM-DD → split directo, sin Date() para evitar UTC offset
            const parts = raw.split("-");
            if (parts.length < 2) return false;
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            return month === period.month && year === period.year;
        });
    }, [invoices, period]);

    const stats = useMemo(() => {
        const total = filtered.reduce((acc, inv) => acc + (inv.monto_total || 0), 0);
        const itbis = filtered.reduce((acc, inv) => acc + (inv.itbis_total || 0), 0);
        return { total, itbis, count: filtered.length };
    }, [filtered]);

    const handleExport606Txt = () => {
        const rnc = (credits?.rnc || selectedClient?.rnc || "000000000").replace(/[^0-9]/g, "");
        const periodoStr = `${period.year}${period.month.toString().padStart(2, "0")}`;
        export606Txt(filtered, rnc, periodoStr);
    };

    const handleExportOfficial = () => {
        const rnc = (credits?.rnc || selectedClient?.rnc || "000000000").replace(/[^0-9]/g, "");
        const periodoStr = `${period.year}${period.month.toString().padStart(2, "0")}`;
        export606Official(filtered, rnc, periodoStr);
    };

    return (
        <div className="page-content fade-in">
            {/* Hero Section for Reporteria */}
            <div style={{ marginBottom: 48, textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12, color: "var(--accent)", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
                    <Icon d={icons.layers} size={16} stroke="var(--accent)" /> GESTIÓN FISCAL
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
                    Reportes e Impuestos
                </h1>
                {selectedClient && (
                    <div style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500, marginBottom: 24 }}>
                        Gestionando facturación de <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{selectedClient.nombre} ({selectedClient.rnc})</span>
                    </div>
                )}

                {/* Period Selector Centered */}
                <div style={{ display: "inline-flex", gap: 8, background: "var(--bg-surface)", padding: "8px 16px", borderRadius: 14, border: "1px solid var(--border)", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 10, borderRight: "1px solid var(--border)" }}>
                        <Icon d={icons.calendar} size={14} stroke="var(--text-muted)" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Periodo</span>
                    </div>
                    <select className="input-field" style={{ width: 120, border: "none", background: "transparent", fontSize: 13, fontWeight: 600 }} value={period.month} onChange={e => setPeriod({ ...period, month: parseInt(e.target.value) })}>
                        {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <input className="input-field" type="number" style={{ width: 80, border: "none", background: "transparent", fontSize: 13, fontWeight: 600 }} value={period.year} onChange={e => setPeriod({ ...period, year: parseInt(e.target.value) })} />
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 24 }}>
                <div className="kpi-card">
                    <div style={{ fontSize: 11, fontWeight: 700 }}>TOTAL COMPRAS</div>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>RD${stats.total.toLocaleString()}</div>
                </div>
                <div className="kpi-card">
                    <div style={{ fontSize: 11, fontWeight: 700 }}>ITBIS ADELANTADO</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>RD${stats.itbis.toLocaleString()}</div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                    <button className="btn-primary" onClick={handleExport606Txt} style={{ flex: 1 }}>
                        <Icon d={icons.layers} size={16} /> Exportar .TXT (606)
                    </button>
                    <button className="btn-secondary" onClick={handleExportOfficial} style={{ flex: 1 }}>
                        <Icon d={icons.zap} size={16} /> Exportar Excel DGII
                    </button>
                </div>
            </div>

            <div className="card">
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon d={icons.layers} size={18} stroke="var(--accent)" /> Formatos Oficiales DGII
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={{ padding: 16, borderRadius: 12, background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Formato 606 (Compras)</div>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>Archivo de texto (.txt) listo para subir a la oficina virtual.</p>
                        <button className="btn-primary" style={{ width: "auto", fontSize: 12, padding: "8px 16px" }} onClick={handleExport606Txt}>Generar TXT</button>
                    </div>
                    <div style={{ padding: 16, borderRadius: 12, background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Excel Pre-Validado</div>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>Formato amigable con las columnas oficiales de la DGII.</p>
                        <button className="btn-secondary" style={{ width: "auto", fontSize: 12, padding: "8px 16px" }} onClick={handleExportOfficial}>Descargar Excel</button>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Guía Fiscal y Enlaces Útiles</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ padding: 12, borderRadius: 8, background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.1)" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>FECHA LÍMITE 606</div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>Día 15 del mes siguiente</div>
                        </div>
                        <div style={{ padding: 12, borderRadius: 8, background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.1)" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--success)" }}>FECHA LÍMITE IT-1</div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>Día 20 del mes siguiente</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <a href="https://dgii.gov.do/cicloContribuyente/facturacion/comprobantesFiscales/Paginas/Formato-606.aspx" target="_blank" rel="noreferrer" className="btn-ghost" style={{ justifyContent: "space-between", fontSize: 12, padding: "10px 14px" }}>
                            Plantilla 606 Oficial DGII <Icon d={icons.external} size={14} />
                        </a>
                        <a href="https://dgii.gov.do/app/WebApps/ConsultasWeb2/ConsultasWeb/consultas/rnc.aspx" target="_blank" rel="noreferrer" className="btn-ghost" style={{ justifyContent: "space-between", fontSize: 12, padding: "10px 14px" }}>
                            Consulta de RNC <Icon d={icons.external} size={14} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
