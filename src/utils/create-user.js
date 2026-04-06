import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURACIÓN DE RUTAS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("\n❌ ERROR: Faltan credenciales.");
    console.log("Asegúrate de configurar estas variables en tu archivo .env.local:");
    console.log("VITE_SUPABASE_URL=...");
    console.log("SUPABASE_SERVICE_ROLE_KEY=... (consíguela en Supabase Dashboard > Settings > API)");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

/**
 * Función Maestra para crear el usuario completo en Fluxia
 */
async function crearNuevoCliente(email, password, nombre, rnc, plan = 'basic') {
    console.log(`\n🚀 Iniciando proceso para: ${email}...`);

    // 1. Crear en Auth (Confirmado automáticamente)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
    });

    if (authError) {
        console.error("❌ Error en Auth:", authError.message);
        return;
    }

    const userId = authData.user.id;
    console.log("✅ Usuario creado en Auth. ID:", userId);

    // 2. Crear Perfil Público en la tabla 'usuarios'
    // El trigger trigger_crear_perfil_publico podría ya estar haciendo esto si existe,
    // pero lo hacemos manual para asegurar la vinculación.
    const { error: profileError } = await supabase.from('usuarios').upsert([{
        id: userId,
        email: email,
        nombre: nombre,
        empresa: nombre,
        rnc_empresa: rnc,
        rol: 'admin',
        activo: true
    }]);

    if (profileError) {
        console.error("⚠️ Error en Perfil (usuarios):", profileError.message);
    } else {
        console.log("✅ Perfil público registrado con éxito.");
    }

    // 3. Crear Configuración (Plan y Créditos)
    const limites = { 'basic': 150, 'pro': 500, 'premium': 2500 };
    const limiteCreditos = limites[plan.toLowerCase()] || 150;

    const { error: configError } = await supabase.from('config_clientes').upsert([{
        user_id: userId,
        plan: plan.toLowerCase(),
        creditos_usados: 0,
        creditos_limite: limiteCreditos,
        fecha_renovacion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }], { onConflict: 'user_id' });

    if (configError) {
        console.error("⚠️ Error en Configuración (config_clientes):", configError.message);
    } else {
        console.log(`✅ Plan ${plan.toUpperCase()} asignado (${limiteCreditos} créditos).`);
    }

    console.log("\n✨ USUARIO CREADO CON ÉXITO. El cliente ya puede loguearse.");
}

// --- CAPTURA DE ARGUMENTOS DESDE TERMINAL ---
const args = process.argv.slice(2);
if (args.length < 4) {
    console.log(`
📖 MODO DE USO:
node src/utils/create-user.js <email> <password> <nombre> <rnc> [plan]

Ejemplos:
node src/utils/create-user.js "test@admin.com" "SuperSeguro123" "Empresa Nueva" "101888999" "pro"

Planes disponibles: basic, pro, premium (Default: basic)
    `);
} else {
    const [uEmail, uPass, uNombre, uRnc, uPlan = 'basic'] = args;
    crearNuevoCliente(uEmail, uPass, uNombre, uRnc, uPlan);
}
