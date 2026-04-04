/**
 * Fiscal Engine - Fluxia "Cerebro Fiscal"
 * Logic for calculating IT-1 declarations based on 606/607 data.
 */

export const calculateIT1 = (invoices, month = null, year = null) => {
  // 1. Filtrar por fecha si se proporciona
  const filtered = invoices.filter(inv => {
    if (!month || !year) return true;
    if (!inv.fecha || inv.fecha === "—") return false;
    
    const parts = inv.fecha.split('/');
    if (parts.length < 3) return false;
    
    const [_, m, y] = parts;
    return parseInt(m) === parseInt(month) && parseInt(y) === parseInt(year);
  });

  // 2. Agrupar por tipo fiscal
  const expenses = filtered.filter(inv => inv.tipo_fiscal === '606');
  const income = filtered.filter(inv => inv.tipo_fiscal === '607');

  // 3. Cálculos Base (607 - Ventas)
  const totalVentas = income.reduce((acc, curr) => acc + (curr.monto_total || 0), 0);
  const totalItbisVentas = income.reduce((acc, curr) => acc + (curr.itbis_total || 0), 0);

  // 4. Cálculos Base (606 - Compras/Costos)
  const totalCompras = expenses.reduce((acc, curr) => acc + (curr.monto_total || 0), 0);
  const totalItbisCompras = expenses.reduce((acc, curr) => acc + (curr.itbis_total || 0), 0);

  // 5. Cálculo de Liquidación Base
  const balance = totalItbisVentas - totalItbisCompras;
  const itbisAPagar = balance > 0 ? balance : 0;
  const saldoAFavor = balance < 0 ? Math.abs(balance) : 0;

  // 6. Proyección de Flujo de Caja
  const now = new Date();
  const esMesActual = parseInt(month) === (now.getMonth() + 1) && parseInt(year) === now.getFullYear();
  let proyeccion = null;
  if (esMesActual) {
    const diaActual = now.getDate();
    const diasEnMes = new Date(year, month, 0).getDate();
    const balanceProyectado = (totalItbisVentas / diaActual) * diasEnMes - (totalItbisCompras / diaActual) * diasEnMes;
    proyeccion = {
      isCurrentMonth: true,
      itbisProyectado: balanceProyectado > 0 ? balanceProyectado : 0,
      saldoFavorProyectado: balanceProyectado < 0 ? Math.abs(balanceProyectado) : 0,
      progresoMes: (diaActual / diasEnMes) * 100
    };
  }

  // 7. Mapeo Extendido de Casillas (Anexo A y IT-1)
  const b16 = income.filter(i => (i.ncf || "").startsWith("B16") || (i.ncf || "").startsWith("E46")); // Export
  const b00 = income.filter(i => i.monto_itbis === 0 && !((i.ncf || "").startsWith("B16"))); // Exentas
  const b15 = income.filter(i => (i.ncf || "").startsWith("B15") || (i.ncf || "").startsWith("E45")); // Gub
  const b14 = income.filter(i => (i.ncf || "").startsWith("B14") || (i.ncf || "").startsWith("E44")); // Reg Esp
  const b12 = income.filter(i => (i.ncf || "").startsWith("B12") || (i.ncf || "").startsWith("E12")); // RUI

  const sumMonto = (arr) => arr.reduce((acc, curr) => acc + (curr.monto_total || 0), 0);

  // Estructura Anexo A
  const anexoA = {
    casilla1: sumMonto(b16),
    casilla2: sumMonto(b00),
    casilla4: income.filter(i => (i.monto_itbis || 0) > 0).reduce((acc, curr) => acc + (curr.monto_total || 0), 0), // Gravadas
    casilla5: sumMonto(b12), // Otros ingresos / Activos
    casilla6: sumMonto(b14), // Reg Esp
    casilla7: sumMonto(b15), // Gub
    casilla11: totalVentas // Total Operaciones
  };

  // Estructura IT-1
  const it1 = {
    casilla1: anexoA.casilla11,
    casilla10: anexoA.casilla11,
    casilla11: anexoA.casilla11,
    casilla16: totalItbisVentas,
    casilla21: totalItbisVentas,
    casilla22: totalItbisCompras,
    casilla23: expenses.filter(i => (i.ncf || "").startsWith("B13") || (i.ncf || "").startsWith("E43")).reduce((acc, curr) => acc + (curr.itbis_total || 0), 0), // Importaciones
    casilla25: 0, // Pago a cuenta
    casilla26: balance > 0 ? balance : 0,
    casilla27: balance < 0 ? Math.abs(balance) : 0,
    casilla28: balance > 0 ? balance : 0, // Impuesto a pagar inicial
    casilla33: itbisAPagar
  };

  return {
    periodo: { month, year },
    counts: {
      ventas: income.length,
      compras: expenses.length
    },
    ventas: {
      monto: totalVentas,
      itbis: totalItbisVentas
    },
    compras: {
      monto: totalCompras,
      itbis: totalItbisCompras
    },
    resultado: {
      balance,
      itbisAPagar,
      saldoAFavor
    },
    proyeccion,
    casillas: {
      ...anexoA,
      ...it1
    },
    anexoA,
    it1
  };
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2
  }).format(amount);
};
