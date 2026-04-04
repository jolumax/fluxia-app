import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// Carga el logo de Fluxia como base64 para incrustar en el PDF
async function loadLogoBase64(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("No se pudo cargar el logo:", e);
        return null;
    }
}

// Helper: dibuja una tabla simple sin plugins externos
function drawTable(doc, { startX, startY, headers, rows, colWidths, rowHeight = 28, headerBg = [30, 41, 59], headerColor = [255, 255, 255], altBg = [248, 250, 252] }) {
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);

    // Cabecera
    doc.setFillColor(...headerBg);
    doc.rect(startX, startY, totalWidth, rowHeight, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...headerColor);

    let x = startX;
    headers.forEach((h, i) => {
        doc.text(h, x + 8, startY + rowHeight / 2 + 3);
        x += colWidths[i];
    });

    // Filas
    let y = startY + rowHeight;
    rows.forEach((row, rowIdx) => {
        const bg = rowIdx % 2 === 0 ? [255, 255, 255] : altBg;
        doc.setFillColor(...bg);
        doc.rect(startX, y, totalWidth, rowHeight, "F");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);

        x = startX;
        row.forEach((cell, i) => {
            const align = i === 1 || i === 3 ? "right" : "left";
            const textX = align === "right" ? x + colWidths[i] - 8 : x + 8;
            doc.text(String(cell), textX, y + rowHeight / 2 + 3, { align });
            x += colWidths[i];
        });

        y += rowHeight;
    });

    // Borde exterior
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.rect(startX, startY, totalWidth, rowHeight + rows.length * rowHeight, "S");

    return y; // retorna la Y final
}

export async function generateMasterPDF(client, stats, chartsNode) {
    const doc = new jsPDF("p", "pt", "letter");
    const margin = 36;
    const pageW = doc.internal.pageSize.getWidth();

    // Cargar logo real de Fluxia (icon-512.png de /public)
    const logoBase64 = await loadLogoBase64("/icon-512.png");

    // =====================
    // CABECERA
    // =====================
    // Fondo de cabecera oscuro
    doc.setFillColor(15, 23, 42);  // Slate 900
    doc.rect(0, 0, pageW, 100, "F");

    // Logo: si está disponible, usar imagen real; si no, cuadrado morado con "F"
    if (logoBase64) {
        // Logo redondo/cuadrado con esquinas redondeadas
        doc.addImage(logoBase64, "PNG", margin, 20, 52, 52);
    } else {
        // Fallback cuadrado morado con letra F
        doc.setFillColor(99, 102, 241);
        doc.roundedRect(margin, 26, 40, 40, 8, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text("F", margin + 12, 54);
    }

    // Nombre de la app (a la derecha del logo)
    const logoEndX = margin + 60;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("FLUXIA", logoEndX, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text("Cerebro Fiscal \u2014 Reporte Ejecutivo", logoEndX, 68);

    // Fecha — derecha
    const dateStr = new Date().toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" });
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(dateStr, pageW - margin, 50, { align: "right" });

    // =====================
    // INFO DEL CLIENTE
    // =====================
    let y = 130;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(client?.nombre || "Empresa", margin, y);

    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`RNC: ${client?.rnc || "N/A"}  |  Plan: ${(client?.plan || "Pro").toUpperCase()}`, margin, y);

    // Línea separadora
    y += 16;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(margin, y, pageW - margin, y);

    // =====================
    // SECCIÓN KPIs
    // =====================
    y += 28;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("RESUMEN FISCAL DEL PERÍODO", margin, y);

    y += 14;

    const formatMoney = (val) => {
        const n = Number(val) || 0;
        return `RD$${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const kpiRows = [
        ["Total Compras / Gastos (606)", formatMoney(stats?.gastos_totales), "Facturas Válidas DGII", `${stats?.validas ?? 0}`],
        ["Total Ventas / Ingresos (607)", formatMoney(stats?.ventas_totales), "Facturas con Errores",  `${stats?.errors ?? 0}`],
        ["ITBIS a Pagar (monto neto)",    formatMoney(stats?.itbis_a_pagar), "Riesgos Fiscales",       `${stats?.fiscalRisks ?? 0}`],
    ];

    y = drawTable(doc, {
        startX: margin,
        startY: y,
        headers: ["CONCEPTO", "MONTO", "INDICADOR", "CANT."],
        rows: kpiRows,
        colWidths: [200, 120, 150, 62],
        rowHeight: 28
    });

    // =====================
    // TIPOS DE NCF
    // =====================
    y += 28;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("DISTRIBUCIÓN DE COMPROBANTES FISCALES (NCF)", margin, y);
    y += 14;

    const ncfRows = [
        ["B01 - Crédito Fiscal",   `${stats?.b01 ?? 0}`],
        ["B02 - Consumidor Final", `${stats?.b02 ?? 0}`],
        ["B04 - Gubernamental",    `${stats?.b04 ?? 0}`],
    ];

    y = drawTable(doc, {
        startX: margin,
        startY: y,
        headers: ["TIPO DE NCF", "CANTIDAD"],
        rows: ncfRows,
        colWidths: [350, 182],
        rowHeight: 26
    });

    // =====================
    // GRÁFICOS (html2canvas)
    // =====================
    if (chartsNode) {
        y += 28;

        // Si se desborda la página, nueva página
        if (y > 650) {
            doc.addPage();
            y = margin + 10;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text("INTELIGENCIA VISUAL — CEREBRO FISCAL", margin, y);
        y += 14;

        try {
            const canvas = await html2canvas(chartsNode, {
                scale: 1.5,
                backgroundColor: "#0f172a",
                logging: false,
                useCORS: true,
                allowTaint: true
            });

            const imgData = canvas.toDataURL("image/jpeg", 0.85);
            const imgW = pageW - margin * 2;
            const imgH = (canvas.height * imgW) / canvas.width;

            if (y + imgH > 750) {
                doc.addPage();
                y = margin;
            }

            doc.addImage(imgData, "JPEG", margin, y, imgW, imgH);
            y += imgH;
        } catch (err) {
            console.error("html2canvas error:", err);
            doc.setFont("helvetica", "italic");
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text("[Los gráficos no pudieron ser capturados en esta sesión]", margin, y + 20);
            y += 40;
        }
    }

    // =====================
    // PIE DE PÁGINA
    // =====================
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFillColor(15, 23, 42);
        doc.rect(0, doc.internal.pageSize.getHeight() - 40, pageW, 40, "F");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Generado por Fluxia — Cerebro Fiscal Automatizado", margin, doc.internal.pageSize.getHeight() - 14);
        doc.text(`Página ${i} de ${total}`, pageW - margin, doc.internal.pageSize.getHeight() - 14, { align: "right" });
    }

    const filename = `Reporte_Fluxia_${(client?.rnc || "Nuevo").replace(/[^0-9a-zA-Z]/g, "")}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
}
