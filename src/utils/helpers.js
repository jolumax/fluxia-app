export const suggestExpenseCategory = (concept, emisor = "") => {
    const text = (concept || "").toLowerCase();
    const vendor = (emisor || "").toLowerCase();

    // 01 - Gastos de Personal / Nómina / TSS / Infotep / Teléfonos (Claro, Altice)
    if (vendor.includes("claro") || vendor.includes("altice") || vendor.includes("codetel") || vendor.includes("tricom")) return "01";
    if (text.includes("nomina") || text.includes("sueldo") || text.includes("tss") || text.includes("infotep") || text.includes("ars")) return "01";
    
    // 03 - Gastos por Arrendamientos (Alquileres)
    if (text.includes("alquiler") || text.includes("renta") || text.includes("arrendamiento")) return "03";
    
    // 07 - Gastos Financieros (Bancos, Comisiones, Intereses)
    if (vendor.includes("banco") || vendor.includes("reservas") || vendor.includes("popular") || vendor.includes("bhdi")) return "07";
    if (vendor.includes("scotia") || vendor.includes("bhd") || vendor.includes("progreso")) return "07";
    if (text.includes("prestamos") || text.includes("intereses") || text.includes("comision") || text.includes("mora")) return "07";

    // 11 - Gastos de Seguros (ARS, Seguros de Vehículos, etc.)
    if (vendor.includes("seguro") || vendor.includes("ars") || vendor.includes("humano") || vendor.includes("mapfre") || vendor.includes("universal")) return "11";
    if (text.includes("seguro") || text.includes("póliza")) return "11";

    // 02 - Gastos por Trabajos, Suministros y Servicios (Luz, Agua, Combustible, Mantenimiento)
    if (vendor.includes("edeeste") || vendor.includes("edenorte") || vendor.includes("edesur") || vendor.includes("caasd")) return "02";
    if (text.includes("luz") || text.includes("agua") || text.includes("internet") || text.includes("teléfono")) return "02";
    if (text.includes("combustible") || text.includes("mantenimiento") || text.includes("gasoil") || text.includes("gasolina")) return "02";
    if (text.includes("publicidad") || text.includes("anuncio") || text.includes("marketing")) return "02";
    if (text.includes("legal") || text.includes("honorarios") || text.includes("notario") || text.includes("abogado")) return "02";
    if (text.includes("papeleria") || text.includes("limpieza") || text.includes("suministros")) return "02";

    // 06 - Otras Deducciones Admitidas (Default)
    return "06";
};


/**
 * Valida un NCF según las reglas de la DGII (República Dominicana).
 */
export const validateNCF = (ncf = "", tipo_fiscal = "") => {
    const cleanNcf = (ncf || "").trim().toUpperCase();
    if (!cleanNcf) return { valid: true, message: "" };

    // 1. Regla de Longitud (11 caracteres estándar, 13 electrónicos)
    if (cleanNcf.length !== 11 && cleanNcf.length !== 13) {
        return { 
            valid: false, 
            message: "Longitud de NCF inválida (debe ser 11 o 13)", 
            severity: 'error',
            code: 'INVALID_LENGTH'
        };
    }

    // 2. Regla de Prefijo (B o E)
    const prefix = cleanNcf.charAt(0);
    if (prefix !== 'B' && prefix !== 'E') {
        return { 
            valid: false, 
            message: "Prefijo de NCF desconocido (debe iniciar con B o E)", 
            severity: 'error',
            code: 'INVALID_PREFIX'
        };
    }

    // 3. Regla B02 en Gastos (No Deducible)
    if (tipo_fiscal === '606' && cleanNcf.startsWith('B02')) {
        return { 
            valid: false, 
            message: "NCF B02 (Consumidor Final) detectado en Gasto. No es deducible para crédito fiscal.", 
            severity: 'warning',
            code: 'B02_IN_EXPENSE'
        };
    }

    // 4. Prefijos Comunes Válidos
    const validSeries = ['01', '02', '03', '04', '11', '12', '13', '14', '15', '16', '31', '32', '33', '34'];
    const serie = cleanNcf.substring(1, 3);
    if (!validSeries.includes(serie)) {
        return {
            valid: false,
            message: `Serie de NCF '${serie}' poco común para este tipo de reporte.`,
            severity: 'warning',
            code: 'UNCOMMON_SERIE'
        };
    }

    return { valid: true, message: "NCF Válido", severity: 'success' };
};

export const checkNCFAlerts = (invoices) => {
    if (!invoices) return { total: 0, alerts: [] };
    
    const alerts = invoices.filter(inv => {
        const validation = validateNCF(inv.ncf, inv.tipo_fiscal);
        return !validation.valid;
    });

    return { 
        total: alerts.length, 
        alerts: alerts.map(inv => ({
            ...inv,
            validation: validateNCF(inv.ncf, inv.tipo_fiscal)
        }))
    };
};
