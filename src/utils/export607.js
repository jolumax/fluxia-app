import { export607Official } from './exportLogic';

/**
 * Genera un archivo Excel con el formato oficial de la DGII para Ventas (607)
 * @param {Array} invoices Lista de facturas filtradas
 * @param {Object} clientInfo Información del cliente (rnc, nombre)
 * @param {Number} month Mes seleccionado
 * @param {Number} year Año seleccionado
 */
export const exportTo607 = (invoices, clientInfo, month, year) => {
    const rncEmpresa = clientInfo?.rnc?.toString().replace(/[^0-9]/g, "") || "";
    const periodoStr = `${year}${month.toString().padStart(2, '0')}`;
    
    // Usamos el reporte oficial navy de la DGII solicitado por el usuario
    export607Official(invoices, rncEmpresa, periodoStr);
};

