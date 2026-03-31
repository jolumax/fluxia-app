import React, { useState } from "react";
import * as XLSX from "xlsx-js-style";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";

export function DesglosesView({ invoices, loading, credits }) {
    const [searchTerm, setSearchTerm] = useState("");

    // Plan gate: Solo Pro y Premium
    const plan = credits?.plan?.toLowerCase() ?? "basic";
    const hasAccess = plan === "pro" || plan === "premium";

    if (loading) {
        return (
            <div className="page-content fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <div className="spinner" style={{ marginBottom: 16 }}></div>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Cargando datos de desgloses...</p>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="page-content fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", textAlign: "center", gap: 24 }}>
                <div style={{
                    background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))",
                    border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: 24,
                    padding: "48px 40px",
                    maxWidth: 480,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 20,
                    boxShadow: "0 20px 60px rgba(99,102,241,0.12)"
                }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: "50%",
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 32, boxShadow: "0 8px 24px rgba(99,102,241,0.4)"
                    }}>
                        🔒
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
                            Desgloses de Factura
                        </h2>
                        <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
                            El desglose línea por línea con extracción de artículos por IA está disponible exclusivamente en los planes <strong style={{ color: "#8b5cf6" }}>Pro</strong> y <strong style={{ color: "#6366f1" }}>Premium</strong>.
                        </p>
                    </div>
                    <div style={{
                        background: "rgba(99,102,241,0.1)", borderRadius: 12,
                        padding: "12px 20px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7
                    }}>
                        ✅ Extracción de artículos con GPT-4o<br/>
                        ✅ Exportación Excel línea por línea<br/>
                        ✅ SKU, cantidades y precios exactos
                    </div>
                    <a
                        href="https://whop.com/checkout/plan_ldaj8xJ6vh51X"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 8,
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            color: "white", padding: "12px 28px", borderRadius: 12,
                            fontWeight: 700, fontSize: 14, textDecoration: "none",
                            boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
                            transition: "transform 0.2s, box-shadow 0.2s"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(99,102,241,0.5)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 16px rgba(99,102,241,0.4)"; }}
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

    const validInvoices = (invoices || []).filter(inv => inv && inv.estado !== "duplicado");
    
    const filteredInvoices = validInvoices.filter(inv => {
        const text = `${inv?.ncf || ""} ${inv?.emisor || ""} ${inv?.rnc || ""}`.toLowerCase();
        return text.includes(searchTerm.toLowerCase());
    });

    const handleExportExcel = (invoice) => {
        // Prepare line items
        let items = invoice.detalle_articulos || [];
        
        // Fallback for old invoices that don't have detail yet
        if (items.length === 0) {
            const neto = (invoice.monto_total || 0) - (invoice.itbis_total || 0);
            items = [{
                sku: "",
                descripcion: invoice.concepto && invoice.concepto !== "—" ? invoice.concepto : "Servicios/Bienes Generales (Histórico sin detalle)",
                unidad_medida: "UN",
                cantidad: 1,
                precio_unitario: neto,
                valor_con_impuestos: invoice.itbis_total || 0,
                valor_neto: neto,
                valor_total: invoice.monto_total || 0
            }];
        }

        // Object containing styling rules
        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4B6955" } }, // Dark green from screenshot
            alignment: { vertical: "center", horizontal: "center" }
        };

        const standardCell = {
            alignment: { vertical: "center", horizontal: "left" }
        };

        const numCell = {
            alignment: { vertical: "center", horizontal: "right" },
            z: '"RD$"#,##0.00'
        };

        // Create data rows mapped exactly to screenshot headings
        const excelData = items.map(it => {
            return {
                "Producto/SKU": { v: it.sku || "", s: standardCell },
                "Descripción": { v: it.descripcion || "Desconocido", s: standardCell },
                "Unidad de Medida": { v: it.unidad_medida || "UN", s: { alignment: { horizontal: "center" } } },
                "Cantidad": { v: it.cantidad || 1, s: { alignment: { horizontal: "center" } } },
                "Precio unitario": { t: 'n', v: it.precio_unitario || 0, s: numCell },
                "Valor con impuestos": { t: 'n', v: it.valor_con_impuestos || 0, s: numCell },
                "Valor neto": { t: 'n', v: it.valor_neto || 0, s: numCell },
                "Valor Total": { t: 'n', v: it.valor_total || 0, s: numCell } // Matches the requested fields in N8N
            };
        });

        // Generate worksheet
        // Because we provided custom cell structures rather than just flat objects, we need to map carefully 
        // Or we can just build array of arrays
        
        const headerNames = ["Producto/SKU", "Descripción", "Unidad de Medida", "Cantidad", "Precio unitario", "Valor con impuestos", "Valor neto", "Valor Total"];
        
        let wsData = [
            headerNames.map(h => ({ v: h, s: headerStyle }))
        ];

        excelData.forEach(row => {
            wsData.push([
                row["Producto/SKU"],
                row["Descripción"],
                row["Unidad de Medida"],
                row["Cantidad"],
                row["Precio unitario"],
                row["Valor con impuestos"],
                row["Valor neto"],
                row["Valor Total"]
            ]);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Define column widths matching the visual aesthetics
        ws['!cols'] = [
            { wch: 15 }, // SKU
            { wch: 45 }, // Descripcion
            { wch: 15 }, // Unidad
            { wch: 10 }, // Cantidad
            { wch: 18 }, // Precio Unitario
            { wch: 20 }, // Impuestos
            { wch: 18 }, // Neto
            { wch: 18 }, // Total
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Desglose");
        
        const safeName = (invoice.ncf || "Factura").replace(/[^a-zA-Z0-9]/g, "");
        XLSX.writeFile(wb, `Desglose_${safeName}.xlsx`);
    };

    return (
        <div className="page-content fade-in">
            <div className="card" style={{ padding: "32px", marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>Desgloses de Factura</h2>
                        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Descarga el detalle real línea por línea extraído con Inteligencia Artificial.</p>
                    </div>

                    <div className="search-bar" style={{ minWidth: 300, background: "var(--bg-input)", border: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "10px 16px", borderRadius: "12px", gap: 8 }}>
                        <Icon d={icons.search} size={18} stroke="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder="Buscar por NCF, emisor o RNC..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: "100%", outline: "none", background: "transparent", border: "none", color: "var(--text-primary)", fontSize: 14 }}
                        />
                    </div>
                </div>

                {filteredInvoices.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)" }}>
                        <Icon d={icons.document} size={48} stroke="var(--border)" />
                        <p style={{ marginTop: 16, fontSize: 15 }}>No hay facturas procesadas para explorar.</p>
                    </div>
                ) : (
                    <div className="table-container fade-in" style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: "left", padding: "16px", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, borderBottom: "1px solid var(--border)" }}>EMISOR / PROVEEDOR</th>
                                    <th style={{ textAlign: "left", padding: "16px", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, borderBottom: "1px solid var(--border)" }}>NCF</th>
                                    <th style={{ textAlign: "left", padding: "16px", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, borderBottom: "1px solid var(--border)" }}>FECHA</th>
                                    <th style={{ textAlign: "right", padding: "16px", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, borderBottom: "1px solid var(--border)" }}>TOTAL</th>
                                    <th style={{ textAlign: "center", padding: "16px", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, borderBottom: "1px solid var(--border)" }}>ACCIÓN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map((inv) => (
                                    <tr key={inv.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td style={{ padding: "16px" }}>
                                            <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>{inv.emisor}</div>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>RNC: {inv.rnc}</div>
                                        </td>
                                        <td style={{ padding: "16px", fontSize: 14, fontFamily: "monospace", color: "var(--text-primary)", fontWeight: 500 }}>
                                            {inv.ncf}
                                        </td>
                                        <td style={{ padding: "16px", fontSize: 14, color: "var(--text-primary)" }}>
                                            {inv.fecha}
                                        </td>
                                        <td style={{ padding: "16px", fontSize: 14, color: "var(--text-primary)", fontWeight: 600, textAlign: "right" }}>
                                            {inv.monto}
                                        </td>
                                        <td style={{ padding: "16px", textAlign: "center" }}>
                                            <button 
                                                onClick={() => handleExportExcel(inv)}
                                                className="btn-primary" 
                                                style={{ 
                                                    padding: "8px 16px", 
                                                    fontSize: 13, 
                                                    display: "inline-flex", 
                                                    alignItems: "center", 
                                                    gap: 8,
                                                    background: "var(--success)", 
                                                    color: "white",
                                                    margin: "0 auto"
                                                }}
                                            >
                                                <Icon d={icons.download} size={16} stroke="currentColor" />
                                                Descargar Excel
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
