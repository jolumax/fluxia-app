import React, { useState } from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";
import { DRIVE_FOLDER_URL, SHEETS_REGISTRO_URL } from "../lib/constants";

export function ProcesarArchivos({ userId, selectedClient, reloadInvoices, withGlobalLock, isGlobalLocked, credits }) {
    const [files, setFiles] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const onDrop = (e) => {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles(prev => [...prev, ...droppedFiles]);
    };

    const handleUpload = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.onchange = (e) => {
            const selectedFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...selectedFiles]);
        };
        input.click();
    };

    const processWithN8n = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const base64 = reader.result.split(",")[1];
                    let webhook = import.meta.env.VITE_N8N_WEBHOOK;
                    if (!webhook.startsWith("http")) webhook = "https://" + webhook;

                    const body = {
                        user_id: userId,
                        file_name: file.name,
                        file_data: base64,
                        rnc_empresa: selectedClient?.rnc || "",
                        nombre_empresa: selectedClient?.nombre || ""
                    };

                    const res = await fetch(webhook, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body)
                    });

                    if (res.ok) resolve(await res.json());
                    else reject(new Error("Error en n8n"));
                } catch (e) { reject(e); }
            };
        });
    };

    const handleStartProcessing = async () => {
        const now = new Date();
        const expirationDate = credits?.fecha_renovacion ? new Date(credits.fecha_renovacion) : null;
        if (expirationDate && now > expirationDate) {
            return alert("Tus créditos para este ciclo de 30 días han expirado. Por favor renueva tu plan.");
        }
        if (credits && credits.creditos_limite !== -1 && credits.creditos_usados + files.length > credits.creditos_limite) {
            return alert(`Solo tienes ${credits.creditos_limite - credits.creditos_usados} créditos disponibles. Trataste de subir ${files.length}.`);
        }
        if (isGlobalLocked) return alert("Hay otra operación en curso. Por favor espera.");
        if (files.length === 0) return;
        if (files.length > 20) return alert("Máximo 20 archivos por lote.");

        setProcessing(true);
        setProgress(0);

        withGlobalLock(async () => {
            for (let i = 0; i < files.length; i++) {
                try {
                    await processWithN8n(files[i]);
                    setProgress(Math.round(((i + 1) / files.length) * 100));
                } catch (err) {
                    console.error("Error procesando:", files[i].name, err);
                }
            }
            if (reloadInvoices) reloadInvoices();
            setFiles([]);
            setProcessing(false);
            alert("✓ Procesamiento completado.");
        }, "Procesamiento de Archivos");
    };

    const now = new Date();
    const expirationDate = credits?.fecha_renovacion ? new Date(credits.fecha_renovacion) : null;
    const isExpired = expirationDate && now > expirationDate;
    const isOutOfCredits = (credits && credits.creditos_limite !== -1 && credits.creditos_usados >= credits.creditos_limite) || isExpired;

    return (
        <div className="page-content fade-in">
            {isOutOfCredits && (
                <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--danger)", padding: 24, borderRadius: 16, marginBottom: 24, textAlign: "center" }}>
                    <div style={{ width: 48, height: 48, background: "rgba(239,68,68,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <Icon d={icons.alert} size={24} stroke="var(--danger)" />
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
                        {isExpired ? "Suscripción Expirada" : "Créditos Agotados"}
                    </h3>
                    <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 16, maxWidth: 450, margin: "0 auto 16px" }}>
                        {isExpired 
                            ? "Tu ciclo mensual de 30 días ha finalizado. Los créditos no consumidos no son acumulables. Para seguir procesando, debes pagar la renovación del nuevo mes." 
                            : "Has consumido el límite de facturas de tu plan mensual correspondiente a estos 30 días. Por favor, agrega más créditos o mejora tu plan para continuar procesando documentos."}
                    </p>
                    <button className="btn-primary" style={{ margin: "0 auto" }} onClick={() => window.location.href = "/?plan=pro"}>Renovar o Aumentar Créditos</button>
                </div>
            )}

            <div 
                className={`card ${isOutOfCredits ? "disabled" : ""}`} 
                style={{ textAlign: "center", padding: 60, opacity: isOutOfCredits ? 0.6 : 1, pointerEvents: isOutOfCredits ? "none" : "auto" }} 
                onDragOver={e => e.preventDefault()} 
                onDrop={onDrop}
            >
                <div style={{ width: 80, height: 80, background: "var(--accent-glow)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                    <Icon d={icons.upload} size={32} stroke="var(--accent)" />
                </div>
                <h2 className="font-display" style={{ fontSize: 24, marginBottom: 12 }}>Sube tus facturas</h2>
                <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: 14 }}>Arrastra archivos PDF o imágenes (JPG, PNG). Hasta 20 archivos por vez.</p>

                <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                    <button className="btn-primary" style={{ width: "auto" }} onClick={handleUpload} disabled={processing || isOutOfCredits}>Seleccionar archivos</button>
                    {files.length > 0 && (
                        <button className="btn-secondary" onClick={handleStartProcessing} disabled={processing}>
                            {processing ? `Procesando (${progress}%)` : `Procesar ${files.length} archivos`}
                        </button>
                    )}
                </div>

                {files.length > 0 && (
                    <div style={{ marginTop: 32, textAlign: "left", maxWidth: 500, margin: "32px auto 0", background: "var(--bg-card)", padding: 20, borderRadius: 16, border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1 }}>ARCHIVOS SELECCIONADOS ({files.length})</div>
                            <button className="btn-ghost" style={{ fontSize: 11, color: "var(--danger)", padding: "4px 8px" }} onClick={() => setFiles([])} disabled={processing}>
                                Limpiar todo
                            </button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 200, overflowY: "auto", paddingRight: 8 }} className="custom-scrollbar">
                            {files.map((f, i) => (
                                <div key={i} className="file-row" style={{ background: "var(--bg-surface)", padding: "10px 14px", borderRadius: 10, display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--border)" }}>
                                    <div style={{ width: 28, height: 28, background: "rgba(59,130,246,0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Icon d={icons.file} size={14} stroke="var(--accent)" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{(f.size / 1024 / 1024).toFixed(2)} MB</div>
                                    </div>
                                    <button className="btn-ghost" style={{ padding: 6, color: "var(--text-muted)" }} onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} disabled={processing}>
                                        <Icon d={icons.x} size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div className="card" style={{ cursor: "pointer" }} onClick={() => window.open(DRIVE_FOLDER_URL, "_blank")}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Icon d={icons.drive} size={24} stroke="#4285F4" />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>Ver en Google Drive</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Tus expedientes digitales organizados</div>
                        </div>
                    </div>
                </div>
                <div className="card" style={{ cursor: "pointer" }} onClick={() => window.open(SHEETS_REGISTRO_URL, "_blank")}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Icon d={icons.sheet} size={24} stroke="#0F9D58" />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>Reporte en Google Sheets</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Sincronización en tiempo real</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
