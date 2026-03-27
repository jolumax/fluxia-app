# FLUXIA — Contexto Completo v5 (Mar 19, 2026)

## Proyecto
SaaS de digitalización de facturas dominicanas (OCR) con gestión multicliente para contadores.  
Stack: **n8n Cloud · Supabase · Airtable · Google Drive · Telegram · Whop · Vercel · React (Vite)**

---

## URLs de Producción

| Servicio | URL |
|----------|-----|
| App frontend | https://fluxia-app-teal.vercel.app |
| n8n instance | **csds.app.n8n.cloud** ← (cambió de jolumax) |
| GitHub repo | github.com/jolumax/fluxia-app |

---

## Credenciales de Producción

| Variable | Valor |
|----------|-------|
| Supabase URL | https://apuxpnlcycsfuhaedagk.supabase.co |
| Supabase ANON KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwdXhwbmxjeWNzZnVoYWVkYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTY4NjgsImV4cCI6MjA4ODc3Mjg2OH0.6-LwyQ1bUvwbm3geDhpBJi2k6ChcgBQfktMwhYd9G7M |
| Auth UID usuario prueba | 32065b1f-c5b4-4a23-a96d-b6a310de5d4e |
| Email usuario prueba | jatasoy519@indevgo.com |
| Drive Folder ID raíz | 1PgkAJbmqkxm8hYgWhGal_kwR-_vaFVmL |
| Airtable Base | appPfkS3Gi2CJEDuG |
| Airtable Table | tbl7XkZpew0ZU64rG |
| Telegram Chat ID | 7192815138 |
| Telegram Bot Token | 8783605609:AAGj3Z4yYfrZVPyhAXoCfFWdV4C5UUa9z3I |

---

## Whop (reemplaza Stripe — ACTIVO)

| Variable | Valor |
|----------|-------|
| Webhook Secret | ws_43cc50fc146f9cbb5907ca9a469107ac9d490e8fc167a08504095a2af9ad62f7 |
| Webhook URL (n8n) | https://csds.app.n8n.cloud/webhook/fluxia/whop/webhook |
| Basic Product ID | prod_TBwVPWE8Fa3Pa |
| Pro Product ID | prod_diB0yzJQ2xq5M |
| Premium Product ID | prod_ZEDwjwk374Dpy |
| Basic Checkout | https://whop.com/checkout/plan_RrfZ9FAZn65kx |
| Pro Checkout | https://whop.com/checkout/plan_ldaj8xJ6vh51X |
| Premium Checkout | https://whop.com/checkout/plan_gDhFpP4VsnImM |

### Planes y Precios

| Plan | Precio | Créditos/mes |
|------|--------|--------------|
| Basic | $25.00/mes | 200 facturas |
| Pro | $56.00/mes | 500 facturas |
| Premium | $129.99/mes | 3,000 facturas |

### Eventos Whop → n8n

| Evento Whop | Acción |
|-------------|--------|
| `membership.went_valid` | Activar/actualizar plan |
| `membership.went_invalid` | Downgrade a Basic |
| `membership.was_renewed` | Renovar créditos |
| `membership.was_deleted` | Downgrade a Basic |

> **Stripe**: desactivado — bloque existe en workflow pero inactivo. Columnas `stripe_*` en Supabase almacenan IDs de Whop (no se renombraron para evitar migraciones).

---

## Variables de Entorno (.env.local y Vercel)

```env
VITE_SUPABASE_URL=https://apuxpnlcycsfuhaedagk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_N8N_WEBHOOK=https://csds.app.n8n.cloud/webhook/fluxia/procesar-factura
VITE_AIRTABLE_TOKEN=patXXXXXXXXXXXXXX
VITE_AIRTABLE_BASE_ID=appPfkS3Gi2CJEDuG
VITE_AIRTABLE_TABLE_ID=tbl7XkZpew0ZU64rG
```

⚠️ La URL de n8n cambió de `jolumax.app.n8n.cloud` a `csds.app.n8n.cloud`. Actualizar en Vercel.

---

## Tablas Supabase

### `usuarios`
`id, email, nombre, empresa, rnc_empresa, rol, telegram_chat_id, activo, creado_en, actualizado_en`

### `config_clientes`
`id, user_id, plan, creditos_usados, creditos_limite, fecha_renovacion, folder_drive_id, spreadsheet_id, airtable_base_id, airtable_table_id, telegram_chat_id, notif_canal, stripe_customer_id, stripe_subscription_id, stripe_price_id, openai_key, prompt_personalizado, creado_en, actualizado_en`

### `config_clientes_multi` ← Multicliente
`id, user_id, nombre, rnc, drive_folder_id, creado_en`  
Almacena los clientes del contador. El campo `rnc` se usa para aislar facturas por cliente.

### `config_agente`
`id, user_id, nombre_negocio, nombre_agente, direccion, telefono, servicios_json, horarios_json, empleados_json, airtable_base_id, airtable_citas_table_id, prompt_personalizado, creado_en, actualizado_en`

> **FK importante**: `config_clientes.user_id` y `config_agente.user_id` tienen FK a `usuarios.id`. Para cambiar IDs usar DELETE + INSERT (DISABLE TRIGGER no funciona en Supabase con rol postgres).

---

## Campos Airtable (tabla `facturas`)

`user_id, request_id, Fecha de Factura (fecha), Emisor, ID Fiscal (id_fiscal), factura, ncf, NCF Válido (ncf_valido), Tipo de NCF (ncf_tipo), ITBIS, Subtotal, Total, Concepto, Archivo de Factura (drive_file_id), Procesado en (procesado_en), status, rnc_empresa`

`rnc_empresa` = RNC del cliente al que pertenece la factura. Vacío = pertenece al contador principal.

---

## Arquitectura Frontend

Frontend **completamente modularizado** (no monolítico):

```
src/
├── App.jsx                    ← Entry point + lógica de routing
├── lib/
│   ├── supabase.js            ← createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
│   ├── icons.js               ← Todas las SVG paths
│   └── constants.js           ← WHOP_CHECKOUTS, PLAN_INFO, WHOP_PRODUCT_IDS, CATEGORIES_606
├── hooks/
│   ├── useSession.js          ← supabase.auth + onAuthStateChange
│   ├── useCredits.js          ← config_clientes desde Supabase
│   ├── useClients.js          ← config_clientes_multi
│   └── useAirtableInvoices.js ← Facturas desde Airtable API
├── components/
│   ├── common/Icon.jsx
│   ├── Sidebar.jsx
│   ├── Topbar.jsx             ← Selector de cliente activo
│   ├── Dashboard.jsx          ← KPIs reales desde Airtable
│   ├── ProcesarArchivos.jsx   ← Upload → n8n + modal auditoría + deleteAirtableRecord
│   ├── Estadisticas.jsx
│   ├── DriveView.jsx
│   ├── SheetsView.jsx         ← Botones DGII 606 oficial + Consulta RNC
│   ├── ClientsView.jsx        ← CRUD clientes multicliente
│   ├── Configuracion.jsx      ← Tabs: Cuenta, Notificaciones, API/IA
│   ├── Reporteria.jsx         ← Exportar 606
│   ├── LoginScreen.jsx
│   └── Onboarding.jsx         ← 3 pasos: empresa → plan → Whop
├── utils/
│   ├── sanitize.js            ← sanitizeName, sanitizeRNC, sanitizePlan, sanitizeUUID
│   └── airtableActions.js     ← updateInvoiceInAirtable, deleteInvoiceFromAirtable
└── styles/
    └── App.css
```

### Flujo Auth / Onboarding

```
useSession() → undefined: spinner
            → null: LoginScreen
            → session + credits === null: Onboarding
            → session + credits: App normal
```

Onboarding 3 pasos:
1. Datos empresa (nombre, RNC) → crea `usuarios` + `config_clientes` en Supabase
2. Selección de plan → redirect a Whop checkout con `?redirect_url=origin?plan=X&id=UUID`
3. Retorno de Whop → App detecta params → PATCH `config_clientes` con plan + créditos

```js
// Detección retorno Whop en App.jsx
const params = new URLSearchParams(window.location.search);
const planParam = sanitizePlan(params.get("plan"));
const idParam = sanitizeUUID(params.get("id"));
if (planParam && idParam === userId) {
    // PATCH config_clientes → actualizar plan
    window.history.replaceState({}, "", "/");
}
```

### Lógica de aislamiento multicliente

```js
// displayInvoices en App.jsx
if (!selectedClient) {
    // "Tú" = facturas sin rnc_empresa (del contador)
    return invoices.filter(inv => !inv.rnc_empresa || inv.rnc_empresa === "");
}
// Cliente = facturas con su RNC específico
return invoices.filter(inv =>
    inv.rnc_empresa.replace(/\D/g,"") === selectedClient.rnc.replace(/\D/g,"")
);
```

### processWithN8n — Payload enviado

```js
{
  user_id: userId,
  file_base64: base64Raw,          // sin prefijo data:image
  file_name: file.name,
  audit_mode: true,
  rnc_empresa: selectedClient?.rnc || "",
  drive_folder_id: selectedClient?.drive_folder_id || credits?.folder_drive_id || ""
}
```

### deleteAirtableRecord — Rechazar auditoría

Busca por `request_id` primero, luego por NCF+user_id como fallback.
Elimina el registro de Airtable si el usuario rechaza en el modal de auditoría.
Requiere `VITE_AIRTABLE_TOKEN` configurado.

### Notas técnicas importantes

- **Hook order**: Todos los hooks deben llamarse ANTES de cualquier `return` condicional en App. Error React #310 ocurre si no.
- **Emisor como objeto**: El OCR a veces devuelve `emisor` como `{nombre: "..."}`. Se normaliza con: `typeof inv.emisor === 'object' ? inv.emisor?.nombre ?? ... : inv.emisor`

---

## Arquitectura n8n

**Instancia:** csds.app.n8n.cloud  
**Workflow activo:** `FLUXIA — Cloud` (v27 / archivo local: FLUXIA_v26b_CLOUD.json)

### [CANAL 1] OCR Webhook (desde frontend)

```
🌐 Webhook /fluxia/procesar-factura
→ ✅ Validar Payload Entrante     ← action, user_id, file_base64, rnc_empresa, drive_folder_id
→ 🗄️ Obtener Config del Usuario (Supabase)
→ 🔍 ¿Usuario existe y tiene créditos?
→ 🔀 Switch — Enrutar por Plan (premium / pro / basic)
→ 🔄 Convertir Base64 a Binario
→ 📤 Subir Imagen Temp (Drive)
→ 🔓 Hacer Público (Drive)
→ 🤖 Preparar Body OCR
→ 🤖 Analyze Image (GPT-4o-mini OCR)
→ ⚙️ Normalizar + Validar NCF (DGII)
→ 🔄 Detectar Duplicados (Airtable)
→ 🚦 ¿Es Duplicado?
→ 📎 Preparar Binario para Drive
→ 🔒 ¿Plan permite Drive?         ← true(pro/premium)→Drive | false(basic)→skip
    true  → 💾 Guardar en Drive del Usuario
    false → [salta Drive]
→ 📋 Preparar Campos Airtable     ← incluye rnc_empresa
→ 📊 Guardar en Airtable (Multi-Tenant)
→ 🔢 Leer Créditos Actuales
→ 🔢 Incrementar Créditos Usados
→ 🔀 ¿Canal Telegram?
    false → 📤 Preparar Respuesta Éxito → ✅ Respond to Webhook — Éxito
    true  → 📱 Notificar Éxito (Telegram)
```

### [CANAL 2] OCR Telegram (desde bot)

```
📱 Telegram — Recibir Foto
→ ✅ Validar Foto Telegram → 🔀 ¿Es Foto Válida?
→ 🔗 Obtener URL Archivo → ⬇️ Preparar Descarga → 📥 Descargar Imagen
→ 🔄 Convertir a Base64
→ 🔍 Buscar Usuario por Chat ID (Supabase)
→ 📋 Preparar Payload
→ [continúa flujo OCR compartido desde Convertir Base64 a Binario]
```

### [CANAL 3] Exportar 606

```
🌐 Webhook /fluxia/exportar-606
→ ✅ Validar Parámetros
→ 🗄️ Obtener Config Usuario
→ 📋 Obtener Facturas del Mes (Airtable)
→ 📊 Generar Excel Clon 606 (Mejorado)
→ ✅ Descargar Excel en Fluxia
```

### [CANAL 4] Whop Payments (⏳ pendiente importar en n8n)

```
🌐 Webhook /fluxia/whop/webhook
→ 🔐 Verificar Firma Whop (HMAC-SHA256)
→ 🔀 Switch — Tipo de Evento Whop:
    went_valid / was_renewed → 🔍 Buscar Usuario por Email
                             → ✅ Activar/Actualizar Plan (Supabase)
                             → 🎉 Notificar Telegram
    went_invalid / was_deleted → 🔍 Buscar Usuario
                               → ⬇️ Downgrade a Plan Basic
                               → ⚠️ Alertar Telegram
→ ✅ Responder a Whop (200 OK)
```

### [ERROR HANDLER]

```
Cualquier nodo con On Error: Continue (using error output)
→ 🔴 Error Handler Global
→ ❌ Respond to Webhook — Error (400)
```

### Respuesta Webhook de Éxito

Nodo `📤 Preparar Respuesta Éxito` (Code node) excluye `ocr_raw` y devuelve:

```json
{
  "status": "success",
  "request_id": "REQ-TIMESTAMP-USERID",
  "invoice": {
    "emisor": "string normalizado",
    "cliente": "...",
    "id_fiscal_emisor": "RNC: XXX-XXXXX-X",
    "ncf": "B01XXXXXXXX",
    "ncf_validacion": { "valid": true, "tipo_nombre": "Crédito Fiscal" },
    "fecha_emision": "YYYY-MM-DD",
    "subtotal": 0.00,
    "itbis": 0.00,
    "total": 0.00,
    "moneda": "RD$",
    "concepto": "..."
  }
}
```

El `Respond to Webhook — Éxito` usa:
```
={{ JSON.stringify({status: $json.status, request_id: $json.request_id, invoice: $json.invoice}) }}
```

### Notas técnicas n8n importantes

- **`¿Canal Telegram?`**: usa `$('📋 Preparar Payload').isExecuted` para distinguir canal. Chat_id: `$if(isExecuted, _tg_chat_id, supabase_telegram_chat_id)`
- **Error Handler**: conectado via `On Error: Continue (using error output)`, NO en paralelo (bug anterior corregido)
- **`¿Plan permite Drive?`**: condición `plan is not equal to basic` — Basic salta Drive, va directo a Airtable
- **`rnc_empresa`** en `Preparar Campos Airtable`: `$('✅ Validar Payload Entrante').first().json.rnc_empresa ?? ''`

---

## Lógica de Planes

| Feature | Basic ($25) | Pro ($56) | Premium ($129) |
|---------|:-----------:|:---------:|:--------------:|
| OCR facturas | ✅ 200/mes | ✅ 500/mes | ✅ 3,000/mes |
| Guardar en Airtable | ✅ | ✅ | ✅ |
| Guardar en Drive | ❌ | ✅ | ✅ |
| Notificaciones Telegram | ✅ | ✅ | ✅ |
| Exportar 606 | ✅ | ✅ | ✅ |
| Multicliente | ✅ | ✅ | ✅ |
| Carpetas Drive por cliente | ❌ | ✅ | ✅ |
| Prompt personalizado OCR | ❌ | ✅ | ✅ |

---

## Estado de Features — Mar 19, 2026

### ✅ Completado

| Feature | Notas |
|---------|-------|
| Auth Supabase (login/logout/reset) | Real con Supabase |
| OCR con GPT-4o-mini | End-to-end funcionando |
| Modal de auditoría con datos reales | Emisor normalizado de objeto a string |
| Rechazar → elimina registro Airtable | Por request_id, fallback por NCF |
| Multicliente aislado por RNC | `rnc_empresa` en cada factura |
| Dashboard reactivo por cliente | Auto-reload al cambiar cliente |
| Drive bloqueado para plan Basic | Nodo IF en n8n |
| Configuración Cuenta (RNC) | Guarda en `usuarios.rnc_empresa` |
| Configuración Notificaciones (Telegram) | Guarda en `config_clientes` |
| Configuración API (OpenAI key/prompt) | Guarda en `config_clientes` |
| Exportar formato 606 DGII | Excel desde n8n |
| Botón plantilla oficial DGII 606 | Link a dgii.gov.do |
| Botón Consulta RNC DGII | Link a dgii.gov.do |
| Onboarding → Whop | 3 pasos funcionales |
| Deploy en Vercel (producción) | fluxia-app-teal.vercel.app |
| Telegram Bot OCR | Funciona independiente |
| Stripe → Whop migración | Whop configurado, Stripe inactivo |
| Frontend modularizado | hooks / components / utils separados |

### ⏳ Pendiente

1. **Importar bloque Whop en n8n** — archivo `FLUXIA_Whop_Webhook_Block.json` listo
2. **Configurar eventos Whop** — Whop Dashboard → Desarrollador → Webhooks → 4 eventos
3. **Probar flujo completo Whop** — pago de prueba → webhook → activación Supabase
4. **VITE_AIRTABLE_TOKEN en Vercel** — necesario para Rechazar en producción
5. **Carpetas Drive automáticas por cliente** — crear carpeta al registrar cliente Pro/Premium
6. **Fix NCF Inválido** — OCR lee `B01` como `801` en algunas imágenes. Mejorar prompt
7. **Dashboard histórico mensual** — actualmente solo muestra mes actual
8. **KPIs Dashboard** — algunos valores aún estáticos

---

## Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `FLUXIA_v26b_CLOUD.json` | Flujo n8n actual con lógica Drive por plan |
| `FLUXIA_Whop_Webhook_Block.json` | Bloque Whop listo para importar en n8n |
| `src/App.jsx` | Entry point React |
| `src/lib/constants.js` | WHOP_CHECKOUTS, PLAN_INFO, CATEGORIES_606 |
| `src/components/Onboarding.jsx` | 3 pasos empresa → plan → Whop |
| `src/utils/airtableActions.js` | CRUD facturas en Airtable |
| `.env.local` | Variables de entorno locales |
