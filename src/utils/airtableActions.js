import { supabase } from "../lib/supabase";

const BASE_ID = "appPfkS3Gi2CJEDuG";
const TABLE_ID = "tbl7XkZpew0ZU64rG";

/**
 * Updates the status of multiple invoices in Airtable using the Edge Function.
 * @param {string[]} recordIds - Array of Airtable record IDs.
 * @param {string} newStatus - The status to set.
 */
export async function bulkUpdateInvoiceStatus(recordIds, newStatus = "confirmed") {
    if (!recordIds.length) return { success: false, message: "Faltan datos" };

    const batches = [];
    for (let i = 0; i < recordIds.length; i += 10) {
        batches.push(recordIds.slice(i, i + 10));
    }

    const results = [];
    for (const batch of batches) {
        const payload = {
            records: batch.map(id => ({
                id: id,
                fields: { status: newStatus }
            }))
        };

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const { data, error } = await supabase.functions.invoke("airtable-proxy", {
            body: {
                action: "PATCH",
                endpoint: `${BASE_ID}/${TABLE_ID}`,
                payload
            },
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (error) {
            console.error("Batch update failed:", error);
            throw new Error(error.message || "Error al actualizar lote");
        }
        
        if (data?.error) {
            throw new Error(data.error.message || "Error al actualizar lote");
        }

        results.push(data);
    }

    return { success: true, count: recordIds.length };
}

/**
 * Updates a single invoice record in Airtable.
 * @param {string} recordId - The Airtable record ID.
 * @param {Object} updatedFields - The fields to update.
 */
export async function updateInvoiceInAirtable(recordId, updatedFields) {
    if (!recordId) return { success: false, message: "Faltan datos" };

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const { data, error } = await supabase.functions.invoke("airtable-proxy", {
        body: {
            action: "PATCH",
            endpoint: `${BASE_ID}/${TABLE_ID}/${recordId}`,
            payload: { fields: updatedFields }
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (error || data?.error) {
        console.error("Single update failed:", error || data?.error);
        throw new Error("Error al actualizar factura");
    }

    return data;
}

/**
 * Creates a new invoice record in Airtable.
 * @param {Object} fields - The fields for the new invoice.
 */
export async function createInvoiceInAirtable(fields) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const { data, error } = await supabase.functions.invoke("airtable-proxy", {
        body: {
            action: "POST",
            endpoint: `${BASE_ID}/${TABLE_ID}`,
            payload: { fields: fields }
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (error || data?.error) {
        console.error("Create failed:", error || data?.error);
        throw new Error("Error al crear factura");
    }

    return data;
}
