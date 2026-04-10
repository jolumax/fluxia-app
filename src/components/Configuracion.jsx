import React, { useState } from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";
import { PLAN_INFO, WHOP_CHECKOUTS } from "../lib/constants";
import { supabase } from "../lib/supabase";
import { sanitizeRNC, sanitizeDriveId, sanitizeTelegramId, trim } from "../utils/sanitize";

export function Configuracion({ userId, userEmail, credits, reloadCredits }) {
    const [tab, setTab] = useState("cuenta");
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState({ rnc: credits?.rnc || "", drive_folder_id: credits?.folder_drive_id || "" });
    const [notifData, setNotifData] = useState({ telegram_chat_id: credits?.telegram_chat_id || "", notif_canal: credits?.notif_canal || "telegram" });
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSaveProfile = async () => {
        const cleanRNC = sanitizeRNC(profileData.rnc);
        const cleanDrive = sanitizeDriveId(profileData.drive_folder_id);
        setLoading(true);
        try {
            const { error: err1 } = await supabase.from("usuarios").update({ rnc_empresa: cleanRNC }).eq("id", userId);
            if (err1) throw err1;
            const { error: err2 } = await supabase.from("config_clientes").update({ folder_drive_id: cleanDrive }).eq("user_id", userId);
            if (err2) throw err2;
            alert("✅ Perfil actualizado.");
            reloadCredits();
        } catch (err) { alert("❌ Error: " + err.message); }
        finally { setLoading(false); }
    };

    const handleSaveNotif = async () => {
        const cleanTelegram = sanitizeTelegramId(notifData.telegram_chat_id);
        setLoading(true);
        try {
            const { error } = await supabase.from("config_clientes").update({ telegram_chat_id: cleanTelegram || null, notif_canal: notifData.notif_canal }).eq("user_id", userId);
            if (error) throw error;
            alert("✅ Notificaciones guardadas.");
        } catch (err) { alert("❌ Error: " + err.message); }
        finally { setLoading(false); }
    };


    const handleUpdatePassword = async () => {
        const cleanPwd = trim(newPassword);
        if (!cleanPwd) return alert("⚠️ Ingresa una nueva contraseña.");
        if (cleanPwd.length < 6) return alert("⚠️ La contraseña debe tener al menos 6 caracteres.");
        if (cleanPwd.length > 72) return alert("⚠️ La contraseña no puede superar 72 caracteres.");

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: cleanPwd });
            if (error) throw error;
            alert("✅ Contraseña actualizada correctamente.");
            setNewPassword("");
        } catch (err) {
            alert("❌ Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const AlertaToggle = ({ label }) => (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
            <span style={{ fontSize: 13 }}>{label}</span>
            <button className="toggle on" />
        </div>
    );

    return (
        <div className="page-content fade-in">
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <div className="tabs">
                    {[["cuenta", "👤 Cuenta"], ["notif", "🔔 Notificaciones"]].map(([id, label]) => (
                        <button key={id} className={`tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
                    ))}
                </div>
            </div>

            {tab === "cuenta" && (
                <div style={{ maxWidth: 500 }}>
                    <div className="card" style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                            <div className="avatar" style={{ width: 56, height: 56, fontSize: 20 }}>{userEmail ? userEmail.substring(0, 2).toUpperCase() : "FL"}</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{userEmail ? userEmail.split("@")[0] : "Usuario"}</div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{userEmail ?? ""}</div>
                                <span className="badge badge-info" style={{ fontSize: 10, marginTop: 4 }}>Plan {credits?.plan ?? "—"}</span>
                            </div>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 700 }}>EMAIL</label>
                            <input className="input-field" value={userEmail ?? ""} disabled style={{ fontSize: 13, opacity: 0.7 }} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 700 }}>RNC EMPRESA</label>
                            <input className="input-field" value={profileData.rnc} onChange={e => setProfileData({ ...profileData, rnc: e.target.value })} placeholder="101863567" style={{ fontSize: 13 }} />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 700 }}>ID CARPETA GOOGLE DRIVE (RAÍZ)</label>
                            <input className="input-field" value={profileData.drive_folder_id} onChange={e => setProfileData({ ...profileData, drive_folder_id: e.target.value })} placeholder="Ej: 1PgkAJbmqk..." style={{ fontSize: 13 }} disabled={credits?.plan === 'basic'} />
                            <div style={{ fontSize: 10, color: credits?.plan === 'basic' ? 'var(--warning)' : 'var(--text-muted)', marginTop: 4 }}>
                                {credits?.plan === 'basic' ? "⚡ Solo disponible en Pro o Premium." : "Aquí se crearán las carpetas de tus clientes automáticamente"}
                            </div>
                        </div>
                        <button className="btn-primary" onClick={handleSaveProfile} disabled={loading} style={{ width: '100%', marginBottom: 20 }}>{loading ? "Guardando..." : "Actualizar perfil"}</button>

                        <div className="divider" style={{ margin: '20px 0' }} />

                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Plan y Suscripción</div>
                        <div className="grid-responsive" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                            {Object.entries(PLAN_INFO).map(([key, info]) => {
                                const isCurrent = credits?.plan === key;
                                return (
                                    <div key={key} style={{
                                        padding: "14px 12px",
                                        borderRadius: 12,
                                        border: `2px solid ${isCurrent ? "var(--accent)" : "var(--border)"}`,
                                        background: isCurrent ? "var(--bg-hover)" : "var(--bg-surface)",
                                        display: "flex", flexDirection: "column", gap: 6, position: "relative"
                                    }}>
                                        {isCurrent && <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", background: "var(--accent)", color: "white", fontSize: 8, fontWeight: 900, padding: "2px 8px", borderRadius: 20, letterSpacing: 0.5, whiteSpace: "nowrap" }}>PLAN ACTUAL</div>}
                                        <div style={{ fontWeight: 800, fontSize: 11, color: isCurrent ? "var(--accent)" : "var(--text-muted)", textTransform: "uppercase" }}>{info.nombre}</div>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>{info.precio}<span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)" }}>/mes</span></div>
                                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{info.descripcion}</div>
                                        {!isCurrent && (
                                            <a
                                                href={`${WHOP_CHECKOUTS[key]}?redirect_url=${encodeURIComponent(`${window.location.origin}/?plan=${key}&id=${userId}`)}`}
                                                target="_blank" rel="noreferrer"
                                                style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: "var(--accent)", textDecoration: "none", border: "1px solid var(--accent)", borderRadius: 6, padding: "4px 8px", textAlign: "center" }}>
                                                Cambiar →
                                            </a>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="divider" style={{ margin: '20px 0' }} />

                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Seguridad</div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 700 }}>NUEVA CONTRASEÑA</label>
                            <div style={{ display: "flex", gap: 6 }}>
                                <input
                                    className="input-field"
                                    style={{ flex: 1, fontSize: 13 }}
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                                <button className="btn-ghost" style={{ padding: "8px 10px" }} onClick={() => setShowPassword(p => !p)}>
                                    <Icon d={showPassword ? icons.eyeOff : icons.eye} size={14} />
                                </button>
                            </div>
                        </div>
                        <button className="btn-primary" onClick={handleUpdatePassword} disabled={loading} style={{ width: '100%' }}>
                            {loading ? "Actualizando..." : "Cambiar contraseña"}
                        </button>

                        <div className="divider" style={{ margin: '32px 0 20px' }} />

                        {/* Zona de Peligro */}
                        <div style={{ 
                            padding: "20px", 
                            borderRadius: 12, 
                            border: "1px solid rgba(239,68,68,0.2)", 
                            background: "rgba(239,68,68,0.02)" 
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                                <Icon d={icons.alert} size={18} stroke="var(--danger)" />
                                <div style={{ fontWeight: 800, fontSize: 14, color: "var(--danger)", letterSpacing: 0.5 }}>ZONA DE PELIGRO</div>
                            </div>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
                                Las siguientes acciones son irreversibles. Por favor, procede con cautela.
                            </p>
                            
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Limpiar todos mis datos</div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Elimina permanentemente todas tus facturas y registros.</div>
                                </div>
                                <button 
                                    className="btn-ghost" 
                                    style={{ color: "var(--danger)", border: "1px solid var(--danger)", padding: "8px 16px", fontSize: 11, fontWeight: 700 }}
                                    onClick={() => {
                                        const confirm = window.confirm("⚠️ ¿ESTÁS TOTALMENTE SEGURO? Esta acción borrará todas tus facturas de forma permanente y no se puede deshacer.");
                                        if (confirm) {
                                            alert("Esta función requiere borrar registros en Airtable. Por seguridad, contacta a soporte para limpiezas masivas o elimina las facturas individualmente desde el Dashboard.");
                                        }
                                    }}
                                >
                                    Limpiar Datos
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {tab === "notif" && (
                <div style={{ maxWidth: 560 }}>
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Canales de Notificación</div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 700 }}>CANAL ACTIVO</label>
                            <select className="input-field" style={{ fontSize: 13 }} value={notifData.notif_canal} onChange={e => setNotifData({ ...notifData, notif_canal: e.target.value })}>
                                <option value="telegram">📱 Telegram</option>
                                <option value="email">✉️ Email</option>
                                <option value="none">🔕 Sin notificaciones</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 700 }}>TELEGRAM CHAT ID</label>
                            <input className="input-field" placeholder="Ej: 7192815138" value={notifData.telegram_chat_id} onChange={e => setNotifData({ ...notifData, telegram_chat_id: e.target.value })} style={{ fontSize: 13 }} />
                        </div>
                        <div className="divider" />
                        {["Factura con error DGII", "Duplicado detectado", "Carga completada", "Créditos por agotarse"].map(a => <AlertaToggle key={a} label={a} />)}
                        <button className="btn-primary" style={{ marginTop: 14 }} onClick={handleSaveNotif} disabled={loading}>{loading ? "Guardando..." : "Guardar configuración"}</button>
                    </div>
                </div>
            )}
        </div>
    );
}
