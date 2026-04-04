/**
 * FLUXIA — Motor de Categorización IA Local (Zero-Cost)
 * 
 * Categorías DGII 606 oficiales:
 * 01 - Gastos de personal
 * 02 - Trabajos, suministros y servicios
 * 03 - Arrendamientos
 * 04 - Gastos de activos fijos
 * 05 - Gastos de representación
 * 06 - Otras deducciones admitidas
 * 07 - Gastos financieros
 * 08 - Gastos extraordinarios
 * 09 - Compras y gastos (costo de venta)
 * 10 - Adquisiciones de activos
 * 11 - Gastos de seguros
 */

export const CATEGORIAS_606 = {
    "01": "Gastos de Personal",
    "02": "Servicios y Suministros",
    "03": "Arrendamientos",
    "04": "Activos Fijos",
    "05": "Representación",
    "06": "Otras Deducciones",
    "07": "Gastos Financieros",
    "08": "Gastos Extraordinarios",
    "09": "Costo de Ventas",
    "10": "Adquisición de Activos",
    "11": "Seguros",
};

// Patrones de empresas dominicanas conocidas → categoría DGII
const PATRONES = [
    // ─── SECCIÓN SALUD Y MÉDICA (Critical para PAMI) (02/09) ──────────
    { match: /amadita|referencia|patria rivas|laboratorio/i, cat: "02", label: "Servicios de Laboratorio" },
    { match: /hospiten|corazones unidos|cedimat|sued|macrotech/i, cat: "09", label: "Insumos/Servicios Médicos" },
    { match: /rowe|feltrex|infaca|fargesa|bionuclear/i, cat: "09", label: "Suplidor Médico/Farmacéutico" },
    { match: /los hidalgos|gbc|carol|farmacia union|medicament/i, cat: "09", label: "Farmacia/Insumos" },
    { match: /odontolo|dental|implante/i, cat: "09", label: "Insumos Dentales" },
    { match: /salud|clinica|centro medico/i, cat: "02", label: "Servicios Médicos" },

    // ─── SUPERMERCADOS / MAYORISTAS (09) ──────────────────────────────
    { match: /price ?smart|sirena|jumbo|nacional|bravo/i, cat: "09", label: "Supermercado/Mayorista", rnc: /101001576/ },
    { match: /plaza lama|carrefour|ole|aprezi?o|garrido/i, cat: "09", label: "Supermercado/Retail" },
    { match: /supermercado|colmado|hipermercado/i, cat: "09", label: "Supermercado/Alimentos" },

    // ─── RESTAURANTES / PLATAFORMAS DE COMIDA (05) ────────────────────
    { match: /pedidos ?ya|uber ?eats|delivery/i, cat: "05", label: "Representación (Delivery)" },
    { match: /wendy|macdonald|mcdonald|burger king|kfc/i, cat: "05", label: "Representación (Comida Rápida)" },
    { match: /pizzarelli|domino|pizza hut|papa john/i, cat: "05", label: "Representación (Comida Rápida)" },
    { match: /chef pepper|adrian tropical|sbg|peperoni|laurel/i, cat: "05", label: "Representación (Restaurante)" },
    { match: /panaderia|reposteria|pasteleria|cafe|starbucks/i, cat: "05", label: "Representación (Dieta)" },
    { match: /restaurant|hotel|catering|evento/i, cat: "05", label: "Gastos de Representación" },

    // ─── TELECOMUNICACIONES / TECNOLOGÍA (02) ─────────────────────────
    { match: /claro|codetel|tricom/i, cat: "02", label: "Telecomunicaciones (Claro)", rnc: /101001576/ },
    { match: /altice/i, cat: "02", label: "Telecomunicaciones (Altice)", rnc: /101004664/ },
    { match: /viva|wind|starlink/i, cat: "02", label: "Telecomunicaciones" },
    { match: /cecomsa|omega tech|punto mac|ism|tecnolog|tech|redes|software|sistemas|informat|soluciones/i, cat: "02", label: "Equipos/Software/IT" },
    { match: /microsoft|google|aws|amazon web|adobe|zoom|apple/i, cat: "02", label: "Suscripciones Digitales" },

    // ─── FINANCIERO Y BANCOS VÁLIDOS EN RD (07) ───────────────────────
    { match: /banco popular|bpd/i, cat: "07", label: "Comisiones Bancarias (BPD)", rnc: /101010091/ },
    { match: /banreservas|banco de reservas/i, cat: "07", label: "Comisiones Bancarias (Reservas)", rnc: /101000103/ },
    { match: /bhd|scotiabank|promerica|santa cruz|bdi|qik/i, cat: "07", label: "Comisiones Bancarias" },
    { match: /apap|cibao|la nacional|asociacion popular/i, cat: "07", label: "Servicios Financieros" },
    { match: /cardnet|azul|viso|mastercard|amex|stripe|paypal/i, cat: "07", label: "Procesamiento de Tarjetas" },
    { match: /prestamo|hipoteca|credito|interes|financiero/i, cat: "07", label: "Gastos Financieros" },

    // ─── COURIER Y MENSAJERÍA LOGÍSTICA (02) ──────────────────────────
    { match: /eps|bmcargo|vimenpaq|aeropaq|cps|domex|pick.?n.?send/i, cat: "02", label: "Servicios Courier (Envios)" },
    { match: /caribe express|dhl|fedex|ups/i, cat: "02", label: "Envíos / Paquetería" },
    { match: /uber.*trip|taxi|taxis/i, cat: "02", label: "Transporte / Viajes" },
    
    // ─── ELECTRICIDAD, AGUA, BASURA (02) ──────────────────────────────
    { match: /edesur/i, cat: "02", label: "Energía Eléctrica (Edesur)", rnc: /101824147/ },
    { match: /edenorte/i, cat: "02", label: "Energía Eléctrica (Edenorte)", rnc: /101850121/ },
    { match: /edeeste/i, cat: "02", label: "Energía Eléctrica (Edeeste)", rnc: /101824147/ },
    { match: /cepm|electricidad|luz/i, cat: "02", label: "Energía Eléctrica" },
    { match: /caasd|coraasan|inapa|agua potable/i, cat: "02", label: "Agua/Servicios Básicos" },

    // ─── GASOLINA / VEHÍCULOS / TALLERES / FERRETERÍA (09 / 02) ────────────────────
    { match: /sunix|total|shell|texaco|nativa|next|chevron|propagas|gas natural|glp|diesel/i, cat: "09", label: "Combustible" },
    { match: /ferreteria|bellon|hach[eé]|americano|cinco casas|epa|ferrimarket/i, cat: "02", label: "Mantenimiento / Suministros" },
    { match: /delta comercial|santo domingo motors|viamar/i, cat: "10", label: "Activos/Vehículos" },
    { match: /autozona|repuesto|goma|taller|mecanic/i, cat: "02", label: "Reparación/Mantenimiento" },

    // ─── SEGURIDAD / PUBLICIDAD / PROFESIONALES (02) ──────────────────
    { match: /seguridad|prosegur|guardianes/i, cat: "02", label: "Servicios de Seguridad" },
    { match: /publicid|imprenta|copy|marketing|social media/i, cat: "02", label: "Publicidad / Diseño" },
    { match: /consultor|abogado|asesor|audit|estudio juri/i, cat: "02", label: "Servicios Profesionales" },
    { match: /papelera|suministro|foficina|bolsas/i, cat: "02", label: "Suministros de Oficina" },

    // ─── ESTADO E IMPUESTOS (06) ──────────────────────────────────────
    { match: /dgii|direccion general de impuestos/i, cat: "06", label: "Impuestos DGII", rnc: /101002238/ },
    { match: /tesoreria|tss/i, cat: "06", label: "TSS / Seguridad Social" },
    { match: /infotep|ayuntamiento|pasaporte|jce/i, cat: "06", label: "Tasas Gubernamentales" },
    { match: /asociacion|camara de comercio|sindicato|cooperativa/i, cat: "06", label: "Aportes / Asociaciones" },

    // ─── SEGUROS Y ARS (11) ───────────────────────────────────────────
    { match: /mapfre|ars|universal|senasa|primera|reservas vital/i, cat: "11", label: "Seguro de Salud / ARS" },
    { match: /seguros?|insurance/i, cat: "11", label: "Seguros Generales" },

    // ─── PERSONAL / CÁLCULO DE NÓMINA (01) ────────────────────────────
    { match: /nomina|salario|sueldo|empleado/i, cat: "01", label: "Gastos de Personal" },

    // ─── ALQUILER (03) ────────────────────────────────────────────────
    { match: /alquiler|renta|arrendamiento|lease/i, cat: "03", label: "Arrendamientos" },

    // ─── DEPRECIACIÓN / ACTIVOS FIJOS GENERAL (04) ────────────────────
    { match: /depreciacion|amortizacion/i, cat: "04", label: "Depreciación Activos" },
];

const STORAGE_KEY = "fluxia_cat_overrides";

function getOverrides() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
        return {};
    }
}

/**
 * Sugiere una categoría DGII para una factura dado su emisor y RNC
 * @param {string} emisor - Nombre del emisor
 * @param {string} rnc - RNC del emisor (opcional)
 * @returns {{ code: string, label: string, confidence: number, source: string }}
 */
export function suggestCategory(emisor = "", rnc = "") {
    if (!emisor && !rnc) return null;

    const cleanEmp = (emisor || "").trim().toLowerCase();
    const cleanRNC = (rnc || "").toString().replace(/[^0-9]/g, "");

    // 1. Revisar overrides del usuario (aprendizaje local) - Prioridad Máxima
    const overrides = getOverrides();
    // Intentar por RNC primero si existe
    if (cleanRNC && overrides[cleanRNC]) {
        const ov = overrides[cleanRNC];
        return { code: ov.code, label: CATEGORIAS_606[ov.code] || ov.label, confidence: 100, source: "usuario" };
    }
    // Luego por emisor
    if (cleanEmp && overrides[cleanEmp]) {
        const ov = overrides[cleanEmp];
        return { code: ov.code, label: CATEGORIAS_606[ov.code] || ov.label, confidence: 100, source: "usuario" };
    }

    // 2. Buscar en patrones conocidos
    for (const patron of PATRONES) {
        // Coincidencia por RNC (Confianza Alta)
        if (cleanRNC && patron.rnc && patron.rnc.test(cleanRNC)) {
            return { code: patron.cat, label: patron.label, confidence: 98, source: "ia-rnc" };
        }
        // Coincidencia por Nombre (Confianza Media)
        if (cleanEmp && patron.match.test(cleanEmp)) {
            return { code: patron.cat, label: patron.label, confidence: 87, source: "ia-local" };
        }
    }

    // 3. Heurísticas simples por palabras clave genéricas
    if (cleanEmp.includes("srl") || cleanEmp.includes("sa") || cleanEmp.includes("eirl")) {
        return { code: "02", label: "Servicios Corporativos", confidence: 45, source: "heurística" };
    }

    return null; // Sin sugerencia
}

/**
 * Aprende la preferencia del usuario para un emisor específico
 * @param {string} emisor - Nombre del emisor
 * @param {string} rnc - RNC del emisor
 * @param {string} code - Código de categoría elegido
 */
export function learnCategory(emisor, rnc, code) {
    const overrides = getOverrides();
    const data = { code, label: CATEGORIAS_606[code] || code, ts: Date.now() };
    
    if (emisor) overrides[emisor.trim().toLowerCase()] = data;
    if (rnc) {
        const cleanRNC = rnc.toString().replace(/[^0-9]/g, "");
        if (cleanRNC) overrides[cleanRNC] = data;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}


/**
 * Retorna el color visual de confianza de la sugerencia
 */
export function getConfidenceColor(confidence) {
    if (confidence >= 95) return "#3b82f6"; // Azul (RNC Exacto)
    if (confidence >= 85) return "#22c55e"; // Verde (Patrón Nombre)
    if (confidence >= 60) return "#f59e0b"; // Naranja
    return "#94a3b8";                        // Gris
}

