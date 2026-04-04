import React, { useState } from "react";
import { Icon } from "./common/Icon";
import { icons } from "../lib/icons";
import { DRIVE_FOLDER_URL, SHEETS_REGISTRO_URL } from "../lib/constants";

export function ProcesarArchivos({ userId, selectedClient, reloadInvoices, withGlobalLock, isGlobalLocked, credits }) {
    const [files, setFiles] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [tipoOperacion, setTipoOperacion] = useState("606");
    const [isDragging, setIsDragging] = useState(false);

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles(prev => [...prev, ...droppedFiles]);
    };

    const handleUpload = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*,application/pdf";
        input.multiple = true;
        input.onchange = (e) => {
            const selectedFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...selectedFiles]);
        };
        input.click();
    };

    // Comprime imagen usando Canvas antes de base64 (ahorra ~80% de tokens)
    const compressImage = (file) => {
        return new Promise((resolve) => {
            // Si es PDF, no hay compresión posible — devolver directo
            if (file.type === "application/pdf") {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result.split(",")[1]);
                return;
            }

            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                const MAX_DIM = 1400; // px óptimo para GPT-4o detail:high
                let { width, height } = img;

                // Escalar manteniendo aspecto si excede el límite
                if (width > MAX_DIM || height > MAX_DIM) {
                    if (width > height) {
                        height = Math.round((height * MAX_DIM) / width);
                        width = MAX_DIM;
                    } else {
                        width = Math.round((width * MAX_DIM) / height);
                        height = MAX_DIM;
                    }
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                // JPEG al 85% — imperceptible para OCR, reduce base64 ~75%
                const compressed = canvas.toDataURL("image/jpeg", 0.85);
                URL.revokeObjectURL(url);
                resolve(compressed.split(",")[1]);
            };
            img.onerror = () => {
                // Fallback a base64 original si falla
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result.split(",")[1]);
            };
            img.src = url;
        });
    };

    const processWithN8n = async (file) => {
        // Comprimir imagen ANTES de enviar a N8N
        const base64 = await compressImage(file);

        let webhook = import.meta.env.VITE_N8N_WEBHOOK || "";
        webhook = webhook.replace(/^(https?:\/\/)+/g, "https://").trim();
        if (!webhook.startsWith("http")) webhook = "https://" + webhook;

        const body = {
            user_id: userId,
            file_name: file.name,
            file_base64: base64,
            audit_mode: true,
            rnc_empresa: selectedClient?.rnc || "",
            tipo_fiscal: tipoOperacion,
            drive_folder_id: selectedClient?.drive_folder_id || credits?.folder_drive_id || "",
            plan: credits?.plan || "basic" // N8N usa esto para saber si activar GPT-4o
        };

        const res = await fetch(webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const text = await res.text();
        if (!res.ok) {
            let errMsg = "Error en n8n";
            try { errMsg = JSON.parse(text)?.message || errMsg; } catch {}
            throw new Error(errMsg);
        }
        if (!text || text.trim() === "") throw new Error("N8N devolvió respuesta vacía");
        try {
            return JSON.parse(text);
        } catch (_) {
            throw new Error("Respuesta inválida del servidor");
        }
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
            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < files.length; i++) {
                try {
                    await processWithN8n(files[i]);
                    successCount++;
                    setProgress(Math.round(((i + 1) / files.length) * 100));
                } catch (err) {
                    errorCount++;
                    console.error("Error procesando:", files[i].name, err);
                }
            }
            if (reloadInvoices) reloadInvoices();
            setFiles([]);
            setProcessing(false);
            
            if (errorCount === 0) {
                alert(`✅ ${successCount} archivos procesados correctamente.`);
            } else {
                alert(`⚠️ Procesamiento terminado con detalles:\n- Éxitos: ${successCount}\n- Errores: ${errorCount}\n\nRevisa la consola para más detalles.`);
            }
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

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <div style={{ background: "var(--bg-card)", padding: 4, borderRadius: 12, border: "1px solid var(--border)", display: "flex", gap: 4 }}>
                    <button 
                        onClick={() => setTipoOperacion("606")}
                        style={{ 
                            padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
                            background: tipoOperacion === "606" ? "var(--accent)" : "transparent",
                            color: tipoOperacion === "606" ? "white" : "var(--text-muted)",
                            transition: "all 0.2s ease"
                        }}
                    >
                        GASTOS (606)
                    </button>
                    <button 
                        onClick={() => {
                            if (credits?.plan === "basic") {
                                alert("🔒 Esta función disponible en Plan Pro Y Premium");
                                return;
                            }
                            setTipoOperacion("607");
                        }}
                        style={{ 
                            padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
                            background: tipoOperacion === "607" ? "var(--success)" : "transparent",
                            color: tipoOperacion === "607" ? "white" : "var(--text-muted)",
                            transition: "all 0.2s ease",
                            opacity: credits?.plan === "basic" ? 0.6 : 1
                        }}
                    >
                        INGRESOS (607) {credits?.plan === "basic" && "🔒"}
                    </button>
                </div>
            </div>

            {tipoOperacion === "607" && credits?.plan === "basic" && (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", padding: 20, borderRadius: 16, marginBottom: 24, textAlign: "center", animation: "fade-in 0.3s ease" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>💎 Funcionalidad Premium</div>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Esta función disponible en Plan Pro Y Premium</p>
                    <button className="btn-primary" style={{ padding: "8px 16px", fontSize: 12 }} onClick={() => window.location.href = "/?plan=pro"}>Mejorar mi Plan</button>
                </div>
            )}

            <div
                className={`card ${isOutOfCredits ? "disabled" : ""}`}
                style={{ 
                    textAlign: "center", 
                    padding: 60, 
                    opacity: isOutOfCredits ? 0.6 : 1, 
                    pointerEvents: isOutOfCredits ? "none" : "auto",
                    border: isDragging ? "2px dashed var(--accent)" : "1px solid var(--border)",
                    backgroundColor: isDragging ? "rgba(59,130,246,0.02)" : "var(--bg-card)",
                    transition: "all 0.3s ease",
                    transform: isDragging ? "scale(1.01)" : "scale(1)"
                }}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
            >
                <div style={{ 
                    display: "inline-block", 
                    padding: "6px 14px", 
                    background: "var(--bg-surface)", 
                    border: "1px solid var(--border)", 
                    borderRadius: 20, 
                    marginBottom: 20,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 1,
                    color: "var(--text-muted)",
                    textTransform: "uppercase"
                }}>
                    Destino: <span style={{ color: "var(--accent)" }}>{selectedClient?.nombre || "(Tú) Perfil Principal"}</span>
                </div>

                <div style={{ 
                    width: 80, height: 80, 
                    background: isDragging ? "var(--bg-surface)" : "var(--accent-glow)", 
                    borderRadius: "50%", 
                    display: "flex", alignItems: "center", justifyContent: "center", 
                    margin: "0 auto 24px",
                    boxShadow: isDragging ? "0 0 20px var(--accent)" : "none",
                    transition: "all 0.3s ease"
                }}>
                    <Icon d={icons.upload} size={32} stroke="var(--accent)" />
                </div>
                <h2 className="font-display" style={{ fontSize: 24, marginBottom: 12 }}>
                    {isDragging ? "Suelta tus facturas aquí" : "Sube tus facturas"}
                </h2>
                <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: 14 }}>
                    Arrastra archivos PDF o imágenes (JPG, PNG). Hasta 20 archivos por vez.
                </p>

                {!processing && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                        <button className="btn-primary" style={{ width: "auto" }} onClick={handleUpload} disabled={isOutOfCredits}>Seleccionar archivos</button>
                        {files.length > 0 && (
                            <button className="btn-secondary" onClick={handleStartProcessing}>
                                Procesar {files.length} archivos
                            </button>
                        )}
                    </div>
                )}

                {processing && (
                    <div style={{ marginTop: 20, maxWidth: 300, margin: "0 auto" }}>
                        <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden" }}>
                            <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent)", transition: "width 0.3s ease", boxShadow: "0 0 10px var(--accent)" }}></div>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, marginTop: 8, letterSpacing: 1 }}>
                            PROCESANDO XML / PDF ({progress}%)
                        </div>
                    </div>
                )}

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

            <div className="grid-responsive" style={{ marginTop: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
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
