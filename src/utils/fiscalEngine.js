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

  // 5. Cálculo de Liquidación
  const balance = totalItbisVentas - totalItbisCompras;
  const itbisAPagar = balance > 0 ? balance : 0;
  const saldoAFavor = balance < 0 ? Math.abs(balance) : 0;

  // 6. Proyección de Flujo de Caja (Nivel+)
  const now = new Date();
  const esMesActual = parseInt(month) === (now.getMonth() + 1) && parseInt(year) === now.getFullYear();
  
  let proyeccion = null;
  if (esMesActual) {
    const diaActual = now.getDate();
    const diasEnMes = new Date(year, month, 0).getDate();
    const diasRestantes = diasEnMes - diaActual;
    const diasParaEl20 = 20 + diasRestantes; // Días hasta el 20 del próximo mes

    // Promedio diario de ITBIS
    const promedioItbisVentas = totalItbisVentas / diaActual;
    const promedioItbisCompras = totalItbisCompras / diaActual;
    
    // Proyectado total
    const ventasProyectadas = promedioItbisVentas * diasEnMes;
    const comprasProyectadas = promedioItbisCompras * diasEnMes;
    const balanceProyectado = ventasProyectadas - comprasProyectadas;

    proyeccion = {
      isCurrentMonth: true,
      diaActual,
      diasEnMes,
      diasRestantes,
      diasParaEl20,
      itbisProyectado: balanceProyectado > 0 ? balanceProyectado : 0,
      saldoFavorProyectado: balanceProyectado < 0 ? Math.abs(balanceProyectado) : 0,
      progresoMes: (diaActual / diasEnMes) * 100
    };
  }

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
    // Casillas simuladas del IT-1 (Simplificado)
    casillas: {
      casilla1: totalVentas, 
      casilla10: totalItbisVentas, 
      casilla15: totalItbisCompras, 
      casilla22: itbisAPagar, 
      casilla23: saldoAFavor 
    }
  };
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2
  }).format(amount);
};
