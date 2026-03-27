import React from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";

export function Sidebar({ active, setActive, onLogout, userEmail, credits, isOpen, onClose }) {
    const navItems = [
        { id: "dashboard", label: "Dashboard", icon: icons.dashboard },
        { id: "procesar", label: "Procesar", icon: icons.upload },
        { id: "clientes", label: "Clientes", icon: icons.user },
        { id: "estadisticas", label: "Estadísticas", icon: icons.chart },
    ];

    const sourceItems = [
        { id: "drive", label: "Google Drive", icon: icons.drive },
        { id: "sheets", label: "Google Sheets", icon: icons.sheet },
        { id: "reportes", label: "Reportería", icon: icons.bell }
    ];

    const bottomItems = [
        { id: "configuracion", label: "Configuración", icon: icons.settings }
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && <div className="modal-overlay" style={{ zIndex: 1999 }} onClick={onClose} />}
            
            <nav className={`sidebar ${isOpen ? "mobile-open" : ""}`}>
                <div className="sidebar-logo" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, background: "var(--gradient)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Icon d={icons.layers} size={17} stroke="white" />
                        </div>
                        <span className="font-display gradient-text" style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>Fluxia</span>
                    </div>
                    {/* Close Button Mobile */}
                    <button className="btn-ghost mobile-only" onClick={onClose} style={{ padding: 6, display: "none" }}>
                        <Icon d={icons.x} size={20} />
                    </button>
                </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                <div className="nav-section-label">Principal</div>
                {navItems.map(item => (
                    <div key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}>
                        <Icon d={item.icon} size={16} />
                        {item.label}
                    </div>
                ))}
                <div className="nav-section-label" style={{ marginTop: 8 }}>Fuentes</div>
                {sourceItems.map(item => (
                    <div key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}>
                        <Icon d={item.icon} size={16} />
                        {item.label}
                    </div>
                ))}
                <div className="nav-section-label" style={{ marginTop: 8 }}>Sistema</div>
                {bottomItems.map(item => (
                    <div key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}>
                        <Icon d={item.icon} size={16} />
                        {item.label}
                    </div>
                ))}
            </div>

            <div style={{ padding: "16px", borderTop: "1px solid var(--border)" }}>
                <div style={{ background: "var(--bg-hover)", borderRadius: 10, padding: "12px", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>CRÉDITOS DE PROCESAMIENTO</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                            {credits ? `${credits.creditos_usados} / ${credits.creditos_limite === -1 ? "∞" : credits.creditos_limite}` : "— / —"}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--accent)", textTransform: "capitalize" }}>
                            {credits ? `Plan ${credits.plan}` : "Cargando..."}
                        </span>
                    </div>
                    <div className="credits-bar">
                        <div className="credits-fill" style={{
                            width: credits && credits.creditos_limite > 0
                                ? `${Math.min((credits.creditos_usados / credits.creditos_limite) * 100, 100)}%`
                                : "0%"
                        }} />
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="avatar">{userEmail ? userEmail.substring(0, 2).toUpperCase() : "FL"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userEmail ? userEmail.split("@")[0] : "Usuario"}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userEmail ?? ""}</div>
                    </div>
                    <button className="btn-ghost" style={{ padding: 6 }} title="Cerrar sesión" onClick={onLogout}>
                        <Icon d={icons.logout} size={15} />
                    </button>
                </div>
            </div>
        </nav>
        </>
    );
}
