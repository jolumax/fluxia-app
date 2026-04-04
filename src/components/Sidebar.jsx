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
        { id: "reportes", label: "Reportería", icon: icons.bell },
        { id: "desgloses", label: "Desgloses", icon: icons.file },
        { id: "it1", label: "Cerebro Fiscal", icon: icons.zap }
    ];

    const bottomItems = [
        { id: "configuracion", label: "Configuración", icon: icons.settings }
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && <div className="modal-overlay" style={{ zIndex: 1500 }} onClick={onClose} />}
            
            <nav className={`sidebar ${isOpen ? "mobile-open" : ""}`}>
                <div className="sidebar-logo" style={{ 
                    padding: "24px 20px", 
                    marginBottom: 10,
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    borderBottom: "1px solid var(--border-light)"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {/* Premium Icon Container with Zap-style Effect */}
                        <div className="brain-pulse" style={{ 
                            width: 38, 
                            height: 38, 
                            background: "linear-gradient(135deg, #3b82f6, #6366f1)", 
                            borderRadius: 12, 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            boxShadow: "0 8px 20px rgba(59,130,246,0.25)",
                            overflow: "hidden",
                            position: "relative",
                            border: "1px solid rgba(255,255,255,0.1)"
                        }}>
                             <img src="/icon-512.png" alt="Fluxia" style={{ 
                                width: "100%", 
                                height: "100%", 
                                objectFit: "contain",
                                padding: 2,
                                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                            }} />
                        </div>
                        
                        {/* Premium Brand Text */}
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span className="font-display" style={{ 
                                    fontSize: 19, 
                                    fontWeight: 900, 
                                    letterSpacing: "-0.03em",
                                    color: "var(--text-primary)",
                                    lineHeight: 1
                                }}>FLUXIA</span>
                                <div style={{ 
                                    fontSize: 8, 
                                    background: "var(--gradient)", 
                                    color: "white", 
                                    padding: "2px 5px", 
                                    borderRadius: 4, 
                                    fontWeight: 900,
                                    letterSpacing: "0.05em"
                                }}>PRO</div>
                            </div>
                            <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>Fiscal Intelligence</span>
                        </div>
                    </div>
                    {/* Close Button Mobile */}
                    <button 
                        className="btn-ghost mobile-only-flex" 
                        onClick={(e) => { e.stopPropagation(); onClose(); }} 
                        style={{ padding: 10, color: "var(--text-primary)", cursor: "pointer", alignItems: "center", justifyContent: "center", pointerEvents: "auto", zIndex: 100 }}
                    >
                        <Icon d={icons.x} size={32} stroke="#ffffff" />
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
