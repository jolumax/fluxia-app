import { useState, useEffect } from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";

export const InstalliOSPrompt = () => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Evaluate if running on iOS (iPhone/iPad/iPod)
        const isIos = /ipad|iphone|ipod/i.test(navigator.userAgent) && !window.MSStream;
        // Evaluate if NOT already running in standalone PWA mode
        const isInStandaloneMode = ('standalone' in window.navigator) && window.navigator.standalone;

        if (isIos && !isInStandaloneMode) {
            const hasSeen = localStorage.getItem("fluxia-ios-install-prompt");
            if (!hasSeen) {
                // Delay prompt by 2.5 seconds to avoid immediately annoying the user during load
                setTimeout(() => setShow(true), 2500);
            }
        }
    }, []);

    if (!show) return null;

    return (
        <div className="fade-in" style={{
            position: "fixed", bottom: 20, left: 16, right: 16,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 16, padding: "20px", zIndex: 99999,
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)", 
            display: "flex", flexDirection: "column", gap: 12,
            animation: "slide-up 0.4s ease"
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src="/icon-512.png" alt="Fluxia" style={{ width: 48, height: 48, borderRadius: 12, boxShadow: "0 4px 10px rgba(0,0,0,0.2)" }} />
                    <div>
                        <h4 style={{ margin: 0, fontSize: 16, color: "var(--text-primary)", fontWeight: 800 }}>Instalar Fluxia</h4>
                        <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>Agrega la app a tu inicio</p>
                    </div>
                </div>
                <button 
                    onClick={() => { 
                        localStorage.setItem("fluxia-ios-install-prompt", "true"); 
                        setShow(false); 
                    }} 
                    style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 24, cursor: "pointer", padding: "0 8px" }}
                >
                    &times;
                </button>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginTop: 8 }}>
                Safari no instala apps automáticamente. Toca el ícono de <b style={{color:"var(--accent)"}}>Compartir</b> <Icon d={icons.upload} size={14} style={{ display: "inline-block", verticalAlign: "middle" }}/> en la barra inferior y luego selecciona <b>"Agregar a Inicio"</b>.
            </div>
            <button 
                 onClick={() => { 
                    localStorage.setItem("fluxia-ios-install-prompt", "true"); 
                    setShow(false); 
                }} 
                className="btn-primary" style={{ width: "100%", padding: "12px", marginTop: 8 }}
            >
                Entendido
            </button>
        </div>
    );
};
