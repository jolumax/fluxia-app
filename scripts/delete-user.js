import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURACIÓN DE RUTAS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("\n❌ ERROR: Faltan credenciales en .env.local.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function borrarUsuarioFull(email) {
    console.log(`\n🔍 Buscando usuario: ${email}...`);

    // 1. Obtener el ID del usuario por email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error("❌ Error listando usuarios:", listError.message);
        return;
    }

    const user = users.find(u => u.email === email);
    if (!user) {
        console.error("❌ No se encontró ningún usuario con ese email.");
        return;
    }

    const userId = user.id;
    console.log(`✅ Usuario encontrado (ID: ${userId}). Iniciando limpieza...`);

    // 2. Borrar datos de las tablas públicas (opcional si hay cascade, pero seguro si no)
    // Borramos en orden para evitar errores de integridad (dependientes primero)
    console.log("🧹 Borrando registros en tablas públicas...");
    
    await supabase.from('config_clientes_multi').delete().eq('user_id', userId);
    await supabase.from('config_clientes').delete().eq('user_id', userId);
    await supabase.from('facturas').delete().eq('user_id', userId);
    await supabase.from('usuarios').delete().eq('id', userId);

    // 3. Borrar de AUTH (Sistema de login)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
        console.error("❌ Error borrando de Auth:", authDeleteError.message);
    } else {
        console.log(`\n✨ ELIMINACIÓN EXITOSA: ${email} ha sido borrado completamente.`);
    }
}

// --- CAPTURA DE ARGUMENTOS ---
const args = process.argv.slice(2);
if (args.length < 1) {
    console.log(`
📖 MODO DE USO:
node src/utils/delete-user.js <email>

Ejemplo:
node src/utils/delete-user.js "marcos@fluxia.com"
    `);
} else {
    borrarUsuarioFull(args[0]);
}
