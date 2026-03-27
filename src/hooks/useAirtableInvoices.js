import { useState, useEffect, useCallback } from "react";

export function useAirtableInvoices(userId, credits, selectedClientRNC = null) {
    const [invoices, setInvoices] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);

    const reloadInvoices = useCallback(() => setReload(r => r + 1), []);

    useEffect(() => {
        let isMounted = true;

        const fetchAirtable = async () => {
            if (!userId || !credits) {
                if (isMounted) setLoading(false);
                return;
            }
            try {
                const token = import.meta.env.VITE_AIRTABLE_TOKEN;
                if (!token) { if (isMounted) setLoading(false); return; }

                const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID || "appPfkS3Gi2CJEDuG";
                const tableId = import.meta.env.VITE_AIRTABLE_TABLE_ID || "tbl7XkZpew0ZU64rG";

                let formula = `({user_id} = '${userId}')`;

                if (selectedClientRNC) {
                    const cleanRNC = selectedClientRNC.toString().replace(/[^0-9]/g, "");
                    if (cleanRNC) {
                        formula = `AND({user_id} = '${userId}', {rnc_empresa} = '${cleanRNC}')`;
                    }
                }

                const url = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=500&sort[0][field]=Procesado%20en%20(procesado_en)&sort[0][direction]=desc`;

                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: 'no-store'
                });
                const data = await res.json();

                if (data.records) {
                    const mapped = data.records.map(r => {
                        const f = r.fields;
                        const rawMonto = parseFloat((f.Total || f.monto_total || f["Monto Facturado"] || 0).toString().replace(/[^0-9.]/g, ""));
                        const rawItbis = parseFloat((f.ITBIS || f.itbis_total || f["ITBIS Facturado"] || 0).toString().replace(/[^0-9.]/g, ""));

                        // Fix: nombre exacto de columna en Airtable con paréntesis
                        const rawFecha = f["Fecha de Factura (fecha)"] || f["Fecha de Factura"] || f.fecha || f.fecha_emision || "—";

                        // Normalizar fecha a DD/MM/YYYY
                        const normFecha = normalizarFecha(rawFecha);

                        const rawEmisorRnc = f["RNC/Cedula"] || f["ID Fiscal (id_fiscal)"] || f["ID Fiscal"] || f["RNC Emisor"] || f.rnc || f.rnc_emisor || f.id_fiscal || "—";
                        const rawEmisorNombre = f.Emisor || f.Nombre_Emisor || f["Emisor / Razon Social"] || f["Nombre Emisor"] || f.emisor || "Desconocido";
                        const rawNCF = f.ncf || f.NCF || f["NCF/e-NCF"] || "—";

                        return {
                            id: f.request_id || r.id.substring(0, 8),
                            emisor: rawEmisorNombre,
                            rnc: rawEmisorRnc,
                            rnc_emisor: rawEmisorRnc,
                            ncf: rawNCF,
                            monto: `RD$${rawMonto.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`,
                            monto_total: rawMonto,
                            itbis: `RD$${rawItbis.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`,
                            itbis_total: rawItbis,
                            fecha: normFecha,
                            fecha_emision: normFecha,
                            estado: f.status === "duplicate" ? "duplicado" : (f["NCF Válido"] || f.ncf_valido ? "valido" : "error"),
                            credito: f["Tipo de NCF"] || f.tipo_ncf ? (f["Tipo de NCF"] || f.tipo_ncf).substring(0, 3) : "B01",
                            driveFileId: f.drive_file_id || f.file_id || null,
                            concepto: f.Concepto || "—",
                            rnc_empresa: (f.rnc_empresa || f["RNC Empresa"] || f.empresa_rnc || "").toString().replace(/[^0-9]/g, ''),
                            airtableId: r.id
                        };
                    });
                    if (isMounted) setInvoices(mapped);
                }
            } catch (err) {
                console.error("Airtable fetch error:", err);
            }
            if (isMounted) setLoading(false);
        };
        fetchAirtable();
        return () => { isMounted = false; };
    }, [userId, credits, reload, selectedClientRNC]);

    return { invoices, loading, reloadInvoices };
}

// Normaliza cualquier formato de fecha a DD/MM/YYYY
function normalizarFecha(raw) {
    if (!raw || raw === "—") return "—";

    // Ya es DD/MM/YYYY o D/M/YYYY
    if (raw.includes("/")) {
        const parts = raw.split("/");
        if (parts.length === 3) {
            const d = parts[0].padStart(2, "0");
            const m = parts[1].padStart(2, "0");
            const y = parts[2];
            return `${d}/${m}/${y}`;
        }
    }

    // YYYY-MM-DD
    if (raw.includes("-")) {
        const parts = raw.split("-");
        if (parts.length === 3) {
            // Detectar si es YYYY-MM-DD o DD-MM-YYYY
            if (parts[0].length === 4) {
                return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
            } else {
                return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`;
            }
        }
    }

    return raw;
}
