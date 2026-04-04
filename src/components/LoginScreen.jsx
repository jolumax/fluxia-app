import React, { useState } from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";
import { supabase } from "../lib/supabase";

export function LoginScreen({ isResetting, onResetDone }) {
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [loading, setLoading] = useState(false);
    const [forgot, setForgot] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [showPassword, setShowPassword] = useState(false);

    const doLogin = async () => {
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) setError(error.message);
        setLoading(false);
    };

    const doRegister = async () => {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase.auth.signUp({ email, password: pass });
        if (error) {
            setError(error.message);
        } else if (data?.user && !data?.session) {
            setSuccessMessage("¡Cuenta creada! Revisa tu correo para confirmarla.");
            setIsRegister(false);
            setPass("");
        }
        setLoading(false);
    };

    const doReset = async () => {
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) setError(error.message);
        else setSuccessMessage("¡Enlace enviado! Revisa tu correo.");
        setLoading(false);
    };

    const doUpdatePassword = async () => {
        if (pass.length < 6) return setError("Mínimo 6 caracteres.");
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.updateUser({ password: pass });
        if (error) setError(error.message);
        else {
            alert("✅ ¡Contraseña actualizada!");
            if (onResetDone) onResetDone();
        }
        setLoading(false);
    };

    if (isResetting) {
        return (
            <div className="login-bg">
                <div className="login-card">
                    <h2 className="font-display" style={{ fontSize: 24, marginBottom: 8 }}>Nueva contraseña</h2>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>Ingresa tu nueva clave de acceso.</p>
                    {error && <div className="badge badge-danger" style={{ width: "100%", marginBottom: 16, padding: 10 }}>{error}</div>}
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>NUEVA CONTRASEÑA</label>
                        <div style={{ position: "relative" }}>
                            <input 
                                className="input-field" 
                                type={showPassword ? "text" : "password"} 
                                value={pass} 
                                onChange={e => setPass(e.target.value)} 
                                placeholder="••••••••" 
                                style={{ paddingRight: 44 }}
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", opacity: 0.7 }}
                            >
                                <Icon d={showPassword ? icons.eyeOff : icons.eye} size={18} />
                            </button>
                        </div>
                    </div>
                    <button className="btn-primary" onClick={doUpdatePassword} disabled={loading}>{loading ? "Actualizando..." : "Cambiar contraseña"}</button>
                </div>
            </div>
        );
    }

    if (forgot) {
        return (
            <div className="login-bg">
                <div className="login-card">
                    <h2 className="font-display" style={{ fontSize: 24, marginBottom: 8 }}>Recuperar cuenta</h2>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>Ingresa tu email para recibir un enlace de restauración.</p>
                    {error && <div className="badge badge-danger" style={{ width: "100%", marginBottom: 16, padding: 10 }}>{error}</div>}
                    {successMessage && <div className="badge badge-success" style={{ width: "100%", marginBottom: 16, padding: 10 }}>{successMessage}</div>}
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>EMAIL</label>
                        <input className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
                    </div>
                    <button className="btn-primary" onClick={doReset} disabled={loading}>{loading ? "Enviando..." : "Enviar enlace"}</button>
                    <button className="btn-ghost" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={() => setForgot(false)}>Volver al inicio</button>
                </div>
            </div>
        );
    }

    return (
        <div className="login-bg">
            <div className="login-card">
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
                    <div className="brain-pulse" style={{ 
                        width: 48, 
                        height: 48, 
                        background: "linear-gradient(135deg, #3b82f6, #6366f1)", 
                        borderRadius: 14, 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        boxShadow: "0 10px 30px rgba(59,130,246,0.3)",
                        overflow: "visible",
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
                    <div>
                        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, background: "linear-gradient(to right, #fff, #9ca3af)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Fluxia</h1>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Inteligencia Fiscal para Contadores</div>
                    </div>
                </div>

                <h2 className="font-display" style={{ fontSize: 20, marginBottom: 8 }}>{isRegister ? "Crear cuenta" : "Bienvenido de nuevo"}</h2>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>{isRegister ? "Únete a la nueva era de contabilidad inteligente." : "Ingresa tus credenciales para continuar."}</p>

                {error && <div className="badge badge-danger" style={{ width: "100%", marginBottom: 16, padding: 10 }}>{error}</div>}
                {successMessage && <div className="badge badge-success" style={{ width: "100%", marginBottom: 16, padding: 10 }}>{successMessage}</div>}

                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>EMAIL</label>
                    <input className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
                </div>
                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>CONTRASEÑA</label>
                        {!isRegister && <button className="btn-ghost" style={{ padding: 0, fontSize: 11, height: "auto" }} onClick={() => setForgot(true)}>¿Olvidaste tu contraseña?</button>}
                    </div>
                    <div style={{ position: "relative" }}>
                        <input 
                            className="input-field" 
                            type={showPassword ? "text" : "password"} 
                            value={pass} 
                            onChange={e => setPass(e.target.value)} 
                            placeholder="••••••••" 
                            style={{ paddingRight: 44 }}
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ 
                                position: "absolute", 
                                right: 12, 
                                top: "50%", 
                                transform: "translateY(-50%)", 
                                background: "none", 
                                border: "none", 
                                cursor: "pointer",
                                color: "var(--text-muted)",
                                display: "flex",
                                opacity: 0.7,
                                transition: "all 0.2s ease"
                            }}
                        >
                            <Icon d={showPassword ? icons.eyeOff : icons.eye} size={18} />
                        </button>
                    </div>
                </div>

                <button className="btn-primary" onClick={isRegister ? doRegister : doLogin} disabled={loading}>
                    {loading ? "Procesando..." : (isRegister ? "Registrarse →" : "Iniciar sesión →")}
                </button>

                <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--text-muted)" }}>
                    {isRegister ? "¿Ya tienes una cuenta?" : "¿No tienes cuenta?"}{" "}
                    <button className="btn-ghost" style={{ display: "inline", padding: 0, color: "var(--accent)", fontWeight: 700 }} onClick={() => setIsRegister(!isRegister)}>
                        {isRegister ? "Inicia sesión" : "Regístrate ahora"}
                    </button>
                </div>
            </div>
        </div>
    );
}
