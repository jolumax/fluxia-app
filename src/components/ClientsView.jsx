import React, { useState } from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";
import { supabase } from "../lib/supabase";
import { SkeletonCard } from "./common/Skeleton";
import { sanitizeName, sanitizeRNC } from "../utils/sanitize";

export function ClientsView({ userId, clients, reloadClients, setSelectedClient, setPage, selectedClient, clientsLoading, credits }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [formData, setFormData] = useState({ nombre: "", rnc: "", sector: "" });
    const [saving, setSaving] = useState(false);

    const handleOpenModal = (client = null) => {
        if (client) {
            setEditingClient(client);
            setFormData({ nombre: client.nombre, rnc: client.rnc, sector: client.sector || "" });
        } else {
            setEditingClient(null);
            setFormData({ nombre: "", rnc: "", sector: "" });
        }
        setIsModalOpen(true);
    };

    const handleSaveClient = async () => {
        const cleanNombre = sanitizeName(formData.nombre);
        const cleanRNC = sanitizeRNC(formData.rnc);
        if (!cleanNombre) return alert("⚠️ El nombre no puede estar vacío.");
        if (!cleanRNC || cleanRNC.length < 9 || cleanRNC.length > 11) return alert("⚠️ RNC inválido — debe tener 9 u 11 dígitos.");
        setSaving(true);
        try {
            if (editingClient) {
                const { error } = await supabase.from("config_clientes_multi")
                    .update({ nombre: cleanNombre, rnc: cleanRNC, sector: formData.sector })
                    .eq("id", editingClient.id);
                if (error) throw error;
            } else {
                let drive_folder_id = null;
                const webhook = import.meta.env.VITE_N8N_FOLDER_WEBHOOK;
                
                if (webhook && credits?.folder_drive_id) {
                    try {
                        const res = await fetch(webhook, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                cliente_nombre: cleanNombre,
                                parent_folder_id: credits.folder_drive_id
                            })
                        });
                        const data = await res.json();
                        if (data?.folderId) {
                            drive_folder_id = data.folderId;
                        }
                    } catch (err) {
                        console.warn("N8N Folder Webhook Error:", err);
                    }
                }

                const { error } = await supabase.from("config_clientes_multi").insert([{
                    user_id: userId,
                    nombre: cleanNombre,
                    rnc: cleanRNC,
                    sector: formData.sector,
                    drive_folder_id: drive_folder_id
                }]);
                if (error) throw error;
            }
            reloadClients();
            setIsModalOpen(false);
        } catch (e) { alert("Error: " + e.message); }
        finally { setSaving(false); }
    };

    const handleDeleteClient = async (id) => {
        if (!confirm("¿Eliminar este cliente? Se mantendrán las facturas en Airtable pero ya no aparecerá aquí.")) return;
        try {
            await supabase.from("config_clientes_multi").delete().eq("id", id);
            reloadClients();
            if (selectedClient?.id === id) setSelectedClient(null);
        } catch (e) { alert("Error: " + e.message); }
    };

    return (
        <div className="page-content fade-in">
            {/* Hero Section for Clients */}
            <div style={{ marginBottom: 48, textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12, color: "var(--accent)", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
                    <Icon d={icons.users} size={16} stroke="var(--accent)" /> ADMIN DE CARTERA
                </div>
                <h1 className="font-display" style={{ 
                    fontSize: "clamp(32px, 5vw, 48px)", 
                    fontWeight: 900, 
                    lineHeight: 1.1, 
                    color: "var(--text-primary)", 
                    textTransform: "uppercase",
                    margin: "0 0 12px",
                    letterSpacing: "-1px"
                }}>
                    Mis Clientes
                </h1>
                <div style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500, marginBottom: 24 }}>
                    Gestiona las empresas y RNC de tu cartera profesional.
                </div>
                
                <button className="btn-primary" style={{ width: "auto", padding: "10px 24px" }} onClick={() => handleOpenModal()}>
                    <Icon d={icons.plus} size={16} /> Nuevo Cliente
                </button>
            </div>

            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-box slide-in" onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
                            <h3 style={{ fontSize: 18, fontWeight: 800 }}>{editingClient ? "Editar Empresa" : "Agregar Nueva Empresa"}</h3>
                            <button className="btn-ghost" onClick={() => setIsModalOpen(false)} style={{ padding: 4 }}><Icon d={icons.x} size={20} /></button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block", letterSpacing: 0.5 }}>NOMBRE / RAZÓN SOCIAL</label>
                                <input className="input-field" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} placeholder="Ej: PAMI ATENCION MEDICA..." />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block", letterSpacing: 0.5 }}>RNC (9 o 11 dígitos)</label>
                                <input className="input-field" value={formData.rnc} onChange={e => setFormData({ ...formData, rnc: e.target.value })} placeholder="Ej: 132309431" />
                            </div>
                            <div style={{ marginTop: 6 }}>
                                <button className="btn-primary" onClick={handleSaveClient} disabled={saving} style={{ height: 44 }}>
                                    {saving ? "Guardando..." : (editingClient ? "Actualizar Cambios" : "Guardar Cliente")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid-responsive" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                {clientsLoading ? (
                    [1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)
                ) : clients.map(c => (
                    <div key={c.id} className="card client-card" style={{ cursor: "pointer", borderColor: selectedClient?.id === c.id ? "var(--accent)" : "var(--border)" }} onClick={() => {
                        setSelectedClient(c);
                        setPage("dashboard");
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                            <div className="avatar" style={{ background: selectedClient?.id === c.id ? "var(--accent)" : "var(--gradient)" }}>
                                {c.nombre.substring(0, 2).toUpperCase()}
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                                <button className="btn-ghost edit-btn" style={{ opacity: 0, padding: 6 }} onClick={(e) => { e.stopPropagation(); handleOpenModal(c); }}>
                                    <Icon d={icons.edit} size={14} />
                                </button>
                                <button className="btn-ghost delete-btn" style={{ opacity: 0, padding: 6 }} onClick={(e) => { e.stopPropagation(); handleDeleteClient(c.id); }}>
                                    <Icon d={icons.trash} size={14} />
                                </button>
                            </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{c.nombre}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>RNC: {c.rnc}</div>
                        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>VER DASHBOARD →</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
