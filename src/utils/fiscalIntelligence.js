import { validateNCF } from "./helpers";

/**
 * Analiza un set de facturas y genera insights estratégicos.
 * @param {Array} invoices - Lista de facturas procesadas
 * @param {Array} historicalStats - Datos históricos de meses anteriores
 * @returns {Array} - Lista de objetos de insight { type, title, message, level: 'info'|'warning'|'danger'|'success', icon }
 */
export function generateFiscalInsights(invoices, historicalStats) {
    const insights = [];
    if (!invoices || invoices.length === 0) return [];

    const currentMonth = invoices;
    const previousMonthData = historicalStats && historicalStats.length >= 2 ? historicalStats[historicalStats.length - 2] : null;

    // 1. Detección de Duplicados (NCF + RNC + Monto)
    const seen = new Set();
    const duplicates = [];
    currentMonth.forEach(inv => {
        const key = `${inv.ncf}-${inv.rnc}-${inv.monto_total}`;
        if (seen.has(key)) duplicates.push(inv);
        else seen.add(key);
    });

    if (duplicates.length > 0) {
        insights.push({
            type: "duplicate",
            title: "Posibles Duplicados",
            message: `Se detectaron ${duplicates.length} facturas con el mismo NCF y monto. Revisar para evitar doble reporte.`,
            level: "warning",
            icon: "copy"
        });
    }

    // 2. NCF B02 en Compras (Riesgo de Deducción)
    const b02Compras = currentMonth.filter(inv => inv.tipo_fiscal === "606" && (inv.ncf || "").startsWith("B02"));
    if (b02Compras.length > 0) {
        insights.push({
            type: "tax_risk",
            title: "NCF Consumidor Final (B02)",
            message: `Tienes ${b02Compras.length} facturas B02 en compras. Estos gastos no son deducibles de ITBIS ni ISR.`,
            level: "danger",
            icon: "alert"
        });
    }

    // 3. Análisis de Tendencia de ITBIS
    const itbis_compras = currentMonth.filter(i => i.tipo_fiscal === "606").reduce((acc, inv) => acc + (inv.itbis_total || 0), 0);
    const itbis_ventas = currentMonth.filter(i => i.tipo_fiscal === "607").reduce((acc, inv) => acc + (inv.itbis_total || 0), 0);
    const currentNet = itbis_ventas - itbis_compras;

    if (previousMonthData && previousMonthData.balance !== undefined) {
        const prevNet = previousMonthData.balance;
        const diff = currentNet - prevNet;
        const pct = prevNet !== 0 ? (diff / Math.abs(prevNet)) * 100 : 0;

        if (pct > 30 && currentNet > 5000) {
            insights.push({
                type: "trend",
                title: "Aumento de Carga Fiscal",
                message: `Tu ITBIS a pagar ha subido un ${Math.round(pct)}% respecto al mes anterior. Considera revisar tus gastos pendientes.`,
                level: "warning",
                icon: "trending"
            });
        } else if (pct < -20 && currentNet > 0) {
            insights.push({
                type: "trend",
                title: "Eficiencia Fiscal Mejorada",
                message: `Tu balance de ITBIS bajó un ${Math.round(Math.abs(pct))}% respecto al mes anterior. Buen aprovechamiento de créditos.`,
                level: "success",
                icon: "zap"
            });
        }
    }

    // 4. Recordatorio de Cierre (Día 10-15 del mes)
    const today = new Date();
    const day = today.getDate();
    if (day >= 10 && day <= 15) {
        insights.push({
            type: "deadline",
            title: "Próximo a Fecha Límite",
            message: `Estamos a día ${day}. Recuerda que el envío de los formatos 606 y 607 debe realizarse antes del día 15.`,
            level: "info",
            icon: "calendar"
        });
    }

    // 5. NCF Inválidos (Formato)
    const invalidNCFs = currentMonth.filter(inv => !validateNCF(inv.ncf, inv.tipo_fiscal).valid);
    if (invalidNCFs.length > 0) {
        insights.push({
            type: "invalid_format",
            title: "Errores de Estructura NCF",
            message: `Hay ${invalidNCFs.length} documentos con NCF que no cumplen el formato oficial de la DGII.`,
            level: "danger",
            icon: "x"
        });
    }

    return insights;
}
