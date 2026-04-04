import React, { useState, useMemo, useRef } from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";
import { calculateIT1, formatCurrency } from "../utils/fiscalEngine";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { exportTo607 } from "../utils/export607";
import { export606Txt, export607Txt } from "../utils/exportLogic";
import { validateNCF } from "../utils/helpers";
import { generatePreventiveAuditPDF } from "../utils/pdfExport";
import { generateFiscalInsights } from "../utils/fiscalIntelligence";

export function IT1View({ invoices, selectedClient, credits }) {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [saldoAnterior, setSaldoAnterior] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [isExportingAudit, setIsExportingAudit] = useState(false);
    const [showTxtMenu, setShowTxtMenu] = useState(false);
    const reportRef = useRef(null);
    const dropdownRef = useRef(null);

    // Cerrar menú al hacer clic fuera
    React.useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowTxtMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Meses para el selector
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    // Años para el selector
    const years = [2024, 2025, 2026];

    // Plan gate: Solo Pro y Premium
    const plan = credits?.plan?.toLowerCase() ?? "basic";
    const hasAccess = plan === "pro" || plan === "premium";

    // Detectar Riesgos Fiscales en el periodo seleccionado
    const fiscalRisks = useMemo(() => {
        if (!invoices) return [];
        return invoices.filter(inv => {
            if (!inv.fecha || inv.fecha === "—") return false;
            const [y, m] = inv.fecha.split("-").map(Number);
            if (y !== year || m !== month) return false;
            return !validateNCF(inv.ncf, inv.tipo_fiscal).valid;
        });
    }, [invoices, month, year]);

    // Detectar Facturas Extemporáneas (Vencidas / Periodos Anteriores)
    const extempRisks = useMemo(() => {
        if (!invoices) return [];
        return invoices.filter(inv => {
            if (!inv.fecha || inv.fecha === "—") return false;
            if (inv.estado !== "valido") return false;
            const [y, m] = inv.fecha.split("-").map(Number);
            
            // Si es estrictamente anterior al periódo actual seleccionado
            const isPast = (y < year) || (y === year && m < month);
            if (!isPast) return false;
            
            // Mostrar si es de los ultimos 12 meses
            const monthDiff = (year - y) * 12 + (month - m);
            return monthDiff > 0 && monthDiff <= 12; 
        });
    }, [invoices, month, year]);

    // Ejecutar Motor Fiscal
    const data = useMemo(() => {
        if (!invoices) return null;
        return calculateIT1(invoices, month, year);
    }, [invoices, month, year]);

    // Calcular insights para el periodo seleccionado
    const insights = useMemo(() => {
        if (!invoices) return [];
        const periodInvoices = invoices.filter(inv => {
            if (!inv.fecha || inv.fecha === "—") return false;
            const [y, m] = inv.fecha.split("-").map(Number);
            return y === year && m === month;
        });
        return generateFiscalInsights(periodInvoices);
    }, [invoices, month, year]);

    const handleAuditExport = async () => {
        if (!hasAccess) return;
        setIsExportingAudit(true);
        try {
            await generatePreventiveAuditPDF(selectedClient || credits, insights, invoices);
        } catch (err) {
            console.error("Audit export error:", err);
            alert("Error al generar auditoría.");
        } finally {
            setIsExportingAudit(false);
        }
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

    if (!data) return <div className="page-content">Cargando datos fiscales...</div>;

    const itbisNeto = data.resultado.balance - saldoAnterior;
    const aPagarFinal = itbisNeto > 0 ? itbisNeto : 0;
    const nuevoSaldoFavor = itbisNeto < 0 ? Math.abs(itbisNeto) : 0;

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setIsExporting(true);
        try {
            const element = reportRef.current;
            // Capturar el contenido forzando estilos de "Impresión Moderna"
            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
                onclone: (clonedDoc) => {
                    const style = clonedDoc.createElement("style");
                    style.innerHTML = `
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');
                        
                        .it1-print-container {
                            background: #ffffff !important;
                            color: #0f172a !important;
                            padding: 60px !important;
                            width: 1100px !important;
                            font-family: 'Inter', sans-serif !important;
                            opacity: 1 !important;
                        }
                        
                        .print-only-show { display: block !important; }
                        .no-print { display: none !important; }
                                        /* Texto oscuro globalmente para el contenido blanco */
                        h1, h4, span, p, div:not(.pdf-print-header):not(.pdf-print-header *) { 
                            color: #0f172a !important; 
                            opacity: 1 !important;
                            -webkit-text-fill-color: #0f172a !important;
                        }
                        
                        .font-display { 
                            color: #000000 !important; 
                            font-weight: 900 !important;
                        }

                        .card, .kpi-card {
                            background: #ffffff !important;
                            border: 1px solid #d1d5db !important;
                            box-shadow: none !important;
                            border-radius: 12px !important;
                            color: #000000 !important;
                        }
                        
                        .badge {
                            background: #ffffff !important;
                            border: 1.5px solid #2563eb !important;
                            color: #2563eb !important;
                            font-weight: 900 !important;
                        }

                        .divider { background: #d1d5db !important; height: 1px !important; }

                        /* Cabecera compacta: MÁXIMA especificidad para textos blancos */
                        .pdf-print-header,
                        .pdf-print-header div,
                        .pdf-print-header span,
                        .pdf-print-header p {
                            background: #0f172a !important;
                            -webkit-print-color-adjust: exact !important;
                        }

                        /* Texto blanco en header — alta especificidad para ganar al reset global */
                        html body .pdf-print-header div,
                        html body .pdf-print-header span {
                            color: #ffffff !important;
                            -webkit-text-fill-color: #ffffff !important;
                            opacity: 1 !important;
                        }

                        /* Texto gris (subtítulos) en header */
                        html body .pdf-print-header div[style*="#94a3b8"],
                        html body .pdf-print-header div[style*="color: #94"] {
                            color: #94a3b8 !important;
                            -webkit-text-fill-color: #94a3b8 !important;
                        }

                        input {
                            border: none !important;
                            background: transparent !important;
                            color: #000000 !important;
                            font-weight: 800 !important;
                            font-size: 16px !important;
                        }
                    `;
                    clonedDoc.head.appendChild(style);
                    
                    // Aplicar clase premium a la cabecera de impresión
                    const printHeader = clonedDoc.querySelector('.print-only-show');
                    if (printHeader) {
                        printHeader.classList.add('pdf-print-header');
                        // Forzar colores directamente en el DOM — más confiable que CSS override
                        printHeader.style.cssText = 'background: #0f172a !important; display: flex !important; justify-content: space-between; align-items: center; padding: 14px 28px;';
                        // Forzar todos los textos del header a blanco
                        const allEls = printHeader.querySelectorAll('*');
                        allEls.forEach(el => {
                            el.style.color = '#ffffff';
                            el.style.webkitTextFillColor = '#ffffff';
                            el.style.opacity = '1';
                        });
                        // Re-aplicar subtítulos grises
                        const subtitles = printHeader.querySelectorAll('[data-muted]');
                        subtitles.forEach(el => {
                            el.style.color = '#94a3b8';
                            el.style.webkitTextFillColor = '#94a3b8';
                        });
                    }
                }
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgProps = pdf.getImageProperties(imgData);
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            
            const clientName = (selectedClient?.nombre || "Empresa").replace(/\s+/g, "_");
            const fileName = `IT1_${clientName}_${meses[month - 1]}_${year}.pdf`;
            
            pdf.save(fileName);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Error al generar el PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    // Mostrar paywall si el plan no tiene acceso
    if (!hasAccess) {
        return (
            <div className="page-content fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", textAlign: "center", gap: 24 }}>
                <div style={{
                    background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.1))",
                    border: "1px solid rgba(59,130,246,0.3)",
                    borderRadius: 24,
                    padding: "48px 40px",
                    maxWidth: 480,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 20,
                    boxShadow: "0 20px 60px rgba(59,130,246,0.12)"
                }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: "50%",
                        background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 32, boxShadow: "0 8px 24px rgba(59,130,246,0.4)"
                    }}>
                        🧠
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
                            Cerebro Fiscal
                        </h2>
                        <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
                            El motor de declaración IT-1, reporte 606/607 y análisis de riesgos fiscales está disponible exclusivamente en los planes <strong style={{ color: "#3b82f6" }}>Pro</strong> y <strong style={{ color: "#6366f1" }}>Premium</strong>.
                        </p>
                    </div>
                    <div style={{
                        background: "rgba(59,130,246,0.1)", borderRadius: 12,
                        padding: "12px 20px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7
                    }}>
                        ✅ Motor de cálculo IT-1 automático<br/>
                        ✅ Exportación 606 / 607 DGII<br/>
                        ✅ Detección de riesgos fiscales y NCF inválidos
                    </div>
                    <a
                        href="https://whop.com/checkout/plan_ldaj8xJ6vh51X"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 8,
                            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                            color: "white", padding: "12px 28px", borderRadius: 12,
                            fontWeight: 700, fontSize: 14, textDecoration: "none",
                            boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
                            transition: "transform 0.2s, box-shadow 0.2s"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(59,130,246,0.5)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 16px rgba(59,130,246,0.4)"; }}
                    >
                        🚀 Actualizar a Pro — Ver planes
                    </a>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                        Plan actual: <span style={{ color: "#f59e0b", fontWeight: 600, textTransform: "capitalize" }}>{plan}</span>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div ref={reportRef} className="page-content fade-in">
            {/* Cabecera Compacta de Impresión (Solo Visible en PDF) */}
            <div className="print-only-show" style={{ background: "#0f172a", padding: "14px 28px", marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: -32 }}>
                {/* Izquierda: Logo + Nombre + Subtítulo */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src="/icon-512.png" alt="Fluxia" style={{ width: 36, height: 36, objectFit: "contain" }} />
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.02em", lineHeight: 1 }}>FLUXIA</div>
                        <div data-muted="true" style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>Reporte de Simulación Fiscal · IT-1</div>
                    </div>
                </div>

                {/* Centro: Cliente */}
                {selectedClient && (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#ffffff" }}>{selectedClient.nombre}</div>
                        <div data-muted="true" style={{ fontSize: 10, color: "#94a3b8" }}>RNC: {selectedClient.rnc}</div>
                    </div>
                )}

                {/* Derecha: Periodo + Fecha */}
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff" }}>{meses[month - 1]} {year}</div>
                    <div data-muted="true" style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>Emisión: {new Date().toLocaleDateString("es-DO")}</div>
                </div>
            </div>

            {/* Header / Filtros (Oculto en Impresión) */}
            <div className="no-print" style={{ marginBottom: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
                {/* Título Centrado */}
                <div style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                        <div className="badge badge-info" style={{ fontSize: 11, padding: "4px 12px", letterSpacing: "1px", fontWeight: 800 }}>
                            {credits?.plan?.toUpperCase()} PLAN
                        </div>
                    </div>
                    <h1 className="font-display" style={{ fontSize: 42, fontWeight: 950, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.04em" }}>Cerebro Fiscal</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: 8, fontSize: 16, fontWeight: 600 }}>Simulación de Declaración Jurada IT-1 (ITBIS)</p>
                </div>

                {/* Controles y Botones (Fila Inferior) */}
                <div style={{ 
                    width: "100%", 
                    display: "flex", 
                    justifyContent: "center", 
                    alignItems: "flex-end", 
                    gap: 16, 
                    padding: "24px", 
                    background: "rgba(59,130,246,0.03)", 
                    borderRadius: 24, 
                    border: "1px solid var(--border)",
                    flexWrap: "wrap"
                }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", textAlign: "center" }}>Mes del Periodo</label>
                        <select 
                            className="input-field" 
                            style={{ width: 160, height: 46, fontSize: 15, fontWeight: 700 }} 
                            value={month} 
                            onChange={(e) => setMonth(parseInt(e.target.value))}
                        >
                            {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", textAlign: "center" }}>Año Fiscal</label>
                        <select 
                            className="input-field" 
                            style={{ width: 110, height: 46, fontSize: 15, fontWeight: 700 }} 
                            value={year} 
                            onChange={(e) => setYear(parseInt(e.target.value))}
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    {/* Espaciador en desktop para separar selectores de botones si hay espacio */}
                    <div style={{ flex: 1, minWidth: 20 }}></div>

                    <div style={{ display: "flex", gap: 12 }}>
                        {/* Dropdown de TXT (Acción por Click) */}
                        <div style={{ position: "relative" }} ref={dropdownRef}>
                            <button 
                                className={`btn-secondary ${showTxtMenu ? 'active' : ''}`}
                                onClick={() => setShowTxtMenu(!showTxtMenu)}
                                style={{ height: 46, padding: "0 24px", display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap", fontSize: 14, fontWeight: 700 }}
                            >
                                <Icon d={icons.download} size={18} /> Envío de Datos (TXT)
                                <Icon d={icons.chevronDown} size={14} style={{ transform: showTxtMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>
                            
                            {showTxtMenu && (
                                <div style={{ 
                                    position: "absolute", 
                                    top: "100%", 
                                    right: 0, 
                                    marginTop: 12, 
                                    background: "var(--bg-card)", 
                                    border: "1px solid var(--border)", 
                                    borderRadius: 16, 
                                    padding: "10px", 
                                    zIndex: 100, 
                                    boxShadow: "0 15px 45px rgba(0,0,0,0.5)", 
                                    minWidth: 240, 
                                    animation: "slideUp 0.2s ease",
                                    overflow: "hidden"
                                }}>
                                    <div style={{ padding: "8px 12px", fontSize: 10, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid var(--border)", marginBottom: 6 }}>Formatos Oficiales</div>
                                    <button className="nav-item" onClick={() => { handleExport606Txt(); setShowTxtMenu(false); }} style={{ width: "100%", justifyContent: "flex-start", padding: "12px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
                                        <Icon d={icons.file} size={16} style={{ marginRight: 10, color: "var(--accent)" }} /> TXT 606 (Compras)
                                    </button>
                                    <button className="nav-item" onClick={() => { handleExport607Txt(); setShowTxtMenu(false); }} style={{ width: "100%", justifyContent: "flex-start", padding: "12px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
                                        <Icon d={icons.file} size={16} style={{ marginRight: 10, color: "var(--success)" }} /> TXT 607 (Ventas)
                                    </button>
                                </div>
                            )}
                            <style>{`
                                @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                            `}</style>
                        </div>
                        
                        <button 
                            className="btn-secondary" 
                            style={{ height: 46, padding: "0 24px", display: "flex", alignItems: "center", gap: 10, justifyContent: "center", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }} 
                            onClick={() => exportTo607(invoices, selectedClient, month, year)}
                        >
                            <Icon d={icons.table} size={18} /> Oficial 607 (Excel)
                        </button>
                        
                        <button 
                            className="btn-primary" 
                            style={{ 
                                height: 46, padding: "0 28px", display: "flex", alignItems: "center", gap: 12, 
                                justifyContent: "center", fontSize: 14, fontWeight: 900, whiteSpace: "nowrap", 
                                boxShadow: "0 8px 20px rgba(59,130,246,0.3)",
                                background: "rgba(59,130,246,0.1)",
                                color: "var(--accent)",
                                border: "1px solid var(--accent-border)"
                            }} 
                            onClick={handleAuditExport}
                            disabled={isExportingAudit}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,0.2)"}
                            onMouseLeave={e => e.currentTarget.style.background = "rgba(59,130,246,0.1)"}
                        >
                            <Icon d={icons.zap} size={18} stroke="var(--accent)" />
                            {isExportingAudit ? "PROCESANDO..." : "AUDITORÍA IA"}
                        </button>

                        <button 
                            className="btn-primary" 
                            style={{ height: 46, padding: "0 28px", display: "flex", alignItems: "center", gap: 12, justifyContent: "center", fontSize: 14, fontWeight: 900, whiteSpace: "nowrap", boxShadow: "0 8px 20px rgba(59,130,246,0.3)" }} 
                            onClick={handleExportPDF}
                            disabled={isExporting}
                        >
                            {isExporting ? <Icon d={icons.zap} size={18} className="animate-spin" /> : <Icon d={icons.download} size={18} />}
                            {isExporting ? "PROCESANDO..." : "EXPORTAR PDF"}
                        </button>
                    </div>
                </div>
            </div>



            {/* Resumen KPI */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 24 }}>
                <div className="kpi-card">
                    <div style={{ color: "var(--success)", fontSize: 11, fontWeight: 800, marginBottom: 8 }}>INGRESOS (607)</div>
                    <div style={{ fontSize: 24, fontWeight: 900 }}>{formatCurrency(data.ventas.monto)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>ITBIS Cobrado: {formatCurrency(data.ventas.itbis)}</div>
                </div>
                <div className="kpi-card">
                    <div style={{ color: "var(--accent)", fontSize: 11, fontWeight: 800, marginBottom: 8 }}>GASTOS (606)</div>
                    <div style={{ fontSize: 24, fontWeight: 900 }}>{formatCurrency(data.compras.monto)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>ITBIS Adelantado: {formatCurrency(data.compras.itbis)}</div>
                </div>
                <div className="kpi-card" style={{ border: `1px solid ${itbisNeto > 0 ? "var(--danger)" : "var(--success)"}` }}>
                    <div style={{ color: itbisNeto > 0 ? "var(--danger)" : "var(--success)", fontSize: 11, fontWeight: 800, marginBottom: 8 }}>TRIBUTACIÓN NETA</div>
                    <div style={{ fontSize: 24, fontWeight: 900 }}>{formatCurrency(aPagarFinal)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{nuevoSaldoFavor > 0 ? `Nuevo Saldo a Favor: ${formatCurrency(nuevoSaldoFavor)}` : "Impuesto a pagar"}</div>
                </div>
            </div>

            {/* Banner de Proyección de Flujo (Nivel+) */}
            {data.proyeccion && (
                <div className="fade-in" style={{ 
                    background: "linear-gradient(90deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.02) 100%)", 
                    border: "1px solid rgba(59,130,246,0.2)", 
                    borderRadius: 20, 
                    padding: "24px 32px", 
                    marginBottom: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 32,
                    position: "relative",
                    overflow: "hidden"
                }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 10px var(--accent)", animation: "pulse 2s infinite" }}></div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "1px" }}>Proyección de Flujo Fiscal</span>
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                            A falta de <span style={{ color: "var(--accent)" }}>{data.proyeccion.diasRestantes} días</span> para el cierre, tu ITBIS proyectado es de <span style={{ fontWeight: 900 }}>{formatCurrency(data.proyeccion.itbisProyectado)}</span>
                        </h3>
                        <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                            * Basado en el promedio diario actual. Planifica tu liquidez para el pago total antes del <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>día 20 del próximo mes</span>.
                        </p>
                    </div>
                    
                    <div style={{ width: 240, textAlign: "right" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                            <span>Progreso del Mes</span>
                            <span>{Math.round(data.proyeccion.progresoMes)}%</span>
                        </div>
                        <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden" }}>
                            <div style={{ width: `${data.proyeccion.progresoMes}%`, height: "100%", background: "var(--accent)", boxShadow: "0 0 10px var(--accent)" }}></div>
                        </div>
                        <div style={{ fontSize: 10, marginTop: 8, color: "var(--accent)", fontWeight: 700 }}>
                            {data.proyeccion.diasParaEl20} DÍAS PARA EL PAGO
                        </div>
                    </div>

                    <style>{`
                        @keyframes pulse {
                            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
                            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
                            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
                        }
                    `}</style>
                </div>
            )}

            {/* Alerta de Riesgos Fiscales (Nivel+) */}
            {fiscalRisks.length > 0 && (
                <div className="fade-in no-print" style={{ 
                    background: "rgba(239,68,68,0.05)", 
                    border: "1px solid rgba(239,68,68,0.2)", 
                    borderRadius: 16, 
                    padding: "20px 24px", 
                    marginBottom: 32,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 32, height: 32, background: "rgba(239,68,68,0.1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Icon d={icons.alert} size={18} stroke="var(--danger)" />
                        </div>
                        <div>
                            <h4 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: "var(--danger)" }}>Detección de Riesgos Fiscales ({fiscalRisks.length})</h4>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>Se han detectado documentos que podrían ser rechazados por la DGII en este periodo.</p>
                        </div>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {fiscalRisks.slice(0, 3).map((inv, idx) => {
                            const validation = validateNCF(inv.ncf, inv.tipo_fiscal);
                            return (
                                <div key={idx} style={{ background: "var(--bg-surface)", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inv.emisor} <span style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 500 }}>({inv.ncf})</span></div>
                                        <div style={{ fontSize: 11, color: "var(--danger)", fontWeight: 600, marginTop: 2 }}>⚠ {validation.message}</div>
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: 12 }}>{formatCurrency(inv.monto_total)}</div>
                                </div>
                            );
                        })}
                        {fiscalRisks.length > 3 && (
                            <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", fontWeight: 700, paddingTop: 4 }}>
                                + {fiscalRisks.length - 3} documentos adicionales con riesgo
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Alerta de Facturas Extemporáneas (Nivel+) */}
            {extempRisks.length > 0 && (
                <div className="fade-in no-print" style={{ 
                    background: "rgba(245,158,11,0.05)", 
                    border: "1px solid rgba(245,158,11,0.2)", 
                    borderRadius: 16, 
                    padding: "20px 24px", 
                    marginBottom: 32,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 32, height: 32, background: "rgba(245,158,11,0.1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Icon d={icons.calendar} size={18} stroke="#f59e0b" />
                        </div>
                        <div>
                            <h4 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: "#f59e0b" }}>Facturas Extemporáneas Detectadas ({extempRisks.length})</h4>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>Tienes documentos de meses anteriores que no se incluirán en este IT-1.</p>
                        </div>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {extempRisks.slice(0, 3).map((inv, idx) => {
                            const [y, m] = inv.fecha.split("-");
                            return (
                                <div key={idx} style={{ background: "var(--bg-surface)", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inv.emisor} <span style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 500 }}>({inv.ncf})</span></div>
                                        <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, marginTop: 2 }}>⚠ Emitida en {m}/{y} - Puede requerir declaración rectificativa en la DGII.</div>
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: 12 }}>{formatCurrency(inv.monto_total)}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Formulario IT-1 Simulado */}
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 32 }}>
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                    <div style={{ background: "var(--bg-hover)", padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>DETALLE DE CASILLAS (SIMULACIÓN DGII)</div>
                        <div className="badge badge-info">Periodo {month}/{year}</div>
                    </div>
                    <div style={{ padding: "8px 0" }}>
                        {[
                            { box: "1", label: "Ingresos por operaciones", value: data.casillas.casilla1 },
                            { box: "10", label: "ITBIS cobrado por ventas", value: data.casillas.casilla10 },
                            { box: "15", label: "ITBIS pagado en compras locales", value: data.casillas.casilla15 },
                            { box: "21", label: "Saldo a Favor mes anterior (Manual)", isInput: true },
                            { box: "22", label: "Impuesto a pagar del mes", value: aPagarFinal, isResult: true },
                            { box: "23", label: "Nuevo saldo a favor", value: nuevoSaldoFavor, isResult: true },
                        ].map((item, idx) => (
                            <div key={idx} style={{ 
                                display: "flex", 
                                justifyContent: "space-between", 
                                alignItems: "center", 
                                padding: "14px 24px",
                                borderBottom: idx === 5 ? "none" : "1px solid var(--border)",
                                background: item.isResult ? "rgba(59,130,246,0.03)" : "transparent"
                            }}>
                                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                                    <div style={{ width: 28, height: 28, background: "var(--bg-hover)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "var(--text-muted)" }}>
                                        {item.box}
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: item.isResult ? 700 : 500, color: item.isResult ? "var(--text-primary)" : "var(--text-secondary)" }}>{item.label}</span>
                                </div>
                                {item.isInput ? (
                                    <div style={{ position: "relative" }}>
                                        <input 
                                            type="number" 
                                            className="input-field" 
                                            style={{ width: 120, textAlign: "right", paddingRight: 30, height: 32 }}
                                            value={saldoAnterior}
                                            onChange={(e) => setSaldoAnterior(parseFloat(e.target.value || 0))}
                                        />
                                        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "var(--text-muted)" }}>RD$</span>
                                    </div>
                                ) : (
                                    <div style={{ fontWeight: 800, fontSize: 14, color: item.isResult && item.value > 0 ? "var(--danger)" : "var(--text-primary)" }}>
                                        {formatCurrency(item.value)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div className="card" style={{ borderLeft: "4px solid var(--accent)" }}>
                        <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>CONSEJO FISCAL</h4>
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                            {aPagarFinal > 0 
                                ? `Este mes tienes un ITBIS por pagar de ${formatCurrency(aPagarFinal)}. Asegúrate de tener liquidez para el pago antes del día 20.`
                                : `Felicidades, tienes un saldo a favor de ${formatCurrency(nuevoSaldoFavor)}. Este monto será compensado en tu próxima declaración.`
                            }
                        </div>
                    </div>

                    <div className="card" style={{ background: "var(--accent-glow)" }}>
                        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                            <Icon d={icons.zap} size={20} stroke="var(--accent)" />
                            <h4 style={{ fontSize: 14, fontWeight: 800 }}>ESTADÍSTICAS DEL PERIODO</h4>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                <span>Facturas 606 (Gastos)</span>
                                <span style={{ fontWeight: 700 }}>{data.counts.compras}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                <span>Facturas 607 (Ventas)</span>
                                <span style={{ fontWeight: 700 }}>{data.counts.ventas}</span>
                            </div>
                            <div className="divider" style={{ margin: "8px 0" }} />
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                <span style={{ fontWeight: 700 }}>Total Documentos</span>
                                <span style={{ fontWeight: 800 }}>{data.counts.compras + data.counts.ventas}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pie de Página de Impresión (Solo Visible en PDF) */}
            <div className="print-only-show" style={{ marginTop: 64, paddingTop: 16, borderTop: "2px solid #000000", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ maxWidth: 600 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#000000", letterSpacing: "0.05em", marginBottom: 4 }}>
                        DOCUMENTO AUDITADO POR INTELIGENCIA ARTIFICIAL - FLUXIA
                    </div>
                    <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.4 }}>
                        * Esta simulación es preliminar y se generó basándose en los NCF procesados.
                        Verifique los datos antes de realizar su declaración oficial ante la DGII.
                    </div>
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a" }}>
                        Generado el {new Date().toLocaleDateString("es-DO")} a las {new Date().toLocaleTimeString("es-DO", { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.8 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#000000", textTransform: "uppercase" }}>Fluxia Intelligence</span>
                        <div style={{ width: 10, height: 10, background: "var(--gradient)", borderRadius: 3 }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
