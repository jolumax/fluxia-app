export const suggestExpenseCategory = (concept) => {
    const text = (concept || "").toLowerCase();
    if (text.includes("nomina") || text.includes("sueldo") || text.includes("tss")) return "01";
    if (text.includes("alquiler") || text.includes("renta")) return "03";
    if (text.includes("seguro")) return "11";
    if (text.includes("luz") || text.includes("agua") || text.includes("internet") || text.includes("teléfono")) return "02";
    if (text.includes("combustible") || text.includes("mantenimiento")) return "02";
    if (text.includes("publicidad")) return "02";
    if (text.includes("legal") || text.includes("honorarios")) return "02";
    if (text.includes("prestamos") || text.includes("intereses") || text.includes("comision")) return "07";
    return "06";
};

export const checkNCFAlerts = (invoices) => {
    if (!invoices) return { total: 0, alerts: [] };
    const now = new Date();
    const alerts = invoices.filter(inv => {
        if (!inv.fecha || inv.fecha === "—") return false;
        try {
            const [y, m, d] = inv.fecha.split("-").map(Number);
            const deadline = new Date(y, m, 15);
            return now >= deadline;
        } catch (e) { return false; }
    });
    return { total: alerts.length, alerts };
};
