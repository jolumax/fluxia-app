import React from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";

export function DriveView({ invoices }) {
    const driveFiles = (invoices || []).filter(i => i.driveFileId);

    return (
        <div className="page-content fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                    <h2 className="font-display" style={{ fontSize: 22, marginBottom: 4 }}>Expediente Digital</h2>
                    <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Tus facturas originales respaldadas en Google Drive.</p>
                </div>
                <button className="btn-secondary" style={{ width: "auto" }} onClick={() => window.open("https://drive.google.com", "_blank")}>
                    Ir a Google Drive
                </button>
            </div>

            <div className="card">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                    {driveFiles.length === 0 ? (
                        <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                            No se han encontrado archivos vinculados en Drive.
                        </div>
                    ) : driveFiles.map((inv, i) => (
                        <div key={i} className="card" style={{ padding: 12, border: "1px solid var(--border)", background: "var(--bg-surface)", cursor: "pointer" }} onClick={() => window.open(`https://drive.google.com/file/d/${inv.driveFileId}/view`, "_blank")}>
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <Icon d={icons.file} size={24} stroke="#4285F4" />
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inv.emisor}</div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{inv.fecha}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
