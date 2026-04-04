import React, { useMemo } from "react";
import { Icon } from "./common/Icon";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

export function Estadisticas({ invoices }) {
    const invData = useMemo(() => invoices || [], [invoices]);
    const validas = invData.filter(i => i.estado === "valido").length;
    const conError = invData.filter(i => i.estado === "error").length;
    const duplicadas = invData.filter(i => i.estado === "duplicado").length;
    
    // Agrupar por mes (Solo GASTOS 606)
    const chartData = useMemo(() => {
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const now = new Date();
        const year = now.getFullYear();
        
        const gastosData = invData.filter(i => i.tipo_fiscal === "606");
        
        return months.map((m, i) => {
            const monthFiltered = gastosData.filter(inv => {
                const d = new Date(inv.fecha);
                return d.getMonth() === i && d.getFullYear() === year;
            });
            const total = monthFiltered.reduce((acc, curr) => acc + (curr.monto_total || 0), 0);
            return { name: m, total };
        });
    }, [invData]);

    const topProveedores = useMemo(() => {
        const counts = {};
        invData.filter(i => i.tipo_fiscal === "606").forEach(inv => {
            counts[inv.emisor] = (counts[inv.emisor] || 0) + (inv.monto_total || 0);
        });
        return Object.entries(counts)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [invData]);


    return (
        <div className="page-content fade-in">
            <div className="grid-responsive" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 28, display: "flex", alignItems: "center", gap: 10 }}>
                        Tendencia de Gastos Mensuales ({new Date().getFullYear()})
                    </h3>
                    <div style={{ width: "100%", height: 320 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-secondary)", fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={v => `RD$ ${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                                <Tooltip 
                                    cursor={{ fill: "var(--bg-hover)" }}
                                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                                    formatter={v => [`RD$ ${v.toLocaleString()}`, "Monto"]}
                                />
                                <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={28}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.total > 0 ? "var(--accent)" : "var(--border-light)"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Top 5 Proveedores</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {topProveedores.length === 0 ? (
                                <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: "20px 0" }}>No hay datos suficientes</div>
                            ) : topProveedores.map((p, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--bg-surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{i+1}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{p.name}</span>
                                            <span style={{ fontSize: 12, fontWeight: 700 }}>RD$ {p.total.toLocaleString()}</span>
                                        </div>
                                        <div style={{ height: 6, background: "var(--bg-surface)", borderRadius: 10, overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${(p.total / topProveedores[0].total) * 100}%`, background: "var(--gradient)", borderRadius: 10 }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Distribución de Estados</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {[
                                { l: "NCF Válidos", v: validas, c: "var(--success)" },
                                { l: "NCF Erróneos", v: conError, c: "var(--danger)" },
                                { l: "Duplicados", v: duplicadas, c: "var(--text-muted)" }
                            ].map(item => (
                                <div key={item.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
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
        </div>
    );
}
