import React, { useState } from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";

export function InvoiceEditModal({ invoice, onSave, onClose }) {
    const [formData, setFormData] = useState({
        emisor: invoice.emisor || "",
        rnc: invoice.rnc || "",
        ncf: invoice.ncf || "",
        monto: invoice.monto ? invoice.monto.replace(/RD\$|,/g, "").trim() : "",
        itbis: invoice.itbis ? invoice.itbis.replace(/RD\$|,/g, "").trim() : "",
        estado: invoice.estado || "Válida"
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Clean and format fields for Airtable
        const fieldsToUpdate = {
            "Emisor / Razon Social": formData.emisor,
            "RNC/Cedula": formData.rnc,
            "NCF/e-NCF": formData.ncf,
            "Monto Facturado": formData.monto ? `RD$${parseFloat(formData.monto).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "RD$0.00",
            "ITBIS Facturado": formData.itbis ? `RD$${parseFloat(formData.itbis).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "RD$0.00",
            "status": formData.estado === "Válida" ? "valido" : formData.estado === "Con error" ? "error" : "revision"
        };
        
        await onSave(invoice.airtableId, fieldsToUpdate);
        setLoading(false);
        onClose();
    };

    return (
        <div className="modal-overlay" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="modal-box" style={{ width: 500, padding: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Editar Factura</h3>
                    <button className="btn-ghost" style={{ padding: 8 }} onClick={onClose} disabled={loading}>
                        <Icon d={icons.x} size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Emisor / Razón Social</label>
                        <input type="text" className="input-field" name="emisor" value={formData.emisor} onChange={handleChange} required />
                    </div>
                    <div className="grid-responsive" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>RNC</label>
                            <input type="text" className="input-field" name="rnc" value={formData.rnc} onChange={handleChange} required />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>NCF</label>
                            <input type="text" className="input-field" name="ncf" value={formData.ncf} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="grid-responsive" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Monto Facturado (RD$)</label>
                            <input type="number" step="0.01" className="input-field" name="monto" value={formData.monto} onChange={handleChange} required />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>ITBIS (RD$)</label>
                            <input type="number" step="0.01" className="input-field" name="itbis" value={formData.itbis} onChange={handleChange} />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Estado</label>
                        <select className="input-field" name="estado" value={formData.estado} onChange={handleChange}>
                            <option value="Válida">Válida</option>
                            <option value="Con error">Con error / Inválida</option>
                            <option value="En revisión">En revisión</option>
                        </select>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? "Guardando..." : "Guardar Cambios"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
