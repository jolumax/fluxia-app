import { useState, useEffect, useCallback } from "react";

export function useAirtableInvoices(userId, credits, selectedClientRNC = null) {
    const [invoices, setInvoices] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);

    const reloadInvoices = useCallback(() => setReload(r => r + 1), []);

    useEffect(() => {
        if (!userId || !credits) {
            setLoading(false);
            return;
        }

        const fetchAirtable = async () => {
            try {
                const token = import.meta.env.VITE_AIRTABLE_TOKEN;
                if (!token) { setLoading(false); return; }

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
                        const rawMonto = parseFloat(f.Total || f.monto_total || 0);
                        const rawItbis = parseFloat(f.ITBIS || f.itbis_total || 0);
                        const rawFecha = f["Fecha de Factura"] || f.fecha || f.fecha_emision || "—";
                        const rawEmisorRnc = f["ID Fiscal"] || f["RNC Emisor"] || f.rnc || "—";

                        return {
                            id: f.request_id || r.id.substring(0, 8),
                            emisor: f.Emisor || f.Nombre_Emisor || "Desconocido",
                            rnc: rawEmisorRnc,
                            rnc_emisor: rawEmisorRnc, // Compatibilidad con Reporteria
                            ncf: f.ncf || f.NCF || "—",
                            monto: `RD$${rawMonto.toLocaleString("es-DO")}`,
                            monto_total: rawMonto, // Para cálculos
                            itbis: `RD$${rawItbis.toLocaleString("es-DO")}`,
                            itbis_total: rawItbis, // Para cálculos
                            fecha: rawFecha,
                            fecha_emision: rawFecha, // Compatibilidad con Reporteria
                            estado: f.status === "duplicate" ? "duplicado" : (f["NCF Válido"] || f.ncf_valido ? "valido" : "error"),
                            credito: f["Tipo de NCF"] || f.tipo_ncf ? (f["Tipo de NCF"] || f.tipo_ncf).substring(0, 3) : "B01",
                            driveFileId: f.drive_file_id || f.file_id || null,
                            concepto: f.Concepto || "—",
                            rnc_empresa: (f.rnc_empresa || f["RNC Empresa"] || f.empresa_rnc || "").toString().replace(/[^0-9]/g, ''),
                            airtableId: r.id
                        };
                    });
                    setInvoices(mapped);
                }
            } catch (err) {
                console.error("Airtable fetch error:", err);
            }
            setLoading(false);
        };
        fetchAirtable();
    }, [userId, credits, reload, selectedClientRNC]);

    return { invoices, loading, reloadInvoices };
}
