import * as XLSX from "xlsx-js-style";

// ─── Exportar TXT 606 (Oficial 23 Campos) ────────────────────────────────────
export const export606Txt = (invoices, rncEmpresa, periodo) => {
    if (!invoices || invoices.length === 0) return alert("No hay datos para exportar.");

    // Filtrar solo 606
    const expenses = invoices.filter(inv => inv.tipo_fiscal === "606");
    if (expenses.length === 0) return alert("No hay facturas 606 para este periodo.");

    const fileName = `606_${rncEmpresa}_${periodo}.txt`;
    let lines = [];
    
    // Header Oficial: 606|RNC|PERIODO|CANTIDAD
    lines.push(`606|${rncEmpresa}|${periodo}|${expenses.length}`);

    expenses.forEach(inv => {
        const rnc = (inv.rnc || "").replace(/[^0-9]/g, "");
        const tipoId = rnc.length === 9 ? "1" : "2";
        const tipoBienes = tipoBienesCodigo(inv.credito);
        const ncf = inv.ncf || "";
        const fecha = normalizarFechaAAAAMMDD(inv.fecha);
        const monto = (inv.monto_total || 0).toFixed(2);
        const itbis = (inv.itbis_total || 0).toFixed(2);
        
        // 23 Campos para 606
        // 1.RNC, 2.TipoId, 3.TipoBienes, 4.NCF, 5.NCFMod, 6.FechaComp, 7.FechaPago, 8.MontoServ, 9.MontoBien, 10.Total, 11.Itbis, ...
        const fields = [
            rnc,          // 1
            tipoId,       // 2
            tipoBienes,   // 3
            ncf,          // 4
            "",           // 5. NCF Modificado
            fecha,        // 6. Fecha Comprobante
            fecha,        // 7. Fecha Pago (Asumimos misma fecha)
            "0.00",       // 8. Monto Servicios
            monto,        // 9. Monto Bienes
            monto,        // 10. Total
            itbis,        // 11. ITBIS Facturado
            "0.00",       // 12. ITBIS Retenido
            "0.00",       // 13. Proporcionalidad
            "0.00",       // 14. Costo
            itbis,        // 15. ITBIS Adelantable
            "0.00",       // 16. ITBIS Percibido
            "",           // 17. Tipo Retención ISR
            "0.00",       // 18. Monto Retención ISR
            "0.00",       // 19. ISR Percibido
            "0.00",       // 20. ISC
            "0.00",       // 21. Otros
            "0.00",       // 22. Propina
            "01"          // 23. Forma Pago (Efectivo por defecto)
        ];

        lines.push("|" + fields.join("|"));
    });

    descargarBlob(lines.join("\n"), fileName, "text/plain");
};

// ─── Exportar TXT 607 (Oficial 23 Campos) ────────────────────────────────────
export const export607Txt = (invoices, rncEmpresa, periodo) => {
    if (!invoices || invoices.length === 0) return alert("No hay datos para exportar.");

    // Filtrar solo 607
    const sales = invoices.filter(inv => inv.tipo_fiscal === "607");
    if (sales.length === 0) return alert("No hay facturas 607 para este periodo.");

    const fileName = `607_${rncEmpresa}_${periodo}.txt`;
    let lines = [];
    
    // Header Oficial: 607|RNC|PERIODO|CANTIDAD
    lines.push(`607|${rncEmpresa}|${periodo}|${sales.length}`);

    sales.forEach(inv => {
        const rnc = (inv.rnc || "").replace(/[^0-9]/g, "");
        const tipoId = rnc.length === 9 ? "1" : (rnc.length === 11 ? "2" : "3");
        const ncf = inv.ncf || "";
        const fecha = normalizarFechaAAAAMMDD(inv.fecha);
        const monto = (inv.monto_total || 0).toFixed(2);
        const itbis = (inv.itbis_total || 0).toFixed(2);
        
        // 23 Campos para 607
        const fields = [
            rnc,          // 1. RNC/Cédula
            tipoId,       // 2. Tipo Id
            ncf,          // 3. NCF
            "",           // 4. NCF Modificado
            "01",         // 5. Tipo Ingreso (Operaciones)
            fecha,        // 6. Fecha Comprobante
            "",           // 7. Fecha Retención
            monto,        // 8. Monto Facturado
            itbis,        // 9. ITBIS Facturado
            "0.00",       // 10. ITBIS Retenido Terceros
            "0.00",       // 11. ITBIS Percibido
            "0.00",       // 12. Retención Renta Terceros
            "0.00",       // 13. ISR Percibido
            "0.00",       // 14. ISC
            "0.00",       // 15. Otros Impuestos
            "0.00",       // 16. Propina Legal
            monto,        // 17. Efectivo (Default total al efectivo)
            "0.00",       // 18. Cheque/Transf
            "0.00",       // 19. Tarjeta
            "0.00",       // 20. Crédito
            "0.00",       // 21. Bonos
            "0.00",       // 22. Permuta
            "0.00"        // 23. Otras Formas
        ];

        lines.push("|" + fields.join("|"));
    });

    descargarBlob(lines.join("\n"), fileName, "text/plain");
};


// ─── Exportar Excel Oficial DGII 606 ────────────────────────────────────────
export const export606Official = (invoices, rncEmpresa, periodo) => {
    if (!invoices || invoices.length === 0) return alert("No hay datos para exportar.");

    const wb = XLSX.utils.book_new();

    // ── Hoja UtilitarioP (listas ocultas) ──────────────────────────────────
    const utilData = [];
    for (let y = 2025; y >= 2015; y--) {
        for (let m = 1; m <= 12; m++) {
            utilData.push([parseInt(`${y}${String(m).padStart(2, "0")}`)]);
        }
    }
    const wsUtil = XLSX.utils.aoa_to_sheet(utilData);
    XLSX.utils.book_append_sheet(wb, wsUtil, "UtilitarioP");

    // ── Hoja principal ──────────────────────────────────────────────────────
    const ws = {};
    ws["!merges"] = [];

    // Colores
    const NAVY = { rgb: "003366" };
    const WHITE = { rgb: "FFFFFF" };
    const LBLUE = { rgb: "CCCCFF" };
    const LGRAY = { rgb: "F2F2F2" };
    const RED = { rgb: "FF0000" };

    const navyFill = { patternType: "solid", fgColor: NAVY };
    const lblueFill = { patternType: "solid", fgColor: LBLUE };
    const lgrayFill = { patternType: "solid", fgColor: LGRAY };
    const whiteFill = { patternType: "solid", fgColor: WHITE };
    const grayFill = { patternType: "solid", fgColor: { rgb: "D9D9D9" } };

    const boldWhite = { bold: true, color: WHITE, name: "Arial", sz: 9 };
    const boldBlack = { bold: true, name: "Arial", sz: 9 };
    const normalSm = { name: "Arial", sz: 8 };
    const thinB = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    const centerH = { horizontal: "center", vertical: "center", wrapText: true };
    const leftH = { horizontal: "left", vertical: "center" };

    const set = (r, c, val, style = {}) => {
        const addr = XLSX.utils.encode_cell({ r, c });
        ws[addr] = { v: val, t: typeof val === "number" ? "n" : "s", s: style };
    };

    const merge = (r1, c1, r2, c2) => {
        ws["!merges"].push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
    };

    // ── Fila 2 — Título ────────────────────────────────────────────────────
    set(1, 4, "Formato de Envío de Compras de Bienes y Servicios", {
        font: { bold: true, sz: 14, name: "Arial" },
        alignment: centerH,
    });
    merge(1, 4, 1, 10);

    // ── Fila 3 — Subtítulo ─────────────────────────────────────────────────
    set(2, 4, "Herramienta de Distribucion Gratuita ", {
        font: { sz: 10, name: "Arial", italic: true },
        alignment: centerH,
    });
    merge(2, 4, 2, 10);

    // ── Fila 5 — Botones simulados ─────────────────────────────────────────
    ["Inicio", "Validar", "Generar", "Cancelar", "Ayuda"].forEach((label, i) => {
        set(4, i + 1, label, { font: boldBlack, fill: grayFill, alignment: centerH, border: thinB });
    });

    // ── Fila 6 — RNC ───────────────────────────────────────────────────────
    set(5, 0, "RNC o Cédula", { font: boldWhite, fill: navyFill, alignment: leftH });
    merge(5, 0, 5, 1);
    set(5, 2, rncEmpresa, { font: { bold: true, name: "Arial", sz: 10 }, border: thinB, alignment: centerH });

    // ── Fila 7 — Cantidad Registros ────────────────────────────────────────
    set(6, 0, "Cantidad Registros", { font: boldWhite, fill: navyFill, alignment: leftH });
    merge(6, 0, 6, 1);
    set(6, 2, invoices.length, { font: boldBlack, border: thinB, alignment: centerH, t: "n" });
    set(6, 6, "Lineas de Error", { font: boldWhite, fill: navyFill, alignment: centerH });
    merge(6, 6, 6, 8);

    // ── Fila 8 — Error count ───────────────────────────────────────────────
    set(7, 6, 0, {
        font: { bold: true, color: RED, name: "Arial", sz: 9 },
        fill: lblueFill, alignment: centerH, t: "n"
    });
    merge(7, 6, 7, 8);

    // ── Fila 9 — Periodo ───────────────────────────────────────────────────
    set(8, 0, "Periodo (AAAAMM)", { font: boldWhite, fill: navyFill, alignment: leftH });
    merge(8, 0, 8, 1);
    set(8, 2, parseInt(periodo), { font: { bold: true, name: "Arial", sz: 10 }, border: thinB, alignment: centerH, t: "n" });

    // ── Fila 10 — Detalle ──────────────────────────────────────────────────
    set(9, 0, "", { fill: navyFill });
    set(9, 1, "Detalle", { font: boldWhite, fill: navyFill, alignment: centerH });
    merge(9, 1, 9, 25);

    // ── Fila 11 — Numeración columnas ──────────────────────────────────────
    const colNums = [null, 1, 2, 3, 4, 5, 6, null, 7, null, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    colNums.forEach((num, i) => {
        set(10, i, num !== null ? num : "", { font: boldWhite, fill: navyFill, alignment: centerH, t: num !== null ? "n" : "s" });
    });
    merge(10, 6, 10, 7);
    merge(10, 8, 10, 9);

    // ── Fila 12 — Headers ──────────────────────────────────────────────────
    const HEADERS = [
        "Líneas", "RNC o Cédula", "Tipo Id", "Tipo Bienes y Servicios Comprados",
        "NCF", "NCF ó Documento Modificado", "Fecha Comprobante", "",
        "Fecha Pago", "", "Monto Facturado en Servicios", "Monto Facturado en Bienes",
        "Total Monto Facturado", "ITBIS Facturado", "ITBIS Retenido",
        "ITBIS sujeto a Proporcionalidad (Art. 349)", "ITBIS llevado al Costo",
        "ITBIS por Adelantar", "ITBIS percibido en compras", "Tipo de Retención en ISR",
        "Monto Retención Renta", "ISR Percibido en compras", "Impuesto Selectivo al Consumo",
        "Otros Impuesto/Tasas", "Monto Propina Legal", "Forma de Pago"
    ];
    HEADERS.forEach((h, i) => {
        set(11, i, h, { font: boldWhite, fill: navyFill, alignment: centerH, border: thinB });
    });
    merge(11, 6, 11, 7);
    merge(11, 8, 11, 9);

    // ── Datos desde fila 13 (r=12) ─────────────────────────────────────────
    invoices.forEach((inv, idx) => {
        const r = 12 + idx;
        const rnc = (inv.rnc || "").replace(/[^0-9]/g, "");
        const tipoId = rnc.length === 9 ? "1" : "2";
        const tipoBienes = tipoBienesNombre(inv.credito || "02");
        const rawFecha = inv.fecha || inv.fecha_emision || "";
        const fechaComp = normalizarFechaAAAAMMDD(rawFecha);
        const monto = inv.monto_total || 0;
        const itbis = inv.itbis_total || 0;
        const fill = idx % 2 === 0 ? whiteFill : lgrayFill;
        const ds = { font: normalSm, fill, border: thinB, alignment: centerH };
        const dn = { font: normalSm, fill, border: thinB, alignment: centerH, t: "n" };

        set(r, 0, idx + 1, { font: normalSm, fill: lblueFill, border: thinB, alignment: centerH, t: "n" });
        set(r, 1, rnc, ds);
        set(r, 2, tipoId, ds);
        set(r, 3, tipoBienes, { font: normalSm, fill, border: thinB, alignment: { horizontal: "left", vertical: "center", wrapText: true } });
        set(r, 4, inv.ncf || "", ds);
        set(r, 5, "", ds);
        set(r, 6, fechaComp, ds);
        set(r, 7, "", ds);
        set(r, 8, fechaComp, ds);
        set(r, 9, "", ds);
        set(r, 10, 0, dn);
        set(r, 11, monto, dn);
        set(r, 12, monto, dn);
        set(r, 13, itbis, dn);
        set(r, 14, 0, dn);
        set(r, 15, 0, dn);
        set(r, 16, 0, dn);
        set(r, 17, itbis, dn);
        set(r, 18, 0, dn);
        set(r, 19, "", ds);
        set(r, 20, 0, dn);
        set(r, 21, 0, dn);
        set(r, 22, 0, dn);
        set(r, 23, 0, dn);
        set(r, 24, 0, dn);
        set(r, 25, "01", ds);
    });

    // ── Dimensiones ────────────────────────────────────────────────────────
    ws["!cols"] = [
        { wch: 8 }, { wch: 14 }, { wch: 8 }, { wch: 35 },
        { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 6 },
        { wch: 10 }, { wch: 4 }, { wch: 14 }, { wch: 14 },
        { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
        { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
        { wch: 12 }, { wch: 12 },
    ];

    ws["!rows"] = [
        { hpt: 15 }, { hpt: 24 }, { hpt: 17 }, { hpt: 13 },
        { hpt: 13 }, { hpt: 13 }, { hpt: 13 }, { hpt: 13 },
        { hpt: 15 }, { hpt: 13 }, { hpt: 48 },
    ];

    ws["!ref"] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: 12 + invoices.length, c: 25 }
    });

    XLSX.utils.book_append_sheet(wb, ws, "Herramienta Formato 606");
    wb.Workbook = { SheetViews: [{ ActiveTab: 1 }] };

    XLSX.writeFile(wb, `606_Oficial_${periodo}_Fluxia.xlsx`, { cellStyles: true });
};

// ─── Exportar Excel Oficial DGII 607 ────────────────────────────────────────
export const export607Official = (invoices, rncEmpresa, periodo) => {
    if (!invoices || invoices.length === 0) return alert("No hay datos para exportar.");

    // Filtrar solo 607
    const salesInvoices = invoices.filter(inv => inv.tipo_fiscal === "607");
    if (salesInvoices.length === 0) return alert("No se encontraron facturas marcadas como 607 (Ventas) en este periodo.");

    const wb = XLSX.utils.book_new();

    // ── Hoja UtilitarioP ──────────────────────────────────────────────────
    const utilData = [];
    for (let y = 2025; y >= 2015; y--) {
        for (let m = 1; m <= 12; m++) {
            utilData.push([parseInt(`${y}${String(m).padStart(2, "0")}`)]);
        }
    }
    const wsUtil = XLSX.utils.aoa_to_sheet(utilData);
    XLSX.utils.book_append_sheet(wb, wsUtil, "UtilitarioP");

    // ── Hoja principal ──────────────────────────────────────────────────────
    const ws = {};
    ws["!merges"] = [];

    // Colores y Estilos (Mismo que 606)
    const NAVY = { rgb: "003366" };
    const WHITE = { rgb: "FFFFFF" };
    const LBLUE = { rgb: "CCCCFF" };
    const LGRAY = { rgb: "F2F2F2" };
    const navyFill = { patternType: "solid", fgColor: NAVY };
    const lblueFill = { patternType: "solid", fgColor: LBLUE };
    const lgrayFill = { patternType: "solid", fgColor: LGRAY };
    const whiteFill = { patternType: "solid", fgColor: WHITE };
    const grayFill = { patternType: "solid", fgColor: { rgb: "D9D9D9" } };

    const boldWhite = { bold: true, color: WHITE, name: "Arial", sz: 10 };
    const boldBlack = { bold: true, name: "Arial", sz: 11 };
    const normalSm = { name: "Arial", sz: 9 };
    const thinB = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    const centerH = { horizontal: "center", vertical: "center", wrapText: true };
    const leftH = { horizontal: "left", vertical: "center" };

    const set = (r, c, val, style = {}) => {
        const addr = XLSX.utils.encode_cell({ r, c });
        ws[addr] = { v: val, t: typeof val === "number" ? "n" : "s", s: style };
    };

    const merge = (r1, c1, r2, c2) => {
        ws["!merges"].push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
    };

    // ── Fila 2 — Título (607) ──────────────────────────────────────────────
    set(1, 4, "Formato de Envío de Ventas de Bienes y Servicios", {
        font: { bold: true, sz: 16, name: "Arial" },
        alignment: centerH,
    });
    merge(1, 4, 1, 10);

    // ── Fila 3 — Subtítulo ─────────────────────────────────────────────────
    set(2, 4, "Herramienta de Distribucion Gratuita ", {
        font: { sz: 11, name: "Arial", italic: true },
        alignment: centerH,
    });
    merge(2, 4, 2, 10);

    // ── Fila 5 — Botones ───────────────────────────────────────────────────
    ["Inicio", "Validar", "Generar", "Cancelar", "Ayuda"].forEach((label, i) => {
        set(4, i + 1, label, { font: { bold: true, name: "Arial", sz: 10 }, fill: grayFill, alignment: centerH, border: thinB });
    });

    // ── Fila 6 — RNC ───────────────────────────────────────────────────────
    set(5, 0, "RNC o Cédula", { font: boldWhite, fill: navyFill, alignment: leftH });
    merge(5, 0, 5, 1);
    set(5, 2, rncEmpresa, { font: boldBlack, border: thinB, alignment: centerH });

    // ── Fila 7 — Cantidad Registros ────────────────────────────────────────
    set(6, 0, "Cantidad Registros", { font: boldWhite, fill: navyFill, alignment: leftH });
    merge(6, 0, 6, 1);
    set(6, 2, salesInvoices.length, { font: boldBlack, border: thinB, alignment: centerH, t: "n" });

    // ── Fila 9 — Periodo ───────────────────────────────────────────────────
    set(8, 0, "Periodo (AAAAMM)", { font: boldWhite, fill: navyFill, alignment: leftH });
    merge(8, 0, 8, 1);
    set(8, 2, parseInt(periodo), { font: boldBlack, border: thinB, alignment: centerH, t: "n" });

    // ── Fila 10 — Detalle ──────────────────────────────────────────────────
    set(9, 1, "Detalle", { font: boldWhite, fill: navyFill, alignment: centerH });
    merge(9, 1, 9, 23);

    // ── Fila 11 — Numeración columnas (607) ───────────────────────────────
    const colNums = [null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    colNums.forEach((num, i) => {
        set(10, i, num !== null ? num : "", { font: boldWhite, fill: navyFill, alignment: centerH, t: num !== null ? "n" : "s" });
    });

    // ── Fila 12 — Headers (607) ───────────────────────────────────────────
    const HEADERS = [
        "Líneas", "RNC o Cédula", "Tipo Id", "NCF", "NCF o Documento Modificado",
        "Tipo de Ingreso", "Fecha Comprobante", "Fecha Retencion",
        "Monto Facturado", "ITBIS Facturado", "ITBIS Retenido por Terceros",
        "ITBIS Percibido", "Retención Renta por Terceros", "ISR Percibido",
        "ISC", "Otros Impuestos/Tasas", "Monto Propina Legal",
        "Monto Efectivo", "Monto Tarjeta/Débito", "Monto Cheque/Transferencia",
        "Monto Crédito", "Bonos o Cupones", "Permuta", "Otras Formas de Pago"
    ];
    HEADERS.forEach((h, i) => {
        set(11, i, h, { font: boldWhite, fill: navyFill, alignment: centerH, border: thinB });
    });

    // ── Datos desde fila 13 ────────────────────────────────────────────────
    salesInvoices.forEach((inv, idx) => {
        const r = 12 + idx;
        const rnc = (inv.rnc || "").replace(/[^0-9]/g, "");
        const tipoId = rnc.length === 9 ? 1 : 2;
        const fechaComp = normalizarFechaAAAAMMDD(inv.fecha);
        const monto = inv.monto_total || 0;
        const itbis = inv.itbis_total || 0;
        const fill = idx % 2 === 0 ? whiteFill : lgrayFill;
        const ds = { font: normalSm, fill, border: thinB, alignment: centerH };
        const dn = { font: normalSm, fill, border: thinB, alignment: centerH, t: "n" };

        set(r, 0, idx + 1, { font: normalSm, fill: lblueFill, border: thinB, alignment: centerH, t: "n" });
        set(r, 1, rnc, ds);
        set(r, 2, tipoId, dn);
        set(r, 3, inv.ncf || "", ds);
        set(r, 4, "", ds); // NCF Mod
        set(r, 5, "01", ds); // Tipo Ingreso Operaciones
        set(r, 6, fechaComp, ds);
        set(r, 7, "", ds); // Fecha Ret
        set(r, 8, monto, dn);
        set(r, 9, itbis, dn);
        set(r, 10, 0, dn);
        set(r, 11, 0, dn);
        set(r, 12, 0, dn);
        set(r, 13, 0, dn);
        set(r, 14, 0, dn);
        set(r, 15, 0, dn);
        set(r, 16, 0, dn);
        set(r, 17, monto, dn); // Monto Efectivo por defecto
        set(r, 18, 0, dn);
        set(r, 19, 0, dn);
        set(r, 20, 0, dn);
        set(r, 21, 0, dn);
        set(r, 22, 0, dn);
        set(r, 23, 0, dn);
    });

    ws["!cols"] = HEADERS.map(() => ({ wch: 20 }));
    ws["!ref"] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: 12 + salesInvoices.length, c: 23 }
    });

    XLSX.utils.book_append_sheet(wb, ws, "Herramienta Formato 607");
    XLSX.writeFile(wb, `607_Oficial_${periodo}_Fluxia.xlsx`, { cellStyles: true });
};


// ─── Exportar Reporte de Control de Facturas (Formato Amistoso) ───────────
export const exportControlReport = (invoices, rncEmpresa, periodo, type = "606") => {
    if (!invoices || invoices.length === 0) return alert("No hay datos para exportar.");

    // Colores Definidos (Basados en el ejemplo del usuario)
    const TITLE_BLUE = { rgb: "1F4E78" };
    const HEADER_ROW_BG = { rgb: "D9E1F2" };
    const BLACK = { rgb: "000000" };
    const thinBorder = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };

    // Construir matriz de datos inicial (Array of Arrays)
    const data = [
        [`Reporte ${type} — Control Facturas`],
        [""],
        [`Generado por Fluxia - ${new Date().toLocaleDateString("es-DO")} - ${invoices.length} registros`],
        ["#", "Emisor", "RNC", "NCF", "Tipo", "Monto", "ITBIS", "Fecha", "Estado DGII", "Concepto"]
    ];

    invoices.forEach((inv, idx) => {
        const monto = parseFloat((inv.monto || inv.monto_total || 0).toString().replace(/[^0-9.]/g, ""));
        const itbis = parseFloat((inv.itbis || inv.itbis_total || 0).toString().replace(/[^0-9.]/g, ""));
        data.push([
            idx + 1,
            inv.emisor || "—",
            inv.rnc || "—",
            inv.ncf || "—",
            inv.credito || inv.tipo || "—",
            monto,
            itbis,
            inv.fecha || inv.fecha_emision || "—",
            inv.estado || "—",
            inv.concepto || "—"
        ]);
    });

    // Crear Workbook y Worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Aplicar Estilos y Propiedades
    const range = XLSX.utils.decode_range(ws["!ref"]);

    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const addr = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[addr]) continue;

            const isTitle = R === 0;
            const isMeta = R === 2;
            const isHeader = R === 3;
            const isData = R > 3;

            // Inicializar estilo base
            ws[addr].s = {
                font: { name: "Arial", sz: 9 },
                alignment: { vertical: "center" }
            };

            if (isTitle) {
                ws[addr].s.font = { bold: true, sz: 14, color: TITLE_BLUE };
            } else if (isMeta) {
                ws[addr].s.font.italic = true;
                ws[addr].s.font.sz = 10;
                ws[addr].s.font.color = { rgb: "555555" };
            } else if (isHeader) {
                ws[addr].s.font.bold = true;
                ws[addr].s.fill = { patternType: "solid", fgColor: HEADER_ROW_BG };
                ws[addr].s.border = thinBorder;
                ws[addr].s.alignment.horizontal = "center";
            } else if (isData) {
                ws[addr].s.border = thinBorder;
                // Aplicar cebreado (filas intercaladas) usando el mismo azul claro del ejemplo
                const isEvenDataRow = (R - 4) % 2 !== 0; 
                if (isEvenDataRow) {
                    ws[addr].s.fill = { patternType: "solid", fgColor: HEADER_ROW_BG };
                }

                // Alineaciones y Formatos específicos por columna
                if (C === 0 || C === 4 || C === 7 || C === 8) {
                    ws[addr].s.alignment.horizontal = "center";
                }
                if (C === 5 || C === 6) {
                    ws[addr].s.alignment.horizontal = "right";
                    ws[addr].z = '"RD$" #,##0.00'; 
                }
                if (C === 1) ws[addr].s.font.bold = true;
                if (C === 3) ws[addr].s.font.name = "Courier New";
                
                // Color de Estado DGII (R8)
                if (C === 8) {
                    const statusVal = (ws[addr].v || "").toString().toLowerCase();
                    const colorHex = statusVal.includes("error") ? "FF0000" : (statusVal.includes("valido") || statusVal.includes("procesado") ? "00B050" : TITLE_BLUE.rgb);
                    ws[addr].s.font.color = { rgb: colorHex };
                    ws[addr].s.font.bold = true;
                }
                
                if (C === 9) ws[addr].s.alignment.wrapText = true;
            }
        }
    }

    // Configurar Merges (Uniones de celdas para títulos)
    ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } }
    ];

    // Configurar Ancho de Columnas
    ws["!cols"] = [
        { wch: 5 }, { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 8 },
        { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 15 }, { wch: 50 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, `Control_${type}`);
    XLSX.writeFile(wb, `Reporte_${type}_Fluxia_Control_Facturas.xlsx`, { cellStyles: true });
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizarFechaAAAAMMDD(raw) {
    if (!raw || raw === "—") return "";
    if (raw.includes("/")) {
        const [d, m, y] = raw.split("/");
        return `${y}${m.padStart(2, "0")}${d.padStart(2, "0")}`;
    }
    if (raw.includes("-")) return raw.replace(/-/g, "");
    return raw;
}

function tipoBienesNombre(codigo) {
    const map = {
        "B01": "02-GASTOS POR TRABAJOS, SUMINISTROS Y SERVICIOS ",
        "B02": "02-GASTOS POR TRABAJOS, SUMINISTROS Y SERVICIOS ",
        "B03": "02-GASTOS POR TRABAJOS, SUMINISTROS Y SERVICIOS ",
        "B04": "06 -OTRAS DEDUCCIONES ADMITIDAS ",
        "B11": "09 -COMPRAS Y GASTOS QUE FORMARAN PARTE DEL COSTO DE VENTA ",
        "B14": "10 -ADQUISICIONES DE ACTIVOS ",
        "B15": "11- GASTOS DE SEGUROS",
        "B16": "07 -GASTOS FINANCIEROS ",
    };
    const key = (codigo || "").toString().substring(0, 3).toUpperCase();
    return map[key] || "02-GASTOS POR TRABAJOS, SUMINISTROS Y SERVICIOS ";
}

function tipoBienesCodigo(codigo) {
    const map = {
        "B01": "02", "B02": "02", "B03": "02",
        "B04": "06", "B11": "09", "B14": "10",
        "B15": "11", "B16": "07",
    };
    const key = (codigo || "").toString().substring(0, 3).toUpperCase();
    return map[key] || "02";
}

function descargarBlob(contenido, fileName, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}
