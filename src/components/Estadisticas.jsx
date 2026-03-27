import React, { useMemo } from "react";
import { Icon } from "./common/Icon";

export function Estadisticas({ invoices }) {
    const invData = invoices || [];
    const validas = invData.filter(i => i.estado === "valido").length;
    const conError = invData.filter(i => i.estado === "error").length;
    const duplicadas = invData.filter(i => i.estado === "duplicado").length;
    
    // Agrupar por mes
    const chartData = useMemo(() => {
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const now = new Date();
        const year = now.getFullYear();
        
        return months.map((m, i) => {
            const monthFiltered = invData.filter(inv => {
                const d = new Date(inv.fecha);
                return d.getMonth() === i && d.getFullYear() === year;
            });
            const total = monthFiltered.reduce((acc, curr) => acc + (curr.monto_total || 0), 0);
            return { month: m, total };
        });
    }, [invData]);

    const maxVal = Math.max(...chartData.map(d => d.total), 1);

    return (
        <div className="page-content fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Tendencia de Gastos ({new Date().getFullYear()})</h3>
                    <div style={{ display: "flex", alignItems: "flex-end", height: 260, gap: 14, paddingTop: 20 }}>
                        {chartData.map((d, i) => (
                            <div key={i} className="chart-bar" title={`${d.month}: RD$${d.total.toLocaleString()}`}>
                                <div className="fill" style={{ height: `${(d.total / maxVal) * 100}%` }} />
                                <div style={{ position: "absolute", bottom: -24, left: "50%", transform: "translateX(-50%)", fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>{d.month}</div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Distribución de Estados</h3>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                        <div className="donut-ring">
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
                                <div style={{ fontSize: 24, fontWeight: 800 }}>{invData.length}</div>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>TOTAL</div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {[
                            { l: "NCF Válidos", v: validas, c: "var(--success)" },
                            { l: "NCF Erróneos", v: conError, c: "var(--danger)" },
                            { l: "Duplicados", v: duplicadas, c: "var(--text-muted)" }
                        ].map(item => (
                            <div key={item.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "var(--bg-surface)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.c }} />
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{item.l}</span>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700 }}>{item.v}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
