import React, { useState } from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";

export function Topbar({ page, userEmail, invoices, onSearch, clients, selectedClient, setSelectedClient, onMenuClick }) {
    const initials = userEmail ? userEmail.substring(0, 2).toUpperCase() : "FL";
    const titles = { 
        dashboard: "Dashboard", 
        procesar: "Procesar Archivos", 
        clientes: "Gestión de Clientes",
        estadisticas: "Estadísticas", 
        drive: "Google Drive", 
        sheets: "Google Sheets", 
        configuracion: "Configuración",
        reportes: "Reportería"
    };
    const [showNotif, setShowNotif] = useState(false);
    const now = new Date();
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const fechaHoy = `${dias[now.getDay()]}, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;

    return (
        <div className="topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Mobile Menu Toggle */}
                <button className="btn-ghost mobile-only-flex" onClick={onMenuClick} style={{ padding: 6, marginLeft: -6 }}>
                    <Icon d="M3 12h18M3 6h18M3 18h18" size={20} />
                </button>
                {/* Page Title */}
                <h1 className="font-display" style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                    {titles[page] || "Fluxia"}
                </h1>
                {/* Separator */}
                <div style={{ width: 1, height: 22, background: "var(--border)", flexShrink: 0 }} />
                {/* Date chip */}
                <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "var(--bg-hover)",
                    border: "1px solid var(--border)",
                    borderRadius: 20,
                    padding: "4px 12px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                }}>
                    <Icon d={icons.calendar} size={12} stroke="var(--accent)" />
                    <span style={{ fontSize: 11.5, color: "var(--text-secondary)", fontWeight: 600, letterSpacing: 0.2 }}>{fechaHoy}</span>
                </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ position: "relative", minWidth: 220 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4, letterSpacing: 0.5 }}>CLIENTE / EMPRESA ACTIVA</div>
                    <div style={{ position: "relative" }}>
                        <select
                            className="input-field"
                            style={{ padding: "6px 34px 6px 12px", fontSize: 12, height: 36, background: "var(--bg-card)", borderColor: selectedClient ? "var(--accent)" : "var(--border)" }}
                            value={selectedClient?.id || ""}
                            onChange={(e) => {
                                const client = clients.find(c => c.id === e.target.value);
                                setSelectedClient(client || null);
                            }}
                        >
                            <option value="">(Tú) {userEmail?.split("@")[0]}</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre} ({c.rnc})</option>
                            ))}
                        </select>
                        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-muted)" }}>
                            <Icon d={icons.chevron_down} size={12} />
                        </div>
                    </div>
                </div>

                <div style={{ width: 1, height: 30, background: "var(--border)", margin: "0 4px" }} />

                <div style={{ position: "relative", display: "flex" }}>
                    <input className="input-field" placeholder="Buscar facturas, NCF..." style={{ width: 220, padding: "8px 14px 8px 34px", fontSize: 12 }}
                        onChange={e => onSearch && onSearch(e.target.value)} />
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}><Icon d={icons.search} size={14} /></span>
                </div>
                <div style={{ position: "relative" }}>
                    <button className="btn-ghost" style={{ position: "relative", padding: 8 }} onClick={() => setShowNotif(p => !p)}>
                        <Icon d={icons.bell} size={18} />
                        {(invoices || []).length > 0 && <span className="notif-dot" />}
                    </button>
                    {showNotif && (
                        <div style={{ position: "absolute", right: 0, top: 40, width: 280, background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 12, padding: 14, zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>Notificaciones</div>
                                <button className="btn-ghost" style={{ padding: 4, borderRadius: "50%" }} onClick={() => setShowNotif(false)}>
                                    <Icon d={icons.x} size={14} />
                                </button>
                            </div>
                            {(invoices || []).length === 0 ? (
                                <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "10px 0" }}>Sin notificaciones nuevas</div>
                            ) : (invoices || []).slice(0, 3).map((inv, i) => (
                                <div key={i} style={{ padding: "8px 10px", borderRadius: 8, background: "var(--bg-surface)", marginBottom: 6, fontSize: 12 }}>
                                    <div style={{ fontWeight: 600, color: inv.estado === "error" ? "var(--danger)" : "var(--success)" }}>
                                        {inv.estado === "error" ? "⚠ NCF Inválido" : "✓ Procesado"}
                                    </div>
                                    <div style={{ color: "var(--text-muted)" }}>{inv.emisor} · {inv.fecha}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="avatar" title={userEmail}>{initials}</div>
            </div>
        </div>
    );
}
