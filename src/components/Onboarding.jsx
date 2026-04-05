import React, { useState } from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";
import { supabase } from "../lib/supabase";
import { WHOP_CHECKOUTS } from "../lib/constants";
import { sanitizeName, sanitizeRNC } from "../utils/sanitize";

export function Onboarding({ userId, userEmail, reloadCredits }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ empresa: "", rnc: "", plan: "pro", primerCliente: "", primerRNC: "" });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const cleanEmpresa = sanitizeName(formData.empresa);
            if (!cleanEmpresa) { alert("⚠️ El nombre de la empresa es requerido."); setLoading(false); return; }

            await supabase.from("usuarios").upsert([{
                id: userId,
                email: userEmail,
                nombre: cleanEmpresa,
                rol: "admin",
                activo: true
            }]);

            await supabase.from("config_clientes").upsert([{
                user_id: userId,
                plan: "trial", // Mantenemos el estatus como prueba
                creditos_usados: 0,
                creditos_limite: 10, // 👈 10 créditos gratis iniciales
                fecha_renovacion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }], { onConflict: 'user_id' });

            if (formData.primerCliente && formData.primerRNC) {
                const cleanClientNombre = sanitizeName(formData.primerCliente);
                const cleanClientRNC = sanitizeRNC(formData.primerRNC);
                if (cleanClientNombre && cleanClientRNC) {
                    await supabase.from("config_clientes_multi").insert([{
                        user_id: userId,
                        nombre: cleanClientNombre,
                        rnc: cleanClientRNC
                    }]);
                }
            }

            const whopLink = WHOP_CHECKOUTS[formData.plan];
            if (whopLink) {
                window.location.href = `${whopLink}?redirect_url=${encodeURIComponent(`${window.location.origin}/?plan=${formData.plan}&id=${userId}`)}`;
            } else {
                if (reloadCredits) reloadCredits();
            }
        } catch (e) {
            console.error("❌ Error en Onboarding:", e);
            alert("Error: " + e.message);
        }
        setLoading(false);
    };

    return (
        <div className="modal-overlay" style={{ background: "var(--bg-base)" }}>
            <div className="modal-box" style={{ width: 600, padding: 36, textAlign: "center" }}>
                <Icon d={icons.layers} size={40} stroke="var(--accent)" />
                <h2 className="font-display" style={{ fontSize: 24, marginTop: 16 }}>Bienvenido a Fluxia</h2>
                <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 28 }}>Configuraremos tu cuenta en unos pasos rápidos.</div>

                {step === 1 && (
                    <div style={{ textAlign: "left" }}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>NOMBRE DE LA EMPRESA *</label>
                            <input className="input-field" value={formData.empresa} onChange={e => setFormData({ ...formData, empresa: e.target.value })} placeholder="Ej. Inversiones DR" />
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>RNC DE LA EMPRESA (Opcional)</label>
                            <input className="input-field" value={formData.rnc} onChange={e => setFormData({ ...formData, rnc: e.target.value })} placeholder="101-12345-6" />
                        </div>
                        <button className="btn-primary" disabled={!formData.empresa} onClick={() => setStep(2)}>Siguiente paso →</button>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <div className="grid-responsive" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
                            {[
                                { id: "basic", t: "Básico", desc: "150 facturas/mes", price: "$25.00", color: "var(--text-muted)" },
                                { id: "pro", t: "Pro", desc: "500 facturas/mes", price: "$56.00", color: "var(--accent)", popular: true },
                                { id: "premium", t: "Premium", desc: "2500 facturas", price: "$129.99", color: "#FFD700" }
                            ].map(p => (
                                <div key={p.id} onClick={() => setFormData({ ...formData, plan: p.id })}
                                    style={{
                                        padding: "20px 16px",
                                        borderRadius: 16,
                                        border: `2px solid ${formData.plan === p.id ? "var(--accent)" : "var(--border)"}`,
                                        background: formData.plan === p.id ? "var(--bg-hover)" : "var(--bg-surface)",
                                        cursor: "pointer",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 8,
                                        position: "relative",
                                        transition: "all 0.2s ease"
                                    }}>
                                    {p.popular && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "var(--accent)", color: "white", fontSize: 9, fontWeight: 900, padding: "2px 8px", borderRadius: 20, letterSpacing: 0.5 }}>MÁS POPULAR</div>}
                                    <div style={{ fontWeight: 800, fontSize: 13, color: p.color }}>{p.t.toUpperCase()}</div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{p.price}<span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>/mes</span></div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.desc}</div>
                                </div>
                            ))}
                        </div>
                        <button className="btn-primary" onClick={() => setStep(3)}>Seleccionar Plan y Continuar →</button>
                        <button className="btn-ghost" style={{ marginTop: 12, width: "100%", justifyContent: "center" }} onClick={() => setStep(1)}>← Volver atrás</button>
                    </div>
                )}

                {step === 3 && (
                    <div style={{ textAlign: "left" }}>
                        <div style={{ background: "var(--bg-hover)", padding: 16, borderRadius: 12, border: "1px solid var(--border)", marginBottom: 20 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Opcional: Tu Primer Cliente</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Puedes configurar a tu primer cliente ahora o hacerlo más tarde.</div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>NOMBRE DEL CLIENTE</label>
                            <input className="input-field" value={formData.primerCliente} onChange={e => setFormData({ ...formData, primerCliente: e.target.value })} placeholder="Ej. Juan Pérez" />
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>RNC DEL CLIENTE</label>
                            <input className="input-field" value={formData.primerRNC} onChange={e => setFormData({ ...formData, primerRNC: e.target.value })} placeholder="101863567" />
                        </div>
                        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? "Configurando..." : "Finalizar y pagar en Whop →"}</button>
                    </div>
                )}
            </div>
        </div>
    );
}
