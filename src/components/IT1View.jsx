import React, { useState, useMemo, useRef, useEffect } from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";
import { calculateIT1, formatCurrency } from "../utils/fiscalEngine";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { exportTo607 } from "../utils/export607";
import { export606Txt, export607Txt, exportIT1Official } from "../utils/exportLogic";
import { generatePreventiveAuditPDF } from "../utils/pdfExport";
import { generateFiscalInsights } from "../utils/fiscalIntelligence";

export function IT1View({ invoices, selectedClient, credits }) {
    // 1. ESTADO
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState("anexoA");
    const [isExporting, setIsExporting] = useState(false);
    const [isExportingAudit, setIsExportingAudit] = useState(false);
    const [showTxtMenu, setShowTxtMenu] = useState(false);
    const [saldoAnterior, setSaldoAnterior] = useState(0);
    const [manualValues, setManualValues] = useState(() => {
        const saved = localStorage.getItem(`it1_draft_${selectedClient?.rnc || credits?.rnc}`);
        return saved ? JSON.parse(saved) : {};
    });

    const dropdownRef = useRef(null);

    // 2. CONSTANTES
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const years = [2024, 2025, 2026];
    const plan = credits?.plan?.toLowerCase() ?? "basic";
    const hasAccess = plan === "pro" || plan === "premium";

    // 3. EFECTOS
    useEffect(() => {
        const key = `it1_draft_${selectedClient?.rnc || credits?.rnc}`;
        localStorage.setItem(key, JSON.stringify(manualValues));
    }, [manualValues, selectedClient, credits]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowTxtMenu(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 4. LÓGICA DE CÁLCULO
    const baseData = useMemo(() => {
        if (!invoices) return null;
        return calculateIT1(invoices, month, year);
    }, [invoices, month, year]);

    const insights = useMemo(() => {
        if (!invoices) return [];
        const periodInvoices = invoices.filter(inv => {
            if (!inv.fecha || inv.fecha === "—") return false;
            const dateStr = inv.fecha.replace(/-/g, '/');
            const parts = dateStr.split('/');
            if (parts.length < 3) return false;
            const m = parseInt(parts[1]);
            const y = parseInt(parts[2]);
            return y === year && m === month;
        });
        return generateFiscalInsights(periodInvoices);
    }, [invoices, month, year]);

    const stats = useMemo(() => {
        if (!invoices) return { c606: 0, c607: 0, total: 0 };
        const periodInvoices = invoices.filter(inv => {
            if (!inv.fecha || inv.fecha === "—") return false;
            const dateStr = inv.fecha.replace(/-/g, '/');
            const parts = dateStr.split('/');
            if (parts.length < 3) return false;
            const m = parseInt(parts[1]);
            const y = parseInt(parts[2]);
            return y === year && m === month;
        });
        const c606 = periodInvoices.filter(inv => inv.tipo_fiscal === "606" || inv.isExpense).length;
        const c607 = periodInvoices.filter(inv => inv.tipo_fiscal === "607" || (!inv.isExpense && inv.tipo_fiscal !== "606")).length;
        return { c606, c607, total: periodInvoices.length };
    }, [invoices, month, year]);

    const derivedValues = useMemo(() => {
        if (!baseData) return null;
        const C11 = manualValues["11"] ?? baseData.anexoA.casilla11;
        const C16 = manualValues["21"] ?? (C11 * 0.18);
        const C22 = manualValues["22"] ?? baseData.it1.casilla22;
        const C24 = parseFloat(saldoAnterior) || 0;
        const totalCreditos = C22 + C24;
        const balance = C16 - totalCreditos;
        return {
            totalVentas: C11,
            itbisCobrado: C16,
            itbisCompras: C22,
            saldoAnterior: C24,
            aPagar: Math.max(0, balance),
            saldoFavor: Math.max(0, -balance)
        };
    }, [baseData, manualValues, saldoAnterior]);

    // 5. SUB-COMPONENTES
    const CardStats = ({ title, value, icon, color = "#003366" }) => (
        <div className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ padding: 10, borderRadius: 8, background: `${color}10`, color }}>{icon}</div>
            <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{title}</div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>{value}</div>
            </div>
        </div>
    );

    const CasillaEditable = ({ id, label, value, readOnly = false, isTotal = false }) => {
        const val = manualValues[id] !== undefined ? manualValues[id] : value;
        return (
            <div className="CasillaEditable" style={{ 
                display: "flex", justifyContent: "space-between", alignItems: "center", 
                padding: "12px 16px", borderBottom: "1px solid var(--border)",
                background: isTotal ? "rgba(59,130,246,0.03)" : "transparent"
            }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ 
                        width: 24, height: 24, background: "var(--bg-hover)", borderRadius: 6, 
                        display: "flex", alignItems: "center", justifyContent: "center", 
                        fontSize: 9, fontWeight: 900, color: "var(--text-muted)", border: "1px solid var(--border)"
                    }}>{id}</div>
                    <div style={{ fontSize: 12, fontWeight: isTotal ? 900 : 700, color: isTotal ? "var(--accent)" : "var(--text-primary)" }}>{label}</div>
                </div>
                <div style={{ position: "relative" }}>
                    <input 
                        type="number" 
                        readOnly={readOnly}
                        value={val}
                        onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (id === "24") setSaldoAnterior(v || 0);
                            else setManualValues(prev => ({ ...prev, [id]: v || 0 }));
                        }}
                        style={{ 
                            width: 130, textAlign: "right", padding: "6px 12px", 
                            borderRadius: 8, border: "1px solid var(--border)",
                            fontSize: 13, fontWeight: 800, background: readOnly ? "transparent" : "var(--bg-card)",
                            color: readOnly ? "var(--text-secondary)" : (isTotal ? "var(--accent)" : "var(--text-primary)")
                        }}
                    />
                </div>
            </div>
        );
    };

    const FullReportTemplate = ({ currentTab, isForPrint = false, exportId = null, isUnified = false }) => {
        const isAnexo = currentTab === "anexoA" || isUnified;
        const isIT1 = currentTab === "it1" || isUnified;
        if (!baseData || !derivedValues) return null;
        
        return (
            <div className={isForPrint ? "print-high-fidelity" : ""} data-export-id={exportId} style={{ 
                padding: isForPrint ? "40px" : "0", 
                background: isForPrint ? "#ffffff" : "transparent",
                minHeight: isForPrint ? "1050px" : "auto", 
                display: "flex", 
                flexDirection: "column", 
                gap: 24 
            }}>
                {isForPrint && (
                    <div style={{ background: "#0f172a", padding: "20px 32px", borderRadius: 16, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                         <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <img src="/icon-512.png" alt="Fluxia" style={{ width: 40, height: 40 }} />
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.02em" }}>FLUXIA</div>
                                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Cerebro Fiscal · {isUnified ? "Simulación Completa (A + IT1)" : (isAnexo ? "Anexo A" : "IT-1")}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>{selectedClient?.nombre || "Cliente"}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>Periodo: {meses[month - 1]} {year}</div>
                        </div>
                    </div>
                )}

                {/* Dashboard Stats */}
                <div className="grid-responsive" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
                    <div className="card" style={{ padding: 24, borderLeft: "4px solid var(--accent)" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>Total Ventas (Bruto)</div>
                        <div style={{ fontSize: 24, fontWeight: 950, color: "var(--text-primary)" }}>{formatCurrency(derivedValues.totalVentas)}</div>
                    </div>
                    <div className="card" style={{ padding: 24, borderLeft: "4px solid #f59e0b" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>ITBIS por Pagar</div>
                        <div style={{ fontSize: 24, fontWeight: 950, color: "#f59e0b" }}>{formatCurrency(derivedValues.aPagar)}</div>
                    </div>
                    <div className="card" style={{ padding: 24, borderLeft: "4px solid #10b981" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>ITBIS Adelantado</div>
                        <div style={{ fontSize: 24, fontWeight: 950, color: "#10b981" }}>{formatCurrency(derivedValues.itbisCompras)}</div>
                    </div>
                </div>
                <div className="grid-responsive" style={{ display: "grid", gridTemplateColumns: isForPrint ? "1fr 300px" : "1fr 340px", gap: 32, alignItems: "start" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        {/* ANEXO A SECTION */}
                        {isAnexo && (
                            <div className="card" style={{ padding: 32, borderRadius: 24 }}>
                                <h2 style={{ margin: "0 0 24px 0", fontSize: 20, fontWeight: 900 }}>ANEXO A: Detalle de Operaciones</h2>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <CasillaEditable id="1" label="Ingresos por exportación de bienes y servicios" value={baseData.anexoA.casilla1} />
                                    <CasillaEditable id="2" label="Ingresos por ventas locales (Exento)" value={baseData.anexoA.casilla2} />
                                    <CasillaEditable id="4" label="Ingresos por servicios gravados (18%)" value={baseData.anexoA.casilla4} />
                                    <CasillaEditable id="5" label="Otros ingresos (No operacionales / Activos)" value={baseData.anexoA.casilla5} />
                                    <CasillaEditable id="6" label="Ventas Regímenes Especiales (B14)" value={baseData.anexoA.casilla6} />
                                    <CasillaEditable id="11" label="TOTAL INGRESOS POR OPERACIONES" value={derivedValues.totalVentas} isTotal readOnly />
                                </div>
                            </div>
                        )}

                        {/* IT-1 SECTION */}
                        {isIT1 && (
                            <div className="card" style={{ padding: 32, borderRadius: 24 }}>
                                <h2 style={{ margin: "0 0 24px 0", fontSize: 20, fontWeight: 900 }}>IT-1: Liquidación de Impuesto</h2>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <CasillaEditable id="21" label="Impuesto liquidado (Ventas)" value={derivedValues.itbisCobrado} />
                                    <CasillaEditable id="22" label="ITBIS pagado en compras locales" value={derivedValues.itbisCompras} />
                                    <CasillaEditable id="23" label="ITBIS pagado en importaciones" value={baseData.it1.casilla23} />
                                    <CasillaEditable id="24" label="Saldo a favor anterior (C27 mes anterior)" value={saldoAnterior} />
                                    <CasillaEditable id="25" label="Pagos computables (Retenciones / Pago a cuenta)" value={baseData.it1.casilla25} />
                                    <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
                                    <CasillaEditable id="28" label="TOTAL A PAGAR / (NUEVO SALDO A FAVOR)" value={derivedValues.aPagar > 0 ? derivedValues.aPagar : -derivedValues.saldoFavor} isTotal readOnly />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SIDEBAR ITEMS */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        <div className="card" style={{ padding: 24, textAlign: "center" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 16 }}>SALUD FISCAL</div>
                            <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 12px" }}>
                                <svg width="100" height="100" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="8" />
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent)" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 * (1 - 0.85)} strokeLinecap="round" transform="rotate(-90 50 50)" />
                                </svg>
                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900 }}>85%</div>
                            </div>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Rango fiscal óptimo</p>
                        </div>

                        <div className="card" style={{ padding: 24 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                                <Icon d={icons.zap} size={18} color="var(--accent)" />
                                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase" }}>ESTADÍSTICAS DEL PERIODO</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Facturas 606 (Gastos)</span>
                                    <span style={{ fontSize: 14, fontWeight: 900 }}>{stats.c606}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Facturas 607 (Ventas)</span>
                                    <span style={{ fontSize: 14, fontWeight: 900 }}>{stats.c607}</span>
                                </div>
                                <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 800 }}>Total Documentos</span>
                                    <span style={{ fontSize: 14, fontWeight: 900, color: "var(--accent)" }}>{stats.total}</span>
                                </div>
                            </div>
                        </div>
                        <div className="card" style={{ padding: 24, background: "rgba(15,23,42,0.02)" }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", marginBottom: 16 }}>Notificaciones IA</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {insights.length > 0 ? insights.slice(0, 3).map((insight, idx) => (
                                    <div key={idx} style={{ padding: 12, borderRadius: 12, background: "white", border: "1px solid var(--border)", display: "flex", gap: 10 }}>
                                        <div style={{ fontSize: 14 }}>{insight.icon}</div>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 800 }}>{insight.title}</div>
                                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{insight.description}</div>
                                        </div>
                                    </div>
                                )) : <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No se detectaron alertas.</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const capture = async (id, isFirst = false) => {
                const el = document.querySelector(`[data-export-id="${id}"]`);
                if (!el) return;
                const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
                const imgData = canvas.toDataURL("image/png");
                const imgProps = pdf.getImageProperties(imgData);
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                if (!isFirst) pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            };
            await capture("unifiedPrint", true);
            pdf.save(`IT1_Completo_${month}_${year}.pdf`);
        } catch (e) {
            console.error(e);
            alert("Error exportando PDF");
        } finally {
            setIsExporting(false);
        }
    };

    const handleAuditExport = async () => {
        setIsExportingAudit(true);
        try { await generatePreventiveAuditPDF(selectedClient || credits, insights, invoices); }
        finally { setIsExportingAudit(false); }
    };

    const handleExport606Txt = () => {
        const rnc = (selectedClient?.rnc || credits?.rnc || "000000000").replace(/[^0-9]/g, "");
        const periodo = `${year}${month.toString().padStart(2, "0")}`;
        export606Txt(invoices, rnc, periodo);
    };

    const handleExport607Txt = () => {
        const rnc = (selectedClient?.rnc || credits?.rnc || "000000000").replace(/[^0-9]/g, "");
        const periodo = `${year}${month.toString().padStart(2, "0")}`;
        export607Txt(invoices, rnc, periodo);
    };

    const handleExportIT1Excel = () => {
        const rnc = (selectedClient?.rnc || credits?.rnc || "000000000").replace(/[^0-9]/g, "");
        const periodo = `${year}${month.toString().padStart(2, "0")}`;
        const name = selectedClient?.nombre || "Cliente Fluxia";
        // Pasamos derivedValues para que el Excel coincida con la simulación de la pantalla
        exportIT1Official(baseData, derivedValues, rnc, periodo, name);
    };

    if (!hasAccess) return (
        <div className="page-content" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh" }}>
            <div className="card" style={{ padding: 48, maxWidth: 500, textAlign: "center" }}>
                <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 16 }}>Cerebro Fiscal Pro</h2>
                <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>Disponible exclusivamente para usuarios Pro y Premium.</p>
                <button className="btn-primary">Actualizar Plan</button>
            </div>
        </div>
    );

    if (!baseData) return <div className="page-content">Cargando...</div>;

    return (
        <div className="page-content fade-in">
            {/* Cabecera - Nivel 1: Título y Periodo */}
            <div className="no-print card" style={{
                marginBottom: 24, padding: "16px 32px", display: "flex",
                justifyContent: "space-between", alignItems: "center",
                background: "rgba(15,23,42,0.1)", border: "1px solid var(--border)"
            }}>
                <div>
                    <h1 className="font-display" style={{ fontSize: 32, fontWeight: 950, margin: 0, color: "var(--text-primary)" }}>Cerebro Fiscal</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 600, margin: 0 }}>Simulación IT-1</p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg-card)", padding: "8px 18px", borderRadius: 12, border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.05em" }}>FILTRAR PERIODO:</span>
                    <div style={{ display: "flex", gap: 8 }}>
                        <select className="input-field" style={{ width: 120, height: 38, fontSize: 13, fontWeight: 700 }} value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                            {meses.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                        </select>
                        <select className="input-field" style={{ width: 90, height: 38, fontSize: 13, fontWeight: 700 }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Acciones - Nivel 2: Botones de Exportación e Inteligencia */}
            <div className="no-print" style={{ marginBottom: 40, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn-secondary" style={{ height: 42, padding: "0 14px", fontSize: 11, display: "flex", alignItems: "center", gap: 8 }} onClick={() => setShowTxtMenu(!showTxtMenu)} ref={dropdownRef}>
                        <Icon d={icons.download} size={16} /> <span style={{ fontWeight: 700 }}>Exportar TXT</span>
                        {showTxtMenu && (
                            <div className="dropdown-menu-fiscal" style={{ position: "absolute", top: "110%", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 8, zIndex: 100, boxShadow: "0 10px 30px rgba(0,0,0,0.3)", minWidth: 200 }}>
                                <div onClick={handleExport606Txt} style={{ padding: "12px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12 }} className="nav-item">TXT 606 (Compras)</div>
                                <div onClick={handleExport607Txt} style={{ padding: "12px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12 }} className="nav-item">TXT 607 (Ventas)</div>
                            </div>
                        )}
                    </button>
                    <button className="btn-secondary" style={{ height: 42, padding: "0 14px", fontSize: 11, display: "flex", alignItems: "center", gap: 8 }} onClick={() => exportTo607(invoices, selectedClient, month, year)}>
                        <Icon d={icons.table} size={16} /> <span style={{ fontWeight: 700 }}>Excel Oficial 607</span>
                    </button>
                    <button className="btn-secondary" style={{ height: 42, padding: "0 14px", fontSize: 11, display: "flex", alignItems: "center", gap: 8 }} onClick={handleExportIT1Excel}>
                        <Icon d={icons.table} size={16} /> <span style={{ fontWeight: 700 }}>IT-1 Espejo DGII</span>
                    </button>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn-primary" style={{ height: 42, padding: "0 16px", fontSize: 11, display: "flex", alignItems: "center", gap: 8, background: "rgba(59,130,246,0.08)", color: "var(--accent)", border: "1px solid var(--accent-border)" }} onClick={handleAuditExport} disabled={isExportingAudit}>
                        <Icon d={icons.zap} size={16} /> <span style={{ fontWeight: 800 }}>Auditoría IA Global</span>
                    </button>
                    <button className="btn-primary" style={{ height: 42, padding: "0 18px", fontSize: 11, display: "flex", alignItems: "center", gap: 8 }} onClick={handleExportPDF} disabled={isExporting}>
                        <Icon d={icons.download} size={16} /> <span style={{ fontWeight: 800 }}>Informe PDF Completo</span>
                    </button>
                </div>
            </div>

            <div style={{ display: "flex", gap: 24, marginBottom: 32, borderBottom: "1px solid var(--border)" }}>
                <div onClick={() => setActiveTab("anexoA")} style={{ paddingBottom: 12, cursor: "pointer", fontSize: 14, fontWeight: 800, color: activeTab === "anexoA" ? "var(--accent)" : "var(--text-muted)", borderBottom: `3px solid ${activeTab === "anexoA" ? "var(--accent)" : "transparent"}` }}>ANEXO A</div>
                <div onClick={() => setActiveTab("it1")} style={{ paddingBottom: 12, cursor: "pointer", fontSize: 14, fontWeight: 800, color: activeTab === "it1" ? "var(--accent)" : "var(--text-muted)", borderBottom: `3px solid ${activeTab === "it1" ? "var(--accent)" : "transparent"}` }}>FORMULARIO IT-1</div>
            </div>

            <FullReportTemplate currentTab={activeTab} />

            <div style={{ position: "absolute", top: -9999, left: -9999 }}>
                <FullReportTemplate currentTab="anexoA" isForPrint={true} exportId="unifiedPrint" isUnified={true} />
            </div>
        </div>
    );
}
