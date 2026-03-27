const AIRTABLE_TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID || "appPfkS3Gi2CJEDuG";
const TABLE_ID = import.meta.env.VITE_AIRTABLE_TABLE_ID || "tbl7XkZpew0ZU64rG";

/**
 * Updates the status of multiple invoices in Airtable.
 * Airtable allows up to 10 records per PATCH request.
 * @param {string[]} recordIds - Array of Airtable record IDs (not request_ids).
 * @param {string} newStatus - The status to set (e.g., 'confirmed').
 */
export async function bulkUpdateInvoiceStatus(recordIds, newStatus = "confirmed") {
    if (!AIRTABLE_TOKEN || !recordIds.length) return { success: false, message: "Faltan datos" };

    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
    
    // Batch into groups of 10
    const batches = [];
    for (let i = 0; i < recordIds.length; i += 10) {
        batches.push(recordIds.slice(i, i + 10));
    }

    const results = [];
    for (const batch of batches) {
        const payload = {
            records: batch.map(id => ({
                id: id,
                fields: {
                    status: newStatus
                }
            }))
        };

        try {
            const res = await fetch(url, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error?.message || "Error al actualizar lote");
            }
            results.push(await res.json());
        } catch (error) {
            console.error("Batch update failed:", error);
            throw error;
        }
    }

    return { success: true, count: recordIds.length };
}

/**
 * Updates a single invoice record in Airtable with the given fields.
 * @param {string} recordId - The Airtable record ID.
 * @param {Object} updatedFields - The fields to update.
 */
export async function updateInvoiceInAirtable(recordId, updatedFields) {
    if (!AIRTABLE_TOKEN || !recordId) return { success: false, message: "Faltan datos" };

    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`;
    try {
        const res = await fetch(url, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ fields: updatedFields })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error?.message || "Error al actualizar factura");
        }
        return await res.json();
    } catch (error) {
        console.error("Single update failed:", error);
        throw error;
    }
}
