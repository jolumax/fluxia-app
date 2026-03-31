import { useState, useEffect, useCallback } from "react";

export function useAirtableInvoices(userId, credits, selectedClientRNC = null) {
    const [invoices, setInvoices] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);

    const reloadInvoices = useCallback(() => setReload(r => r + 1), []);

    useEffect(() => {
        // FIX BUG 1: Guard correcto — solo bloquear si userId es null/undefined
        // credits puede ser un objeto con valores en 0, eso es válido
        if (!userId || credits === undefined || credits === null) {
            setLoading(false);
            return;
        }

        const fetchAirtable = async () => {
            setLoading(true);
            try {
                const token = import.meta.env.VITE_AIRTABLE_TOKEN;
                if (!token) {
                    console.error("❌ VITE_AIRTABLE_TOKEN no está definido en .env");
                    setLoading(false);
                    return;
                }

                const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID || "appPfkS3Gi2CJEDuG";
                const tableId = import.meta.env.VITE_AIRTABLE_TABLE_ID || "tbl7XkZpew0ZU64rG";

                // FIX BUG 2: Fórmula de filtro mejorada con TRIM para evitar espacios
                let formula = `({user_id} = '${userId}')`;

                if (selectedClientRNC) {
                    const cleanRNC = selectedClientRNC.toString().replace(/[^0-9]/g, "");
                    if (cleanRNC) {
                        // Usar TRIM y SUBSTITUTE para mayor robustez
                        formula = `AND(
                            {user_id} = '${userId}',
                            OR(
                                SUBSTITUTE(TRIM({rnc_empresa}),"-","") = '${cleanRNC}',
                                TRIM({rnc_empresa}) = '${cleanRNC}'
                            )
                        )`;
                    }
                }

                const sortField = "Procesado en (procesado_en)";
                const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
                url.searchParams.set("filterByFormula", formula);
                url.searchParams.set("maxRecords", "500");
                url.searchParams.set("sort[0][field]", sortField);
                url.searchParams.set("sort[0][direction]", "desc");

                console.log("🔍 Airtable fetch:", { userId, selectedClientRNC, formula });

                const res = await fetch(url.toString(), {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-store"
                });

                if (!res.ok) {
                    const errText = await res.text();
                    console.error("❌ Airtable API error:", res.status, errText);
                    setLoading(false);
                    return;
                }

                const data = await res.json();
                console.log(`✅ Airtable devolvió ${data.records?.length ?? 0} registros`);

                if (data.records) {
                    const mapped = data.records.map(r => {
                        const f = r.fields;

                        // Montos — nombres exactos de Airtable primero
                        const rawMonto = parseFloat(
                            (f["Total"] ?? f["monto_total"] ?? f["Monto Facturado"] ?? 0)
                                .toString().replace(/[^0-9.]/g, "")
                        ) || 0;

                        const rawItbis = parseFloat(
                            (f["ITBIS"] ?? f["itbis_total"] ?? f["ITBIS Facturado"] ?? 0)
                                .toString().replace(/[^0-9.]/g, "")
                        ) || 0;

                        const rawSubtotal = parseFloat(
                            (f["Subtotal"] ?? f["subtotal"] ?? 0)
                                .toString().replace(/[^0-9.]/g, "")
                        ) || 0;

                        // Fecha — el campo real se llama "Fecha de Factura (fecha)"
                        const rawFecha =
                            f["Fecha de Factura (fecha)"] ??
                            f["Fecha de Factura"] ??
                            f["fecha"] ??
                            f["fecha_emision"] ??
                            "—";
                        const normFecha = normalizarFecha(rawFecha);

                        // RNC emisor — el campo real se llama "ID Fiscal (id_fiscal)"
                        const rawEmisorRnc =
                            f["ID Fiscal (id_fiscal)"] ??
                            f["RNC/Cedula"] ??
                            f["ID Fiscal"] ??
                            f["RNC Emisor"] ??
                            f["rnc"] ??
                            f["id_fiscal"] ??
                            "—";

                        // Nombre emisor
                        const rawEmisorNombre =
                            f["Emisor"] ??
                            f["Nombre_Emisor"] ??
                            f["Emisor / Razon Social"] ??
                            f["emisor"] ??
                            "Desconocido";

                        // NCF — el campo real se llama "ncf"
                        const rawNCF =
                            f["ncf"] ??
                            f["NCF"] ??
                            f["NCF/e-NCF"] ??
                            "—";

                        // FIX BUG 3: Estado basado en campos reales de Airtable
                        // El campo "status" tiene "procesado", "duplicate", etc.
                        // El campo "NCF Válido (ncf_valido)" indica si el NCF es válido
                        const statusRaw = f["status"] ?? f["Status"] ?? "procesado";
                        const ncfValido = f["NCF Válido (ncf_valido)"] ?? f["ncf_valido"] ?? null;
                        const ncfTipo = f["Tipo de NCF (ncf_tipo)"] ?? f["Tipo de NCF"] ?? f["ncf_tipo"] ?? null;

                        let estado;
                        if (statusRaw === "duplicate") {
                            estado = "duplicado";
                        } else if (ncfValido === true || ncfValido === "true") {
                            estado = "valido";
                        } else if (ncfTipo && ncfTipo !== "N/A") {
                            estado = "valido";
                        } else {
                            // Si tiene emisor real (no N/A), se considera procesado; si no, es error
                            const tieneData = rawEmisorNombre && rawEmisorNombre !== "Desconocido" && rawEmisorNombre !== "N/A";
                            estado = tieneData ? "procesado" : "error";
                        }

                        // Detalle artículos
                        const parseDetalle = () => {
                            const raw = f["Detalle Articulos"] ?? f["detalle_articulos"] ?? null;
                            if (!raw) return [];
                            if (Array.isArray(raw)) return raw;
                            try { return JSON.parse(raw); } catch { return []; }
                        };

                        // RNC empresa (cliente activo)
                        const rncEmpresa = (
                            f["rnc_empresa"] ??
                            f["RNC Empresa"] ??
                            ""
                        ).toString().replace(/[^0-9]/g, "");

                        return {
                            id: f["request_id"] ?? r.id.substring(0, 8),
                            emisor: rawEmisorNombre,
                            rnc: rawEmisorRnc,
                            rnc_emisor: rawEmisorRnc,
                            ncf: rawNCF,
                            ncf_tipo: ncfTipo,
                            monto: `RD$${rawMonto.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`,
                            monto_total: rawMonto,
                            subtotal: rawSubtotal,
                            itbis: `RD$${rawItbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`,
                            itbis_total: rawItbis,
                            fecha: normFecha,
                            fecha_emision: normFecha,
                            estado,
                            credito: ncfTipo ?? "B01",
                            driveFileId: f["Archivo de Factura (drive_file_id)"] ?? f["drive_file_id"] ?? null,
                            concepto: f["Concepto"] ?? f["concepto"] ?? "—",
                            rnc_empresa: rncEmpresa,
                            tipo_fiscal: f["tipo_fiscal"] ?? "606",
                            detalle_articulos: parseDetalle(),
                            airtableId: r.id
                        };
                    });

                    // Filtrar registros con datos vacíos (N/A en todo) para no mostrar basura
                    const validos = mapped.filter(inv =>
                        inv.emisor !== "Desconocido" && inv.emisor !== "N/A" && inv.monto_total > 0
                    );

                    console.log(`📊 Registros válidos después de filtrar: ${validos.length} / ${mapped.length}`);
                    setInvoices(validos);
                } else {
                    console.warn("⚠️ Airtable no devolvió records:", data);
                    setInvoices([]);
                }
            } catch (err) {
                console.error("❌ Airtable fetch error:", err);
                setInvoices([]);
            }
            setLoading(false);
        };

        fetchAirtable();
    }, [userId, credits, reload, selectedClientRNC]);

    return { invoices, setInvoices, loading, reloadInvoices };
}

function normalizarFecha(raw) {
    if (!raw || raw === "—" || raw === "N/A") return "—";

    // Formato ISO: 2026-03-29 o 2026-03-29T00:00:00...
    if (raw.includes("T")) {
        raw = raw.split("T")[0];
    }

    if (raw.includes("-")) {
        const parts = raw.split("-");
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                // YYYY-MM-DD → DD/MM/YYYY
                return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
            } else {
                // DD-MM-YYYY → DD/MM/YYYY
                return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`;
            }
        }
    }

    if (raw.includes("/")) {
        const parts = raw.split("/");
        if (parts.length === 3) {
            return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`;
        }
    }

    return raw;
}
