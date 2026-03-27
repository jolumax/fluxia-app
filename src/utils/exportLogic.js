import * as XLSX from "xlsx";

export const export606Txt = (invoices, rncEmpresa, periodo) => {
    if (!invoices || invoices.length === 0) return alert("No hay datos para exportar.");
    const fileName = `606_${rncEmpresa}_${periodo}.txt`;

    let lines = [];
    lines.push(`606|${rncEmpresa}|${periodo}|${invoices.length}`);

    invoices.forEach(inv => {
        const rnc = (inv.rnc || "").replace(/[^0-9]/g, "");
        const ncf = inv.ncf || "";
        const fecha = (inv.fecha || "").replace(/-/g, "");
        const monto = parseFloat((inv.monto || "0").replace(/[^0-9.]/g, "")).toFixed(2);
        const itbis = parseFloat((inv.itbis || "0").replace(/[^0-9.]/g, "")).toFixed(2);
        const tipoId = rnc.length === 9 ? "1" : "2";

        const line = `${rnc}|${tipoId}|${inv.credito || "01"}|${ncf}|||${fecha}||${monto}|${itbis}|||||||||`;
        lines.push(line);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
};

export const export606Official = (invoices, rncEmpresa, periodo) => {
    if (!invoices || invoices.length === 0) return alert("No hay datos para exportar.");
    const wb = XLSX.utils.book_new();
    const headers = [
        "RNC o Cédula", "Tipo ID", "Tipo Bienes y Servicios", "NCF", "NCF Modificado", "Fecha Comprobante",
        "Fecha Pago", "Monto Facturado", "ITBIS Facturado", "ITBIS Retenido", "ITBIS Sujeto a Proporcionalidad",
        "ITBIS Costo", "ITBIS Adelantable", "ITBIS Percibido en Compras", "Tipo de Retención en ISR",
        "Monto Retención Renta", "ISR Percibido en Compras", "Impuesto Selectivo al Consumo", "Otros Impuestos/Tasas", "Propina Legal", "Forma de Pago"
    ];
    const data = invoices.map(inv => {
        const rnc = (inv.rnc || "").replace(/[^0-9]/g, "");
        const monto = parseFloat((inv.monto || "0").replace(/[^0-9.]/g, ""));
        const itbis = parseFloat((inv.itbis || "0").replace(/[^0-9.]/g, ""));
        return [
            rnc, rnc.length === 9 ? "1" : "2", inv.credito || "01", inv.ncf, "", inv.fecha, "", monto, itbis, 0, 0, 0, itbis, 0, "", 0, 0, 0, 0, 0, "01"
        ];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    XLSX.utils.book_append_sheet(wb, ws, "606");
    XLSX.writeFile(wb, `DGII_606_${rncEmpresa}_${periodo}.xlsx`);
};
