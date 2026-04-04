import { generateFiscalInsights } from "../utils/fiscalIntelligence";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, CartesianGrid, ReferenceLine } from 'recharts';
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";
import { StatusBadge } from "./common/StatusBadge";
import { checkNCFAlerts, validateNCF } from "../utils/helpers";
import { export606Official } from "../utils/exportLogic";
import { generateMasterPDF } from "../utils/pdfExport";
import { bulkUpdateInvoiceStatus } from "../utils/airtableActions";
import { InvoiceEditModal } from "./InvoiceEditModal";
import { DashboardSkeleton } from "./SkeletonUI";
import { suggestCategory, learnCategory, getConfidenceColor, CATEGORIAS_606 } from "../utils/categoryAI";
import { useState, useMemo, useRef, useEffect } from 'react';

// Panel de Inteligencia Fiscal (Cerebro IA)
function FiscalIntelligenceInsights({ insights, plan, setPage }) {
    if (!insights || insights.length === 0) return null;
    const isLocked = plan === "basic";

    return (
        <div className={`card fade-in ${!isLocked ? 'focus-ring' : ''}`} style={{ 
            background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(99,102,241,0.04) 100%)",
            border: "1px solid rgba(59,130,246,0.2)",
            marginBottom: 32,
            padding: "24px 32px",
            position: "relative",
            overflow: "hidden"
        }}>
            {/* Fondo Decorativo Sutil */}
            {!isLocked && <div className="brain-pulse" style={{ position: "absolute", top: -20, right: -20, opacity: 0.05, fontSize: 120 }}>🧠</div>}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className={!isLocked ? "brain-pulse" : ""} style={{ 
                        width: 42, height: 42, borderRadius: 12, 
                        background: "linear-gradient(135deg, #3b82f6, #6366f1)", 
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 8px 20px rgba(59,130,246,0.25)"
                    }}>
                        <Icon d={icons.zap} size={20} stroke="white" />
                    </div>
                    <div>
                        <h3 className="font-display" style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                            Cerebro Fiscal — Inteligencia IA ✨
                        </h3>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>Análisis proactivo de riesgos y oportunidades en tiempo real.</p>
                    </div>
                </div>
                {isLocked && (
                    <button 
                        onClick={() => setPage("onboarding")}
                        style={{ 
                            background: "var(--accent)", color: "white", border: "none", padding: "8px 16px", 
                            borderRadius: 10, fontSize: 11, fontWeight: 800, cursor: "pointer",
                            boxShadow: "0 4px 12px var(--accent-glow)"
                        }}
                    >
                        💎 DESBLOQUEAR PRO
                    </button>
                )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, filter: isLocked ? "blur(3px)" : "none", pointerEvents: isLocked ? "none" : "auto", transition: "all 0.4s" }}>
                {insights.map((ins, i) => (
                    <div key={i} style={{ 
                        padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.02)", 
                        border: `1px solid ${ins.type === 'risk' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.1)'}`,
                        display: "flex", gap: 14
                    }}>
                        <div style={{ 
                            width: 32, height: 32, borderRadius: 8, 
                            background: ins.type === 'risk' ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)",
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                        }}>
                            <Icon d={ins.type === 'risk' ? icons.alert : icons.zap} size={15} stroke={ins.type === 'risk' ? 'var(--danger)' : 'var(--accent)'} />
                        </div>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{ins.title}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{ins.description}</div>
                        </div>
                    </div>
                ))}
            </div>

            {isLocked && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                    <div style={{ textAlign: "center", padding: 20 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Disponible en el Plan Pro / Premium</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Diagnósticos de riesgo, detección de duplicados y auditoría IA.</div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Chip visual de categoría IA
function AICategoryChip({ emisor, rnc }) {
    const [override, setOverride] = useState(null);
    const [showPick, setShowPick] = useState(false);
    const suggestion = useMemo(() => override || suggestCategory(emisor, rnc), [emisor, rnc, override]);
    const chipRef = useRef(null);

    useEffect(() => {
        if (!showPick) return;
        function handleClickOutside(e) {
            if (chipRef.current && !chipRef.current.contains(e.target)) {
                setShowPick(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showPick]);

    return (
        <div ref={chipRef} style={{ position: "relative", display: "inline-block", zIndex: showPick ? 9999 : 1 }} onClick={e => e.stopPropagation()}>
            {!suggestion ? (
                <button
                    onClick={() => setShowPick(p => !p)}
                    style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--bg-card)", border: "1px dashed var(--border)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontWeight: 600 }}
                >+ Categorizar</button>
            ) : (
                <div
                    onClick={() => setShowPick(p => !p)}
                    style={{ cursor: "pointer", display: "inline-flex", flexDirection: "column", gap: 3 }}
                    title={`Confianza: ${suggestion.confidence}% · Fuente: ${suggestion.source}`}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 9 }}>{suggestion.source === "usuario" ? "✏️" : "🤖"}</span>
                        <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6,
                            background: "rgba(59,130,246,0.1)", color: "var(--accent)",
                            whiteSpace: "nowrap"
                        }}>{suggestion.code} · {suggestion.label}</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${suggestion.confidence}%`, background: getConfidenceColor(suggestion.confidence), borderRadius: 2, transition: "width 0.4s" }} />
                    </div>
                </div>
            )}

            {showPick && (
                <div style={{
                    position: "absolute", top: "110%", right: 0,
                    background: "var(--bg-surface)", border: "1px solid var(--border)",
                    borderRadius: 12, padding: 8, boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
                    minWidth: 260, maxHeight: 280, overflowY: "auto"
                }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", padding: "4px 8px 8px", borderBottom: "1px solid var(--border)", marginBottom: 6 }}>CATEGORÍAS DGII 606</div>
                    {Object.entries(CATEGORIAS_606)
                        .sort(([codeA], [codeB]) => codeA.localeCompare(codeB))
                        .map(([code, label]) => (
                        <div
                            key={code}
                            onClick={(e) => {
                                e.stopPropagation();
                                learnCategory(emisor, rnc, code);
                                setOverride({ code, label, confidence: 100, source: "usuario" });
                                setShowPick(false);
                            }}
                            style={{
                                padding: "6px 10px", fontSize: 11, borderRadius: 8, cursor: "pointer",
                                fontWeight: suggestion?.code === code ? 800 : 400,
                                color: suggestion?.code === code ? "var(--accent)" : "var(--text-primary)",
                                background: suggestion?.code === code ? "rgba(59,130,246,0.1)" : "transparent"
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                            onMouseLeave={e => e.currentTarget.style.background = suggestion?.code === code ? "rgba(59,130,246,0.1)" : "transparent"}
                        >
                            <span style={{ fontWeight: 800, marginRight: 6 }}>{code}</span>{label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

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
            <div className="grid-responsive" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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

function EstadoFacturasWidget({ stats }) {
    const totalStatus = stats.validas + stats.errors + stats.pending;
    
    // Si no hay facturas, mostramos el anillo multicolor de placeholder que le gustó al usuario.
    let validPct = 65, pendingPct = 15, errorPct = 20;

    if (totalStatus > 0) {
        validPct = Math.round((stats.validas / totalStatus) * 100);
        errorPct = Math.round((stats.errors / totalStatus) * 100);
        pendingPct = 100 - validPct - errorPct; // Pendientes o revisiones (el resto)
    }

    // Calculamos los cortes para el gráfico circular (conic-gradient empieza a las 12 en punto)
    const stop1 = validPct;
    const stop2 = validPct + pendingPct;
    
    // Anillo dinámico: Verde (Válidas) -> Amarillo/Naranja (Revisión) -> Rojo (Error)
    const bgStyle = `conic-gradient(var(--success) 0% ${stop1}%, var(--warning) ${stop1}% ${stop2}%, var(--danger) ${stop2}% 100%)`;

    const realValidRateText = totalStatus > 0 ? validPct : 0;
    const realErrorRateText = totalStatus > 0 ? errorPct : 0;

    return (
        <div className="card chart-card" style={{ display: "flex", flexDirection: "column" }}>
            <h3 className="font-display" style={{ fontSize: 16, margin: "0 0 24px 0", textAlign: "center" }}>Estado de Facturas</h3>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, padding: "0 10px" }}>
                
                {/* Círculo Gráfico Dinámico (CSS puro, no Recharts) */}
                <div style={{
                    width: 100, height: 100, borderRadius: "50%",
                    background: bgStyle,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                    opacity: totalStatus === 0 ? 0.8 : 1 // Un poco más suave si no hay datos
                }}>
                    {/* Hueco Interior (Efecto Donut) */}
                    <div style={{ 
                        width: 76, height: 76, background: "var(--bg-card)", borderRadius: "50%", 
                        display: "flex", alignItems: "center", justifyContent: "center" 
                    }}>
                        <span className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
                            {realValidRateText}%
                        </span>
                    </div>
                </div>

                <div style={{ flex: 1, paddingLeft: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 8, height: 8, background: "var(--success)", borderRadius: "50%" }} />
                        <div style={{ fontSize: 12, color: "var(--text-muted)", flex: 1 }}>Válidas DGII</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>{stats.validas} <span style={{opacity: 0.5}}>({realValidRateText}%)</span></div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, background: "var(--danger)", borderRadius: "50%" }} />
                        <div style={{ fontSize: 12, color: "var(--text-muted)", flex: 1 }}>Con error</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)" }}>{stats.errors} <span style={{opacity: 0.5}}>({realErrorRateText}%)</span></div>
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: "16px 0", marginTop: "auto" }}>
                <div style={{ flex: 1, textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ color: "var(--success)", fontWeight: 800, fontSize: 14 }}>B01</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", margin: "4px 0 8px" }}>Crédito Fiscal</div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{stats.b01}</div>
                </div>
                <div style={{ flex: 1, textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ color: "#3b82f6", fontWeight: 800, fontSize: 14 }}>B02</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", margin: "4px 0 8px" }}>Consumidor Final</div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{stats.b02}</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ color: "#14b8a6", fontWeight: 800, fontSize: 14 }}>B04</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", margin: "4px 0 8px" }}>Gubernamental</div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{stats.b04}</div>
                </div>
            </div>
        </div>
    );
}

export function Dashboard({ setPage, invoices, rawInvoices, mockInvoices, setMockInvoices, dataLoading, credits, selectedClient, reloadInvoices, deleteInvoice, editInvoice, filters, setFilters, confirmAction }) {
    const [selectedIds, setSelectedIds] = useState([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const chartsRef = useRef(null);

    const allInvoices = useMemo(() => invoices || [], [invoices]);

    const stats = useMemo(() => {
        if (!allInvoices) return { total: 0, itbis: 0, pending: 0, errors: 0, itbis_ventas: 0, itbis_compras: 0, ventas_totales: 0, gastos_totales: 0, fiscalRisks: 0, itbis_a_pagar: 0, facturasTotales: 0, validas: 0, b01: 0, b02: 0, b04: 0, categoryData: [], itbisComparison: [] };
        const data = allInvoices;
        
        const gastos_totales = data.filter(i => i.tipo_fiscal === "606").reduce((acc, inv) => acc + (inv.monto_total || 0), 0);
        const ventas_totales = data.filter(i => i.tipo_fiscal === "607").reduce((acc, inv) => acc + (inv.monto_total || 0), 0);
        
        const itbis_compras = data.filter(i => i.tipo_fiscal === "606").reduce((acc, inv) => acc + (inv.itbis_total || 0), 0);
        const itbis_ventas = data.filter(i => i.tipo_fiscal === "607").reduce((acc, inv) => acc + (inv.itbis_total || 0), 0);
        
        const b01 = data.filter(i => i.ncf && (i.ncf?.toUpperCase().startsWith("B01") || i.ncf?.toUpperCase().startsWith("E31"))).length;
        const b02 = data.filter(i => i.ncf && (i.ncf?.toUpperCase().startsWith("B02") || i.ncf?.toUpperCase().startsWith("E32"))).length;
        const b04 = data.filter(i => i.ncf && (i.ncf?.toUpperCase().startsWith("B04") || i.ncf?.toUpperCase().startsWith("E34"))).length;
        
        const pending = data.filter(i => i.estado?.toLowerCase() === "revision").length;
        const errors = data.filter(i => i.estado?.toLowerCase() === "error").length;
        const fiscalRisks = data.filter(i => !validateNCF(i.ncf, i.tipo_fiscal).valid).length;

        const categoriesMap = {};
        data.filter(i => i.tipo_fiscal === "606").forEach(inv => {
            let cat = inv.categoria;
            if (!cat || cat === "Sin categoría") {
                const suggestion = suggestCategory(inv.emisor, inv.rnc);
                cat = suggestion ? suggestion.label : "Sin categoría";
            }
            categoriesMap[cat] = (categoriesMap[cat] || 0) + (inv.monto_total || 0);
        });
        const categoryData = Object.entries(categoriesMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        const itbisComparison = [
            { name: "ITBIS Cobrado (607)", itbis: itbis_ventas, color: "var(--accent)" },
            { name: "ITBIS Pagado (606)", itbis: itbis_compras, color: "var(--warning)" }
        ];

        return { 
            total: (ventas_totales - gastos_totales), 
            itbis: itbis_ventas, 
            pending, 
            errors, 
            itbis_ventas, 
            itbis_compras, 
            ventas_totales, 
            gastos_totales, 
            fiscalRisks, 
            balance_itbis: itbis_ventas - itbis_compras,
            itbis_a_pagar: Math.max(0, itbis_ventas - itbis_compras), 
            facturasTotales: data.length, 
            validas: data.filter(i => i.estado?.toLowerCase() === "valido").length, 
            b01, b02, b04,
            categoryData,
            itbisComparison
        };
    }, [allInvoices]);

    const historicalStats = useMemo(() => {
        if (!rawInvoices || rawInvoices.length === 0) return [];
        
        const monthsMap = {};
        rawInvoices.forEach(inv => {
            if (!inv.fecha || inv.fecha === "—") return;
            let monthLabel = "";
            let sortKey = "";
            
            if (inv.fecha.includes("/")) {
                const parts = inv.fecha.split("/");
                if (parts.length === 3) {
                    const month = parseInt(parts[1], 10);
                    const year = parts[2] > 2000 ? parts[2].substring(2) : parts[2];
                    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
                    monthLabel = `${monthNames[month - 1]} '${year}`;
                    sortKey = `${parts[2]}-${parts[1].padStart(2, '0')}`;
                }
            } else if (inv.fecha.includes("-")) {
                const parts = inv.fecha.split("-");
                if (parts.length === 3) {
                    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
                    const mIdx = parseInt(parts[1], 10) - 1;
                    monthLabel = `${monthNames[mIdx]} '${parts[0].substring(2)}`;
                    sortKey = `${parts[0]}-${parts[1].padStart(2, '0')}`;
                }
            }
            if (!monthLabel) return;
            
            if (!monthsMap[monthLabel]) {
                monthsMap[monthLabel] = { name: monthLabel, ventas_itbis: 0, compras_itbis: 0, ventas_monto: 0, compras_monto: 0, sortKey };
            }
            if (inv.tipo_fiscal === "607") {
                monthsMap[monthLabel].ventas_itbis += (inv.itbis_total || 0);
                monthsMap[monthLabel].ventas_monto += (inv.monto_total || 0);
            } else if (inv.tipo_fiscal === "606") {
                monthsMap[monthLabel].compras_itbis += (inv.itbis_total || 0);
                monthsMap[monthLabel].compras_monto += (inv.monto_total || 0);
            }
        });

        const sorted = Object.values(monthsMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        const last6 = sorted.slice(-6);
        
        last6.forEach(m => {
            m.balance = m.ventas_itbis - m.compras_itbis; 
            m.itbis = m.ventas_itbis; 
            m.ventas = m.ventas_itbis;
            m.compras = m.compras_itbis;
        });

        return last6;
    }, [rawInvoices]);

    const trends = useMemo(() => {
        if (historicalStats.length < 2) return null;
        const current = historicalStats[historicalStats.length - 1];
        const prev = historicalStats[historicalStats.length - 2];

        const calc = (curr, old) => {
            if (!old) return 0;
            return Math.round(((curr - old) / Math.abs(old)) * 100);
        };

        return {
            ventas: calc(current.ventas_monto, prev.ventas_monto),
            compras: calc(current.compras_monto, prev.compras_monto),
            itbis: calc(current.balance, prev.balance)
        };
    }, [historicalStats]);

    const insights = useMemo(() => generateFiscalInsights(allInvoices, historicalStats), [allInvoices, historicalStats]);

    if (dataLoading) return <DashboardSkeleton />;

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

    const handleExportPDF = async () => {
        setIsExportingPDF(true);
        try {
            await generateMasterPDF(selectedClient || credits, stats, chartsRef.current);
        } catch (err) {
            console.error("Error generando PDF:", err);
            alert("Hubo un error al generar el PDF. Por favor intenta nuevamente.");
        } finally {
            setIsExportingPDF(false);
        }
    };

    return (
        <div className="fade-in">
            {selectedClient && (
                <div style={{ marginBottom: 40, textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12, color: "var(--accent)", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
                        <Icon d={icons.layers} size={16} stroke="var(--accent)" /> PANEL DE CONTROL
                    </div>
                    <h1 className="font-display" style={{ 
                        fontSize: "clamp(24px, 5vw, 36px)", fontWeight: 950, marginBottom: 8, 
                        background: "linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 100%)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                        letterSpacing: "-0.04em"
                    }}>
                        {selectedClient.nombre}
                    </h1>
                    <div style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>
                        Gestionando facturación de <span style={{ color: "var(--text-primary)", fontWeight: 800 }}>{selectedClient.rnc}</span>
                    </div>
                </div>
            )}

            <FiscalIntelligenceInsights insights={insights} plan={credits?.plan} setPage={setPage} />

            <FacturasAVencer invoices={invoices} />

            <div className="grid-responsive" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20, marginBottom: 32 }}>
                {[
                    { label: "INGRESOS (607)", val: credits?.plan === "basic" ? "💎 Lock" : `RD$${stats.ventas_totales.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`, icon: icons.trending, color: "var(--success)", trend: trends?.ventas, locked: credits?.plan === "basic" },
                    { label: "GASTOS (606)", val: `RD$${stats.gastos_totales.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`, icon: icons.layers, color: "var(--accent)", trend: trends?.compras },
                    { label: "ITBIS A PAGAR (EST.)", val: credits?.plan === "basic" ? "💎 Lock" : `RD$${stats.itbis_a_pagar.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`, icon: icons.zap, color: stats.itbis_a_pagar > 0 ? "var(--danger)" : "var(--success)", sub: "Saldo del Mes", trend: trends?.itbis, locked: credits?.plan === "basic" },
                    { label: "RIESGO FISCAL", val: stats.fiscalRisks, icon: icons.alert, color: stats.fiscalRisks > 0 ? "var(--danger)" : "var(--success)", sub: "No Deducibles" },
                    { label: "CON ERRORES", val: stats.errors, icon: icons.x, color: "var(--danger)", sub: "Requerido" },
                    { label: "FACTURAS TOTALES", val: stats.facturasTotales, icon: icons.file, color: "var(--text-primary)", sub: "Este mes" },
                ].map((k, i) => (
                    <div key={i} className={`kpi-card ${k.locked ? "locked-kpi" : ""}`} style={{ 
                        position: "relative",
                        border: "1px solid var(--border)",
                        background: "var(--bg-card)",
                        transition: "transform 0.2s, box-shadow 0.2s"
                    }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={e => e.currentTarget.style.transform = ""}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                            <div style={{ width: 34, height: 34, background: `${k.color}15`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Icon d={k.icon} size={16} stroke={k.color} />
                            </div>
                            {k.trend !== undefined && k.trend !== null && !k.locked && (
                                <div style={{ 
                                    fontSize: 10, fontWeight: 800, color: k.trend > 0 ? "var(--danger)" : "var(--success)", 
                                    background: k.trend > 0 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                                    padding: "2px 6px", borderRadius: 6, display: "flex", alignItems: "center", gap: 3
                                }}>
                                    <Icon d={k.trend > 0 ? icons.arrowUp : icons.arrowDown} size={10} stroke={k.trend > 0 ? "var(--danger)" : "var(--success)"} />
                                    {Math.abs(k.trend)}%
                                </div>
                            )}
                            {k.sub && !k.trend && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{k.sub}</span>}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontSize: 17, fontWeight: 900, color: k.locked ? "var(--accent)" : "var(--text-primary)", letterSpacing: -0.5 }}>{k.val}</div>
                        {k.locked && (
                             <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.02)", cursor: "pointer", borderRadius: 16 }} onClick={() => { setPage("onboarding") }} title="Mejora a un plan PRO para desbloquear" />
                        )}
                    </div>
                ))}
            </div>

            <div className="charts-grid fade-in" ref={chartsRef}>
                <div className="card chart-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <Icon d={icons.pie} size={16} stroke="var(--accent)" />
                    </div>
                    <div style={{ height: 280, width: '100%' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={stats.categoryData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={[ '#6366f1', '#a855f7', '#ec4899', '#f97316', '#eab308' ][index % 5]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}
                                    itemStyle={{ fontSize: 12 }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 20 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card chart-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <h3 className="font-display" style={{ fontSize: 16, margin: 0 }}>Balance de ITBIS</h3>
                        <div style={{ fontSize: 11, background: "var(--accent-glow)", color: "var(--accent)", padding: "4px 10px", borderRadius: 20, fontWeight: 700 }}>
                            Proyectado
                        </div>
                    </div>
                    <div style={{ height: 280, width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={stats.itbisComparison}>
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }} 
                                />
                                <YAxis hide />
                                <RechartsTooltip 
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }} 
                                />
                                <Bar dataKey="itbis" radius={[10, 10, 0, 0]} barSize={50}>
                                    {stats.itbisComparison.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ marginTop: 20, textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {stats.balance_itbis < 0 ? "Saldo a Favor (Crédito):" : "Impuesto a Pagar:"}
                        </div>
                        <div className="font-display" style={{ fontSize: 24, color: stats.balance_itbis < 0 ? 'var(--success)' : 'var(--text-primary)', fontWeight: 800 }}>
                            RD${Math.abs(stats.balance_itbis).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
                
                <EstadoFacturasWidget stats={stats} />
            </div>

            {/* Histórico Mensual */}
            {historicalStats.length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <h3 className="font-display" style={{ fontSize: 16, margin: "0 0 20px 0" }}>Histórico de Balance de ITBIS</h3>
                    <div style={{ height: 250, width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={historicalStats} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }} 
                                    tickFormatter={(val) => `RD$${(val/1000).toFixed(0)}k`}
                                />
                                <RechartsTooltip 
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}
                                    formatter={(value, name) => {
                                        const label = name === 'balance' ? 'Neto' : name === 'ventas' ? 'ITBIS Cobrado' : 'ITBIS Pagado';
                                        return [`RD$${Math.abs(value).toLocaleString('en-US', {minimumFractionDigits: 2})}`, label];
                                    }}
                                />
                                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                                <Bar dataKey="balance" radius={[4, 4, 4, 4]} barSize={40}>
                                    {historicalStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.balance < 0 ? 'var(--success)' : 'var(--danger)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Últimas Facturas Procesadas</h3>
                        {/* Universal Quick Filters */}
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{ display: "flex", background: "var(--bg-base)", borderRadius: 8, padding: 2, border: "1px solid var(--border)" }}>
                                {["todos", "606", "607"].map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => setFilters({ ...filters, type: t })}
                                        style={{ 
                                            background: filters.type === t ? "var(--accent)" : "transparent",
                                            color: filters.type === t ? "white" : "var(--text-muted)",
                                            border: "none", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase" 
                                        }}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                <input 
                                    type="date" 
                                    className="input-field"
                                    value={filters.dateRange.from}
                                    onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, from: e.target.value } })}
                                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--text-primary)", width: "auto" }}
                                    title="Desde"
                                />
                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>a</span>
                                <input 
                                    type="date" 
                                    className="input-field"
                                    value={filters.dateRange.to}
                                    onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, to: e.target.value } })}
                                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--text-primary)", width: "auto" }}
                                    title="Hasta"
                                />
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                        <button className="btn-secondary desktop-only" onClick={handleExportExcel} style={{ fontSize: 12, padding: "6px 14px", height: "auto" }}>
                            <Icon d={icons.zap} size={14} /> Exportar Excel
                        </button>
                        <button 
                            className="btn-primary" 
                            onClick={handleExportPDF} 
                            disabled={isExportingPDF}
                            style={{ width: "auto", fontSize: 12, padding: "6px 14px", height: "auto", opacity: isExportingPDF ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}
                        >
                            {isExportingPDF ? (
                                <><Icon d={icons.zap} size={14} /> Generando...</>
                            ) : (
                                <><Icon d={icons.file} size={14} /> Reporte PDF</>
                            )}
                        </button>
                        <button 
                            className="btn-ghost" 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const d = new Date();
                                const todayISO = d.toISOString().split("T")[0];
                                const todayLocal = d.toLocaleDateString("es-DO");
                                const newMock1 = {
                                    id: "SIM-NCF-" + Math.random().toString(36).substr(2, 9),
                                    emisor: "SOPORTE FLUXIA (RIESGO DETECTADO)",
                                    rnc: "101999999",
                                    ncf: "B0212345678",
                                    monto: "RD$2,450.00",
                                    monto_total: 2450.00,
                                    itbis: "RD$441.00",
                                    itbis_total: 441.00,
                                    fecha: todayISO,
                                    fecha_emision: todayLocal,
                                    tipo_fiscal: "606",
                                    estado: "valido",
                                    isMock: true
                                };
                                setMockInvoices([newMock1, ...mockInvoices]);
                                alert("✅ Simulación Cargada");
                            }}
                            style={{ fontSize: 11, padding: "8px 16px", border: "1px dashed var(--accent)", color: "var(--accent)", background: "var(--accent-glow)", minHeight: "44px" }}
                        >
                            🧪 Simular Riesgo
                        </button>
                        <button className="btn-ghost" onClick={() => setPage("procesar")} style={{ minHeight: "44px" }}>Ver todo →</button>
                    </div>
                </div>

                <div className="scroll-area">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 40 }}><input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length === allInvoices.length && allInvoices.length > 0} /></th>
                                <th>FECHA</th>
                                <th>EMISOR / RNC</th>
                                <th>NCF</th>
                                <th>MONTO</th>
                                <th>ESTADO</th>
                                {credits?.plan !== "basic" && <th>TAG</th>}
                                <th>CATEGORÍA</th>
                                <th style={{ textAlign: "right" }}>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((inv) => (
                                <tr key={inv.id} className={inv.isMock ? "row-mock" : ""}>
                                    <td><input type="checkbox" checked={selectedIds.includes(inv.airtableId || inv.id)} onChange={() => toggleSelect(inv.airtableId || inv.id)} /></td>
                                    <td style={{ fontSize: 12 }}>{inv.fecha}</td>
                                    <td>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{inv.emisor}</div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{inv.rnc}</div>
                                    </td>
                                    <td style={{ fontSize: 13, letterSpacing: 0.5, fontWeight: 500 }}>
                                        {inv.ncf}
                                        {!validateNCF(inv.ncf, inv.tipo_fiscal).valid && (
                                            <span style={{ marginLeft: 6, color: "var(--danger)" }} title="NCF no válido para este tipo fiscal">
                                                <Icon d={icons.alert} size={14} />
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
                                    <td><AICategoryChip emisor={inv.emisor} rnc={inv.rnc} /></td>
                                    <td style={{ textAlign: "right" }}>
                                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                                            <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setEditingInvoice(inv)} title="Editar">
                                                <Icon d={icons.settings} size={14} />
                                            </button>
                                            <button 
                                                className="btn-ghost" 
                                                style={{ color: "var(--danger)", padding: 8, minHeight: "44px", minWidth: "44px" }} 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    confirmAction(
                                                        "¿Eliminar factura?",
                                                        `¿Estás seguro de que deseas eliminar este registro de ${inv.emisor}?`,
                                                        () => {
                                                            if (inv.isMock) {
                                                                setMockInvoices(prev => prev.filter(m => m.id !== inv.id));
                                                            } else {
                                                                deleteInvoice(inv.airtableId);
                                                            }
                                                        }
                                                    );
                                                }}
                                            >
                                                <Icon d={icons.trash} size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedIds.length > 0 && (
                <div className="bulk-actions-bar active">
                    <div style={{ color: "white", fontSize: 13, fontWeight: 700 }}>{selectedIds.length} seleccionadas</div>
                    <button className="btn-primary" onClick={handleBulkConfirm} disabled={isUpdating}>
                        {isUpdating ? "..." : "Confirmar"}
                    </button>
                </div>
            )}

            {editingInvoice && (
                <InvoiceEditModal 
                    invoice={editingInvoice} 
                    onClose={() => setEditingInvoice(null)} 
                    onSave={(updated) => editInvoice(editingInvoice.airtableId, updated)} 
                />
            )}
        </div>
    );
}
