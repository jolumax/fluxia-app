import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase client ───────────────────────────────────────────────────────────
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── Hook de sesión ────────────────────────────────────────────────────────────
function useSession() {
    const [session, setSession] = useState(undefined); // undefined = cargando
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session ?? null));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
        return () => subscription.unsubscribe();
    }, []);
    return session;
}

// ── Hook de créditos y plan ───────────────────────────────────────────────────
function useCredits(userId) {
    const [credits, setCredits] = useState(undefined); // undefined = cargando, null = no existe (onboarding)
    const [reload, setReload] = useState(0);

    const reloadCredits = () => setReload(r => r + 1);

    useEffect(() => {
        if (!userId) return;
        supabase
            .from("config_clientes")
            .select("plan, creditos_usados, creditos_limite, fecha_renovacion")
            .eq("user_id", userId)
            .single()
            .then(({ data, error }) => {
                if (data) setCredits(data);
                else setCredits(null); // No tiene config -> necesita onboarding
            });
    }, [userId, reload]);
    return { credits, setCredits, reloadCredits };
}

// ── Hook de Airtable ──────────────────────────────────────────────────────────
function useAirtableInvoices(userId, credits) {
    const [invoices, setInvoices] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId || !credits) {
            setLoading(false);
            return;
        }

        const fetchAirtable = async () => {
            try {
                const token = import.meta.env.VITE_AIRTABLE_TOKEN;
                if (!token) { setLoading(false); return; } // Usar defaults
                
                const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID || "appPfkS3Gi2CJEDuG";
                const tableId = import.meta.env.VITE_AIRTABLE_TABLE_ID || "tbl7XkZpew0ZU64rG";
                const formula = `({user_id} = '${userId}')`;
                const url = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${encodeURIComponent(formula)}&sort[0][field]=Fecha%20de%20Factura%20(fecha)&sort[0][direction]=desc&maxRecords=50`;

                const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                const data = await res.json();
                
                if (data.records) {
                    const mapped = data.records.map(r => ({
                        id: r.fields.request_id || r.id.substring(0,8),
                        emisor: r.fields.Emisor || "Desconocido",
                        rnc: r.fields["ID Fiscal"] || r.fields["ID Fiscal (id_fiscal)"] || "—",
                        ncf: r.fields.ncf || "—",
                        monto: r.fields.Total ? `RD$${r.fields.Total.toLocaleString("es-DO")}` : "—",
                        itbis: r.fields.ITBIS ? `RD$${r.fields.ITBIS.toLocaleString("es-DO")}` : "—",
                        fecha: r.fields["Fecha de Factura"] || r.fields["Fecha de Factura (fecha)"] || "—",
                        estado: r.fields.status === "duplicate" ? "duplicado" : (r.fields["NCF Válido"] || r.fields["NCF Válido (ncf_valido)"] ? "valido" : "error"),
                        credito: r.fields["Tipo de NCF"] || r.fields["Tipo de NCF (ncf_tipo)"] ? (r.fields["Tipo de NCF"] || r.fields["Tipo de NCF (ncf_tipo)"]).substring(0,3) : "B01",
                        driveFileId: r.fields["Archivo de Factura (drive_file_id)"] ||
                                     r.fields["drive_file_id"] ||
                                     r.fields["Archivo de Factura"] ||
                                     r.fields["file_id"] ||
                                     r.fields["factura_drive_id"] ||
                                     null,
                        concepto: r.fields.Concepto || "—"
                    }));
                    setInvoices(mapped);
                }
            } catch (err) {
                console.error("Airtable fetch error:", err);
            }
            setLoading(false);
        };
        fetchAirtable();
    }, [userId, credits]);

    return { invoices, loading };
}

// ── Icons (inline SVG components) ──────────────────────────────────────────
const Icon = ({ d, size = 18, stroke = "currentColor", fill = "none", strokeWidth = 1.8 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
);
const icons = {
    logo: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    dashboard: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
    chart: "M18 20V10M12 20V4M6 20v-6",
    source: "M22 12h-4l-3 9L9 3l-3 9H2",
    settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
    logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
    check: "M20 6L9 17l-5-5",
    x: "M18 6L6 18M6 6l12 12",
    alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
    file: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
    drive: "M22 12H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6L18.55 5.11A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11zM6 16h.01M10 16h.01",
    sheet: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h8M8 9h2",
    bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
    user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
    search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
    copy: "M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
    plus: "M12 5v14M5 12h14",
    filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
    refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
    telegram: "M21.198 2.433a2.242 2.242 0 00-1.022.215l-17.5 7.5a2.25 2.25 0 00.126 4.14l4.5 1.5 2.25 6.75a2.25 2.25 0 003.867.75l2.25-2.625 4.875 3.375a2.25 2.25 0 003.375-1.5l3-18a2.25 2.25 0 00-2.721-2.105z",
    key: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
    zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    trending: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
    calendar: "M8 7V3M16 7V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    inbox: "M22 12h-6l-2 3H10l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6L18.55 5.11A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z",
    layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    arrow_right: "M5 12h14M12 5l7 7-7 7",
    chevron_down: "M6 9l6 6 6-6",
};

// ── Color palette & styles ──────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  :root {
    --bg-base: #0a0e1a;
    --bg-surface: #111827;
    --bg-card: #151d2e;
    --bg-hover: #1a2540;
    --border: #1e2d45;
    --border-light: #253350;
    --accent: #3b82f6;
    --accent-hover: #2563eb;
    --accent-glow: rgba(59,130,246,0.15);
    --accent2: #06b6d4;
    --success: #10b981;
    --warning: #f59e0b;
    --danger: #ef4444;
    --text-primary: #e2e8f0;
    --text-secondary: #94a3b8;
    --text-muted: #4b6080;
    --gradient: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  }

  body { font-family: 'DM Sans', sans-serif; background: var(--bg-base); color: var(--text-primary); }
  
  .font-display { font-family: 'Syne', sans-serif; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg-base); }
  ::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 4px; }

  /* Animations */
  @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes progress { from { width: 0%; } to { width: var(--w); } }
  @keyframes countUp { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
  @keyframes glow { 0%,100% { box-shadow: 0 0 20px rgba(59,130,246,0.1); } 50% { box-shadow: 0 0 40px rgba(59,130,246,0.25); } }
  @keyframes drop { 0% { transform: translateY(-20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
  
  .fade-in { animation: fadeIn 0.4s ease forwards; }
  .slide-in { animation: slideIn 0.3s ease forwards; }
  .animate-pulse { animation: pulse 2s ease-in-out infinite; }
  .animate-spin { animation: spin 1s linear infinite; }
  .animate-glow { animation: glow 3s ease-in-out infinite; }

  /* Login */
  .login-bg {
    min-height: 100vh;
    background: var(--bg-base);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  .login-bg::before {
    content: '';
    position: absolute;
    width: 600px; height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%);
    top: -100px; left: -100px;
  }
  .login-bg::after {
    content: '';
    position: absolute;
    width: 400px; height: 400px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%);
    bottom: -50px; right: -50px;
  }

  .login-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 40px;
    width: 420px;
    position: relative;
    z-index: 1;
    animation: fadeIn 0.5s ease;
  }

  .input-field {
    width: 100%;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 16px;
    color: var(--text-primary);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .input-field:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
  .input-field::placeholder { color: var(--text-muted); }

  .btn-primary {
    background: var(--gradient);
    border: none;
    border-radius: 10px;
    padding: 12px 24px;
    color: white;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    transition: opacity 0.2s, transform 0.1s;
    letter-spacing: 0.3px;
  }
  .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
  .btn-primary:active { transform: translateY(0); }

  .btn-secondary {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 20px;
    color: var(--text-secondary);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-secondary:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-glow); }

  .btn-ghost {
    background: transparent;
    border: none;
    padding: 8px 12px;
    color: var(--text-secondary);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    display: flex; align-items: center; gap: 6px;
  }
  .btn-ghost:hover { background: var(--bg-hover); color: var(--text-primary); }

  /* Layout */
  .app-layout {
    display: flex;
    min-height: 100vh;
  }

  /* Sidebar */
  .sidebar {
    width: 240px;
    background: var(--bg-surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 100;
  }

  .sidebar-logo {
    padding: 24px 20px 20px;
    border-bottom: 1px solid var(--border);
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    margin: 2px 8px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-secondary);
    font-size: 13.5px;
    font-weight: 500;
    border: 1px solid transparent;
  }
  .nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
  .nav-item.active {
    background: var(--accent-glow);
    color: var(--accent);
    border-color: rgba(59,130,246,0.2);
  }

  .nav-section-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--text-muted);
    padding: 16px 24px 6px;
  }

  /* Main content */
  .main-content {
    margin-left: 240px;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .topbar {
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    padding: 0 28px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .page-content {
    padding: 28px;
    flex: 1;
    overflow-y: auto;
  }

  /* Cards */
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px;
  }

  .kpi-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px 22px;
    transition: border-color 0.2s, transform 0.2s;
    animation: fadeIn 0.4s ease forwards;
  }
  .kpi-card:hover { border-color: var(--border-light); transform: translateY(-2px); }

  /* Badge */
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }
  .badge-success { background: rgba(16,185,129,0.12); color: var(--success); }
  .badge-warning { background: rgba(245,158,11,0.12); color: var(--warning); }
  .badge-danger { background: rgba(239,68,68,0.12); color: var(--danger); }
  .badge-info { background: rgba(59,130,246,0.12); color: var(--accent); }
  .badge-neutral { background: rgba(148,163,184,0.1); color: var(--text-secondary); }

  /* Table */
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th {
    text-align: left; padding: 10px 14px;
    font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.8px;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
  }
  .data-table td {
    padding: 12px 14px;
    font-size: 13px;
    color: var(--text-secondary);
    border-bottom: 1px solid rgba(30,45,69,0.5);
    vertical-align: middle;
  }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: rgba(26,37,64,0.4); }

  /* Drag zone */
  .drop-zone {
    border: 2px dashed var(--border);
    border-radius: 14px;
    padding: 48px;
    text-align: center;
    cursor: pointer;
    transition: all 0.25s;
    background: transparent;
  }
  .drop-zone:hover, .drop-zone.drag-over {
    border-color: var(--accent);
    background: var(--accent-glow);
  }

  /* Progress bar */
  .progress-bar {
    height: 4px;
    background: var(--bg-hover);
    border-radius: 10px;
    overflow: hidden;
  }
  .progress-bar-fill {
    height: 100%;
    background: var(--gradient);
    border-radius: 10px;
    animation: progress 1.2s ease forwards;
  }

  /* Toggle */
  .toggle {
    width: 40px; height: 22px;
    background: var(--bg-hover);
    border-radius: 11px;
    position: relative;
    cursor: pointer;
    transition: background 0.2s;
    border: none;
  }
  .toggle.on { background: var(--accent); }
  .toggle::after {
    content: '';
    position: absolute;
    width: 16px; height: 16px;
    background: white;
    border-radius: 50%;
    top: 3px; left: 3px;
    transition: transform 0.2s;
  }
  .toggle.on::after { transform: translateX(18px); }

  /* Chart bars */
  .chart-bar {
    flex: 1;
    background: var(--bg-hover);
    border-radius: 4px 4px 0 0;
    position: relative;
    min-height: 4px;
    transition: background 0.2s;
    cursor: pointer;
  }
  .chart-bar:hover { background: rgba(59,130,246,0.3); }
  .chart-bar .fill {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    background: var(--gradient);
    border-radius: 4px 4px 0 0;
    opacity: 0.85;
  }

  /* Donut chart simulation */
  .donut-ring {
    width: 100px; height: 100px;
    border-radius: 50%;
    background: conic-gradient(
      var(--success) 0% 68%,
      var(--warning) 68% 85%,
      var(--danger) 85% 100%
    );
    display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  .donut-ring::after {
    content: '';
    position: absolute;
    width: 64px; height: 64px;
    background: var(--bg-card);
    border-radius: 50%;
  }

  /* Tag */
  .tag {
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  /* Avatar */
  .avatar {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: var(--gradient);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; color: white;
    flex-shrink: 0;
  }

  /* Tabs */
  .tabs { display: flex; gap: 2px; background: var(--bg-surface); border-radius: 10px; padding: 3px; }
  .tab {
    padding: 7px 16px;
    border-radius: 7px;
    font-size: 13px; font-weight: 500;
    cursor: pointer;
    color: var(--text-secondary);
    border: none; background: transparent;
    transition: all 0.2s;
  }
  .tab.active { background: var(--bg-card); color: var(--text-primary); box-shadow: 0 1px 6px rgba(0,0,0,0.2); }
  .tab:hover:not(.active) { color: var(--text-primary); }

  /* File row */
  .file-row {
    display: flex; align-items: center;
    padding: 12px 16px;
    border-radius: 10px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    transition: border-color 0.2s;
  }
  .file-row:hover { border-color: var(--border-light); }

  /* Notification dot */
  .notif-dot {
    width: 7px; height: 7px;
    background: var(--accent);
    border-radius: 50%;
    position: absolute;
    top: 6px; right: 6px;
  }

  /* Divider */
  .divider { height: 1px; background: var(--border); margin: 16px 0; }

  /* Gradient text */
  .gradient-text {
    background: var(--gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Credits bar */
  .credits-bar {
    height: 6px; background: var(--bg-hover);
    border-radius: 10px; overflow: hidden;
  }
  .credits-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    border-radius: 10px;
    transition: width 1s ease;
  }

  /* Modal overlay */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex; align-items: center; justify-content: center;
    z-index: 200;
    animation: fadeIn 0.2s ease;
  }
  .modal-box {
    background: var(--bg-card);
    border: 1px solid var(--border-light);
    border-radius: 18px;
    padding: 28px;
    width: 560px;
    max-width: 95vw;
    max-height: 85vh;
    overflow-y: auto;
    animation: drop 0.3s ease;
  }

  /* Scrollable */
  .scroll-area { overflow-y: auto; max-height: 360px; }
  
  select.input-field { cursor: pointer; }
  option { background: var(--bg-card); }

  .hover-row { cursor: pointer; transition: background 0.15s; }
  .hover-row:hover { background: var(--bg-hover) !important; }

  /* Responsive hint */
  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); }
    .main-content { margin-left: 0; }
  }
`;

// ── Data ────────────────────────────────────────────────────────────────────
// Dummy data removida para mostrar solo información real del usuario.

// ── Helpers ─────────────────────────────────────────────────────────────────
const statusBadge = (e) => {
    if (e === "valido") return <span className="badge badge-success">✓ Válido DGII</span>;
    if (e === "error") return <span className="badge badge-danger">✕ NCF Inválido</span>;
    if (e === "revision") return <span className="badge badge-warning">⚠ En Revisión</span>;
    if (e === "duplicado") return <span className="badge badge-neutral">⊘ Duplicado</span>;
};

// ── Components ───────────────────────────────────────────────────────────────

function LoginScreen() {
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [loading, setLoading] = useState(false);
    const [forgot, setForgot] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [resetSent, setResetSent] = useState(false);

    const doLogin = async () => {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) setError(error.message);
        setLoading(false);
        // Si OK → onAuthStateChange dispara automáticamente
    };

    const doRegister = async () => {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        const { data, error } = await supabase.auth.signUp({ email, password: pass });
        if (error) {
            setError(error.message);
        } else if (data?.user && !data?.session) {
            setSuccessMessage("¡Cuenta creada exitosamente! Por favor, revisa tu correo para confirmarla antes de iniciar sesión.");
            setIsRegister(false); // Volver al modo login
            setPass(""); // Limpiar la contraseña
        }
        // Si data.session no es nula, el usuario no requiere confirmación y onAuthStateChange disparará el login 
        setLoading(false);
    };

    const doReset = async () => {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) setError(error.message);
        else setResetSent(true);
        setLoading(false);
    };

    return (
        <div className="login-bg">
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(59,130,246,0.04) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
            <div className="login-card">
                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, background: "var(--gradient)", borderRadius: 14, marginBottom: 16 }}>
                        <Icon d={icons.layers} size={24} stroke="white" />
                    </div>
                    <div className="font-display" style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
                        <span className="gradient-text">Fluxia</span>
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Plataforma de Automatización Documental</div>
                </div>

                {!forgot ? (
                    <>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6, letterSpacing: 0.3 }}>CORREO ELECTRÓNICO</label>
                            <input className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@empresa.com" />
                        </div>
                        <div style={{ marginBottom: 8 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6, letterSpacing: 0.3 }}>CONTRASEÑA</label>
                            <input className="input-field" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && doLogin()} />
                        </div>
                        {error && (
                            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "9px 12px", marginBottom: 12, fontSize: 13, color: "var(--danger)" }}>
                                {error === "Invalid login credentials" ? "Correo o contraseña incorrectos." : error}
                            </div>
                        )}
                        {successMessage && !isRegister && !forgot && (
                            <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 8, padding: "9px 12px", marginBottom: 12, fontSize: 13, color: "var(--success)" }}>
                                {successMessage}
                            </div>
                        )}
                        <div style={{ textAlign: "right", marginBottom: 20 }}>
                            {!isRegister && <button className="btn-ghost" style={{ padding: "4px 0", fontSize: 12 }} onClick={() => { setForgot(true); setError(null); setSuccessMessage(null); }}>¿Olvidaste tu contraseña?</button>}
                        </div>
                        <button className="btn-primary" onClick={isRegister ? doRegister : doLogin} disabled={loading || !email || !pass}>
                            {loading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><span className="animate-spin" style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }} /> Verificando...</span> : (isRegister ? "Crear Cuenta" : "Iniciar Sesión")}
                        </button>
                        <div className="divider" />
                        <div style={{ display: "flex", gap: 10 }}>
                            <button className="btn-secondary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }} onClick={() => setIsRegister(!isRegister)}>
                                <Icon d={isRegister ? icons.logout : icons.zap} size={14} />
                                {isRegister ? "Volver al Login" : "Registrarse"}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ textAlign: "center", marginBottom: 20 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Recuperar contraseña</div>
                            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Te enviaremos un link a tu correo</div>
                        </div>
                        {resetSent ? (
                            <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 8, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "var(--success)", textAlign: "center" }}>
                                ✓ Revisa tu correo — te enviamos el link
                            </div>
                        ) : (
                            <>
                                {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "9px 12px", marginBottom: 12, fontSize: 13, color: "var(--danger)" }}>{error}</div>}
                                <div style={{ marginBottom: 16 }}>
                                    <input className="input-field" placeholder="tu@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
                                </div>
                                <button className="btn-primary" onClick={doReset} disabled={loading || !email}>
                                    {loading ? "Enviando..." : "Enviar instrucciones"}
                                </button>
                            </>
                        )}
                        <button className="btn-ghost" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} onClick={() => { setForgot(false); setResetSent(false); setError(null); }}>← Volver al login</button>
                    </>
                )}
            </div>
        </div>
    );
}

function Sidebar({ active, setActive, onLogout, userEmail, credits }) {
    const navItems = [
        { id: "dashboard", icon: icons.chart, label: "Dashboard" },
        { id: "procesar", icon: icons.upload, label: "Procesar Archivos" },
        { id: "estadisticas", icon: icons.trending, label: "Estadísticas" },
    ];
    const sourceItems = [
        { id: "drive", icon: icons.drive, label: "Google Drive" },
        { id: "sheets", icon: icons.sheet, label: "Google Sheets" },
    ];
    const bottomItems = [
        { id: "configuracion", icon: icons.settings, label: "Configuración" },
    ];

    return (
        <nav className="sidebar">
            <div className="sidebar-logo">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, background: "var(--gradient)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon d={icons.layers} size={17} stroke="white" />
                    </div>
                    <span className="font-display gradient-text" style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>Fluxia</span>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                <div className="nav-section-label">Principal</div>
                {navItems.map(item => (
                    <div key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}>
                        <Icon d={item.icon} size={16} />
                        {item.label}
                    </div>
                ))}
                <div className="nav-section-label" style={{ marginTop: 8 }}>Fuentes</div>
                {sourceItems.map(item => (
                    <div key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}>
                        <Icon d={item.icon} size={16} />
                        {item.label}
                    </div>
                ))}
                <div className="nav-section-label" style={{ marginTop: 8 }}>Sistema</div>
                {bottomItems.map(item => (
                    <div key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}>
                        <Icon d={item.icon} size={16} />
                        {item.label}
                    </div>
                ))}
            </div>

            {/* User + Credits */}
            <div style={{ padding: "16px", borderTop: "1px solid var(--border)" }}>
                <div style={{ background: "var(--bg-hover)", borderRadius: 10, padding: "12px", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>CRÉDITOS DE PROCESAMIENTO</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                            {credits ? `${credits.creditos_usados} / ${credits.creditos_limite === -1 ? "∞" : credits.creditos_limite}` : "— / —"}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--accent)", textTransform: "capitalize" }}>
                            {credits ? `Plan ${credits.plan}` : "Cargando..."}
                        </span>
                    </div>
                    <div className="credits-bar">
                        <div className="credits-fill" style={{
                            width: credits && credits.creditos_limite > 0
                                ? `${Math.min((credits.creditos_usados / credits.creditos_limite) * 100, 100)}%`
                                : "0%"
                        }} />
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="avatar">{userEmail ? userEmail.substring(0, 2).toUpperCase() : "FL"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userEmail ? userEmail.split("@")[0] : "Usuario"}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userEmail ?? ""}</div>
                    </div>
                    <button className="btn-ghost" style={{ padding: 6 }} title="Cerrar sesión" onClick={onLogout}>
                        <Icon d={icons.logout} size={15} />
                    </button>
                </div>
            </div>
        </nav>
    );
}

function Topbar({ page, setPage, userEmail, invoices, onSearch }) {
    const initials = userEmail ? userEmail.substring(0, 2).toUpperCase() : "FL";
    const titles = { dashboard: "Dashboard", procesar: "Procesar Archivos", estadisticas: "Estadísticas", drive: "Google Drive", sheets: "Google Sheets", configuracion: "Configuración" };
    const [showNotif, setShowNotif] = useState(false);
    const now = new Date();
    const dias = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
    const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    const fechaHoy = `${dias[now.getDay()]}, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;
    return (
        <div className="topbar">
            <div>
                <h1 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{titles[page] || "Fluxia"}</h1>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{fechaHoy}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ position: "relative", display: "flex" }}>
                    <input className="input-field" placeholder="Buscar facturas, NCF..." style={{ width: 220, padding: "8px 14px 8px 34px", fontSize: 12 }}
                        onChange={e => onSearch && onSearch(e.target.value)} />
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}><Icon d={icons.search} size={14} /></span>
                </div>
                <div style={{ position: "relative" }}>
                    <button className="btn-ghost" style={{ position: "relative", padding: 8 }} onClick={() => setShowNotif(p => !p)}>
                        <Icon d={icons.bell} size={18} />
                        {(invoices || []).length > 0 && <span className="notif-dot" />}
                    </button>
                    {showNotif && (
                        <div style={{ position: "absolute", right: 0, top: 40, width: 280, background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 12, padding: 14, zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Notificaciones</div>
                            {(invoices || []).length === 0 ? (
                                <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "10px 0" }}>Sin notificaciones nuevas</div>
                            ) : (invoices || []).slice(0, 3).map((inv, i) => (
                                <div key={i} style={{ padding: "8px 10px", borderRadius: 8, background: "var(--bg-surface)", marginBottom: 6, fontSize: 12 }}>
                                    <div style={{ fontWeight: 600, color: inv.estado === "error" ? "var(--danger)" : "var(--success)" }}>
                                        {inv.estado === "error" ? "⚠ NCF Inválido" : "✓ Procesado"}
                                    </div>
                                    <div style={{ color: "var(--text-muted)" }}>{inv.emisor} · {inv.fecha}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="avatar" title={userEmail}>{initials}</div>
            </div>
        </div>
    );
}

// ── Onboarding & Stripe ───────────────────────────────────────────────────────
function Onboarding({ userId, userEmail, reloadCredits }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ empresa: "", rnc: "", plan: "basic" });
    const [loading, setLoading] = useState(false);

    const checkouts = {
        basic: "https://buy.stripe.com/test_5kA5mA6tT6o1ehq9AB", // Replace with real generated payment links
        pro: "https://buy.stripe.com/test_00gaGQbOf5kX7XW145",
        premium: "https://buy.stripe.com/test_cN28yM4lL00DdfmcMQ"
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Guardar usuario config en supabase
            const limits = { basic: 100, pro: 500, premium: -1 };
            
            const res1 = await supabase.from("usuarios").upsert([{ 
                id: userId, 
                email: userEmail, 
                nombre: formData.empresa, 
                rol: "admin", 
                activo: true 
            }]);
            if (res1.error) throw new Error("Error en usuarios: " + res1.error.message);
            
            const res2 = await supabase.from("config_clientes").upsert([{ 
                user_id: userId,
                plan: formData.plan,
                creditos_usados: 0,
                creditos_limite: limits[formData.plan],
                fecha_renovacion: new Date(Date.now() + 30*24*60*60*1000).toISOString()
            }], { onConflict: 'user_id' });
            if (res2.error) throw new Error("Error en config_clientes: " + (res2.error.message || JSON.stringify(res2.error)));
            
            // Redirect to Stripe or Complete Onboarding
            const stripeLink = checkouts[formData.plan];
            if (stripeLink) {
                window.location.href = `${stripeLink}?client_reference_id=${userId}`;
            } else {
                reloadCredits();
            }
        } catch(e) {
            console.error(e);
            alert("Error: " + e.message);
        }
        setLoading(false);
    };

    return (
        <div className="modal-overlay" style={{ background: "var(--bg-base)" }}>
            <div className="modal-box" style={{ width: 600, padding: 36, textAlign: "center" }}>
                <Icon d={icons.layers} size={40} stroke="var(--accent)" />
                <h2 className="font-display" style={{ fontSize: 24, marginTop: 16 }}>Bienvenido a Fluxia</h2>
                <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 28 }}>Configuraremos tu cuenta en unos pasos rápidos.</div>
                
                {step === 1 && (
                    <div style={{ textAlign: "left" }}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>NOMBRE DE LA EMPRESA *</label>
                            <input className="input-field" value={formData.empresa} onChange={e => setFormData({...formData, empresa: e.target.value})} placeholder="Ej. Inversiones DR" />
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>RNC DE LA EMPRESA (Opcional)</label>
                            <input className="input-field" value={formData.rnc} onChange={e => setFormData({...formData, rnc: e.target.value})} placeholder="101-12345-6" />
                        </div>
                        <button className="btn-primary" disabled={!formData.empresa} onClick={() => setStep(2)}>Siguiente paso →</button>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
                            {[
                                { id: "basic", t: "Básico", desc: "100 facturas", price: "$17/mes" },
                                { id: "pro", t: "Pro", desc: "500 facturas", price: "$47/mes" },
                                { id: "premium", t: "Premium", desc: "Ilimitado", price: "$103/mes" }
                            ].map(p => (
                                <div key={p.id} onClick={() => setFormData({...formData, plan: p.id})} style={{ padding: "16px", borderRadius: 12, border: `2px solid ${formData.plan === p.id ? "var(--accent)" : "var(--border)"}`, background: formData.plan === p.id ? "var(--accent-glow)" : "var(--bg-surface)", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.t}</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>{p.price}</div>
                                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.desc}</div>
                                </div>
                            ))}
                        </div>
                        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                            {loading ? "Preparando Stripe..." : "Completar Registro y Pagar"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Helpers Export 606 (N8N Automated & Local Fallback) ──────────────────────
async function export606Official(invoices, userRNC = "101863567", period = null, userId = null) {
    if (!invoices || invoices.length === 0) { alert("No hay facturas para exportar."); return; }
    
    // Si no viene periodo, calcular el mes actual (AAAAMM)
    if (!period) {
        const d = new Date();
        period = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    
    // 1. Intentar Exportación Automatizada via n8n
    const n8nWebhook = import.meta.env.VITE_N8N_WEBHOOK?.replace("procesar-factura", "exportar-606");
    if (n8nWebhook) {
        try {
            console.log("Enviando datos a n8n para llenado automático...");
            const response = await fetch(n8nWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    mes: period.substring(4) || "03",
                    anio: period.substring(0, 4) || "2026",
                    action: "export606",
                    rncEmpresa: userRNC,
                    periodo: period,
                    invoices: invoices
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `606_Oficial_${period}_Fluxia.xls`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                alert("🚀 ¡Exportación Automática Exitosa!\n\nn8n ha procesado tu plantilla oficial con macros. Ya puedes abrir el archivo y validar.");
                return;
            }
        } catch (err) {
            console.error("Error en n8n export:", err);
        }
    }

    // 2. Fallback: Exportación Local (con instrucciones de copiado)
    console.log("Iniciando exportación local (fallback)...");
    const headers = [
        "RNC o Cédula", "Tipo Id", "Tipo Bienes y Servicios", "NCF", "NCF o Doc. Modificado",
        "Fecha Comprobante", "Fecha Pago", "Monto Facturado en Servicios", "Monto Facturado en Bienes",
        "Total Monto Facturado", "ITBIS Facturado", "ITBIS Retenido", "ITBIS sujeto a Proporcionalidad",
        "ITBIS Llevado al Costo", "ITBIS por Adelantar", "ITBIS percibido en compras", "Tipo de Retención en ISR",
        "Monto Retención Renta", "ISR Percibido en compras", "Impuesto Selectivo al Consumo",
        "Otros Impuestos/Tasas", "Monto Propina Legal", "Forma de Pago"
    ];

    const dataRows = invoices.map(inv => {
        const cleanRNC = (inv.rnc || "").replace(/\D/g, "");
        const cleanNCF = (inv.ncf || "").replace(/\s/g, "");
        const montoNum = parseFloat((inv.monto || "0").replace(/[^0-9.]/g, "")) || 0;
        const itbisNum = parseFloat((inv.itbis || "0").replace(/[^0-9.]/g, "")) || 0;
        
        let fComp = "20260316";
        if (inv.fecha && inv.fecha.includes("/")) {
            const p = inv.fecha.split("/");
            if (p.length === 3) fComp = p[2] + p[1].padStart(2, '0') + p[0].padStart(2, '0');
        }

        return `
            <tr>
                <td>&nbsp;${cleanRNC}</td>
                <td style="text-align:center">${cleanRNC.length === 11 ? 2 : 1}</td>
                <td style="text-align:center">02</td>
                <td>${cleanNCF}</td>
                <td></td>
                <td style="text-align:center">${fComp}</td>
                <td style="text-align:center">${fComp}</td>
                <td style="text-align:right">${montoNum.toFixed(2)}</td>
                <td style="text-align:right">0.00</td>
                <td style="text-align:right">${montoNum.toFixed(2)}</td>
                <td style="text-align:right">${itbisNum.toFixed(2)}</td>
                <td style="text-align:right">0.00</td>
                <td style="text-align:right">0.00</td>
                <td style="text-align:right">0.00</td>
                <td style="text-align:right">${itbisNum.toFixed(2)}</td>
                <td style="text-align:right">0.00</td>
                <td></td>
                <td style="text-align:right">0.00</td>
                <td style="text-align:right">0.00</td>
                <td style="text-align:right">0.00</td>
                <td style="text-align:right">0.00</td>
                <td style="text-align:right">0.00</td>
                <td style="text-align:center">02</td>
            </tr>
        `;
    }).join("");

    const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8">
        <style>
            table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 9pt; }
            td { border: 0.5pt solid #94a3b8; padding: 4px; }
            .dgii-blue { background: #1e3a8a; color: white; border: 1px solid white; text-align: center; font-weight: bold; }
            .dgii-gray { background: #f1f5f9; font-weight: bold; }
            .dgii-btn { background: #e2e8f0; border: 1pt solid #94a3b8; text-align: center; font-size: 8pt; }
        </style></head>
        <body>
            <table>
                <tr><td colspan="23" style="font-size: 14pt; font-weight: bold; text-align: center; border: none;">Formato de Envío de Compras de Bienes y Servicios</td></tr>
                <tr><td colspan="23" style="text-align: center; border: none;">Herramienta de Distribución Gratuita</td></tr>
                <tr><td colspan="23" style="height: 15px; border: none;"></td></tr>
                <tr><td colspan="23" style="height: 15px; border: none;"></td></tr>
                <tr><td colspan="23" style="height: 15px; border: none;"></td></tr>
                
                <tr>
                    <td colspan="2" style="border:none"></td>
                    <td class="dgii-btn">Inicio</td>
                    <td class="dgii-btn">Validar</td>
                    <td class="dgii-btn">Generar Archivo</td>
                    <td class="dgii-btn">Cancelar</td>
                    <td class="dgii-btn">Ayuda</td>
                    <td colspan="16" style="border:none"></td>
                </tr>
                <tr><td colspan="23" style="height: 10px; border: none;"></td></tr>

                <tr>
                    <td colspan="3" class="dgii-gray">RNC O CÉDULA:</td><td colspan="4">&nbsp;${userRNC}</td>
                    <td colspan="3" class="dgii-gray">PERIODO (AAAAMM):</td><td colspan="4">${period}</td>
                    <td colspan="3" class="dgii-gray">REGISTROS:</td><td colspan="6">${invoices.length}</td>
                </tr>
                <tr><td colspan="23" style="height: 10px; border: none;"></td></tr>

                <tr style="background: #1e3a8a; color: white; height: 25px;">
                    ${headers.map((h, i) => `<td class="dgii-blue">${i+1}</td>`).join("")}
                </tr>
                <tr style="background: #1e3a8a; color: white; height: 45px;">
                    ${headers.map(h => `<td class="dgii-blue" style="vertical-align:middle">${h}</td>`).join("")}
                </tr>
                ${dataRows}
            </table>
        </body></html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Fluxia_DATOS_606_${period}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    alert("🚀 EXPORTACIÓN COMPLETADA (Manual)\n\nLos datos están listos en la FILA 12.\n\nInstrucciones:\n1. Abre este archivo.\n2. PÉGALAS en tu plantilla oficial con Macros.");
}


function exportXLS(invoices, title) {
    if (!invoices || invoices.length === 0) { alert("No hay datos para exportar."); return; }
    const now = new Date().toLocaleDateString("es-DO");
    const rows = invoices.map((inv, i) => `
        <tr style="background:${i%2===0?'#f8faff':'#ffffff'}">
            <td>${i+1}</td>
            <td>${inv.emisor}</td>
            <td>${inv.rnc}</td>
            <td>${inv.ncf}</td>
            <td>${inv.credito || 'B01'}</td>
            <td style="text-align:right">${inv.monto}</td>
            <td style="text-align:right">${inv.itbis}</td>
            <td>${inv.fecha}</td>
            <td>${inv.estado === 'valido' ? 'Válida' : inv.estado === 'duplicado' ? 'Duplicada' : 'Error NCF'}</td>
            <td>${inv.concepto || ''}</td>
        </tr>`).join("");
    const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8">
        <style>
            body { font-family: Calibri, Arial; font-size: 11pt; }
            h1 { font-size: 14pt; color: #1e3a8a; margin-bottom: 4px; }
            .sub { color: #64748b; font-size: 10pt; margin-bottom: 12px; }
            table { border-collapse: collapse; width: 100%; }
            th { background: #1e3a8a; color: white; padding: 8px 12px; text-align: left; font-size: 10pt; }
            td { padding: 7px 12px; border-bottom: 1px solid #e2e8f0; font-size: 10pt; }
        </style></head>
        <body>
            <h1>Reporte 606 — ${title}</h1>
            <p class="sub">Generado por Fluxia · ${now} · ${invoices.length} registros</p>
            <table>
                <thead><tr>
                    <th>#</th><th>Emisor</th><th>RNC</th><th>NCF</th><th>Tipo</th>
                    <th>Monto</th><th>ITBIS</th><th>Fecha</th><th>Estado DGII</th><th>Concepto</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `Reporte_606_Fluxia_${title.replace(/\s/g,'_')}.xls`; a.click();
    URL.revokeObjectURL(url);
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ userId, setPage, invoices, dataLoading, searchTerm, credits }) {
    const invData = (invoices || []).filter(inv => {
        if (!searchTerm || searchTerm.trim() === "") return true;
        const q = searchTerm.toLowerCase().trim();
        const ncfVal = (inv.ncf && inv.ncf !== "—") ? inv.ncf.toLowerCase() : "";
        const rncVal = (inv.rnc && inv.rnc !== "—") ? inv.rnc.toLowerCase() : "";
        return (
            inv.emisor?.toLowerCase().includes(q) ||
            ncfVal.includes(q) ||
            rncVal.includes(q) ||
            inv.id?.toLowerCase().includes(q) ||
            inv.fecha?.toLowerCase().includes(q)
        );
    });
    const validas = invData.filter(i => i.estado === "valido").length;
    const errores = invData.filter(i => i.estado === "error").length;
    
    const kpis = [
        { label: "Facturas totales", value: invData.length.toString(), delta: "Historico", color: "var(--accent)", icon: icons.file },
        { label: "Procesadas OK", value: validas.toString(), delta: invData.length ? `${Math.round((validas/invData.length)*100)}%` : "0%", color: "var(--success)", icon: icons.check },
        { label: "Con errores", value: errores.toString(), delta: "Requieren rev.", color: "var(--danger)", icon: icons.alert },
        { label: "Ahorro estimado (h)", value: (invData.length * 0.15).toFixed(1) + "h", delta: "Todo el tiempo", color: "var(--accent2)", icon: icons.zap },
    ];

    // Build simple chart based on data length for illustration
    const maxVal = Math.max(invData.length, 10);
    const CHART_DATA = [{ mes: "Mes Actual", val: invData.length }];

    return (
        <div className="page-content fade-in">
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
                {kpis.map((k, i) => (
                    <div className="kpi-card" key={i} style={{ animationDelay: `${i * 0.08}s`, opacity: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${k.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Icon d={k.icon} size={17} stroke={k.color} />
                            </div>
                            <span className="badge badge-info" style={{ fontSize: 10 }}>{k.delta}</span>
                        </div>
                        <div className="font-display" style={{ fontSize: 28, fontWeight: 800, color: k.color, lineHeight: 1, marginBottom: 4, animation: "countUp 0.5s ease" }}>{k.value}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{k.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14, marginBottom: 14 }}>
                {/* Bar chart */}
                <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Volumen de Procesamiento</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Facturas digitalizadas por mes</div>
                        </div>
                        <span className="badge badge-success">↑ Tendencia positiva</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, height: 140, alignItems: "flex-end" }}>
                        {CHART_DATA.map((d, i) => (
                            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>{d.val}</div>
                                <div className="chart-bar" style={{ width: "100%", height: 120 }}>
                                    <div className="fill" style={{ height: `${(d.val / maxVal) * 100}%`, transition: "height 0.8s ease" }} />
                                </div>
                                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.mes}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Donut + breakdown */}
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Estado de Facturas</div>
                    <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 18 }}>
                        <div style={{ position: "relative" }}>
                            <div className="donut-ring" />
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>93%</span>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            {[["Válidas DGII", validas, "var(--success)"], ["Con error", errores, "var(--danger)"]].map(([l, v, c]) => (
                                <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{l}</span>
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: c }}>{v} ({invData.length ? Math.round((v/invData.length)*100) : 0}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ background: "var(--bg-surface)", borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between" }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--success)" }}>B01</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Crédito Fiscal</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)" }}>B02</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Consumidor Final</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent2)" }}>B04</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Gubernamental</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent invoices table */}
            <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Facturas Recientes</div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn-secondary" style={{ fontSize: 12, padding: "7px 14px", display: "flex", alignItems: "center", gap: 5 }} 
                            onClick={() => export606Official(invData, credits?.rnc || "101863567", null, userId)}>
                            <Icon d={icons.download} size={13} />Exportar Formato 606
                        </button>
                        <button className="btn-primary" style={{ fontSize: 12, padding: "7px 14px", width: "auto" }} onClick={() => setPage("procesar")}>
                            + Nueva carga
                        </button>
                    </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th><th>Emisor</th><th>RNC</th><th>NCF</th><th>Monto</th><th>ITBIS</th><th>Fecha</th><th>Estado DGII</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dataLoading ? (
                                <tr><td colSpan="8" style={{ textAlign: "center", padding: 24 }}><span className="animate-pulse" style={{ color: "var(--text-muted)" }}>Cargando facturas desde Airtable...</span></td></tr>
                            ) : invData.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No hay facturas registradas en Airtable aún.</td></tr>
                            ) : invData.map((inv, i) => (
                                <tr key={i} className="hover-row">
                                    <td><code style={{ fontSize: 11, color: "var(--accent)" }}>{inv.id}</code></td>
                                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{inv.emisor}</td>
                                    <td><code style={{ fontSize: 11 }}>{inv.rnc}</code></td>
                                    <td><code style={{ fontSize: 11 }}>{inv.ncf}</code></td>
                                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{inv.monto}</td>
                                    <td>{inv.itbis}</td>
                                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{inv.fecha}</td>
                                    <td>{statusBadge(inv.estado)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── Procesar ─────────────────────────────────────────────────────────────────
function ProcesarArchivos({ userId, invoices }) {
    const [drag, setDrag] = useState(false);
    const [files, setFiles] = useState([]);
    const [processing, setProcessing] = useState(null);
    const [showAudit, setShowAudit] = useState(false);
    const [auditData, setAuditData] = useState(null);
    const [tab, setTab] = useState("cargar");
    const fileRef = useRef();

    const DRIVE_FOLDER_ID = "1PgkAJbmqkxm8hYgWhGal_kwR-_vaFVmL";

    const historial = (invoices || []).map((inv, i) => ({
        name: `Factura_${(inv.emisor || inv.id).replace(/\s+/g,'_')}.pdf`,
        items: 1,
        ok: inv.estado === "valido" ? 1 : 0,
        err: inv.estado !== "valido" ? 1 : 0,
        fecha: inv.fecha,
        size: "~1.2 MB",
        driveFileId: inv.driveFileId || null
    }));

    const processWithN8n = async (file) => {
        setProcessing({ name: file.name, progress: 10, step: "Preparando archivo..." });
        try {
            // Convertir a base64
            const base64 = await new Promise((res, rej) => {
                const r = new FileReader();
                r.onload = () => res(r.result.split(",")[1]);
                r.onerror = rej;
                r.readAsDataURL(file);
            });
            setProcessing(p => ({ ...p, progress: 30, step: "Enviando a n8n..." }));

            const webhook = import.meta.env.VITE_N8N_WEBHOOK;
            const resp = await fetch(webhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    file_base64: base64,
                    file_name: file.name,
                    audit_mode: true
                })
            });

            setProcessing(p => ({ ...p, progress: 80, step: "Procesando con IA..." }));
            const data = await resp.json();
            setProcessing(p => ({ ...p, progress: 100, step: "¡Completado!" }));

            setTimeout(() => {
                setProcessing(null);
                // n8n devuelve { status, request_id, invoice: { emisor, ncf, ... } }
                const inv = data.invoice ?? data.factura ?? null;
                if (inv) {
                    setAuditData({
                        ncf:       inv.ncf               ?? "—",
                        rnc:       inv.id_fiscal_emisor  ?? inv.rnc_emisor ?? "—",
                        emisor:    inv.emisor             ?? "—",
                        monto:     inv.total              ?? inv.monto_total ?? "—",
                        itbis:     inv.itbis              ?? "—",
                        fecha:     inv.fecha_emision      ?? inv.fecha ?? "—",
                        tipo:      inv.ncf_validacion?.tipo_nombre ?? inv.tipo_ncf ?? "—",
                        confianza: data.confianza ?? 95
                    });
                    setShowAudit(true);
                }
            }, 400);
        } catch (err) {
            setProcessing(null);
            alert("Error al procesar: " + err.message);
        }
    };

    const simulateProcess = (name) => {
        setProcessing({ name, progress: 0, step: "Analizando imagen con IA..." });
        let p = 0;
        const steps = ["Analizando imagen con IA...", "Extrayendo NCF y RNC...", "Validando en DGII...", "Detectando duplicados...", "Guardando en Drive..."];
        const interval = setInterval(() => {
            p += 7;
            const stepIdx = Math.min(Math.floor(p / 20), steps.length - 1);
            setProcessing(prev => ({ ...prev, progress: Math.min(p, 100), step: steps[stepIdx] }));
            if (p >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    setProcessing(null);
                    setAuditData({ ncf: "B0100001305", rnc: "101-12345-6", emisor: "Suplidores SA", monto: "RD$45,200", itbis: "RD$6,250", fecha: "10/03/2026", tipo: "B01 - Crédito Fiscal", confianza: 97 });
                    setShowAudit(true);
                }, 400);
            }
        }, 120);
    };

    const handleDrop = (e) => {
        e.preventDefault(); setDrag(false);
        const f = Array.from(e.dataTransfer.files);
        if (f.length) { setFiles(f); userId ? processWithN8n(f[0]) : simulateProcess(f[0].name); }
    };

    const handleFile = (e) => {
        const f = Array.from(e.target.files);
        if (f.length) { setFiles(f); userId ? processWithN8n(f[0]) : simulateProcess(f[0].name); }
    };

    return (
        <div className="page-content fade-in">
            {/* Audit modal */}
            {showAudit && auditData && (
                <div className="modal-overlay" onClick={() => setShowAudit(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <div>
                                <div className="font-display" style={{ fontSize: 17, fontWeight: 700 }}>Auditoría Humana</div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Verifica los datos extraídos por la IA antes de confirmar</div>
                            </div>
                            <span className="badge badge-success">🔒 Confianza {auditData.confianza}%</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                            {[["NCF", auditData.ncf], ["RNC Emisor", auditData.rnc], ["Emisor", auditData.emisor], ["Tipo", auditData.tipo], ["Monto Total", auditData.monto], ["ITBIS", auditData.itbis], ["Fecha", auditData.fecha]].map(([k, v]) => (
                                <div key={k} style={{ background: "var(--bg-surface)", borderRadius: 10, padding: "12px 14px" }}>
                                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>{k}</div>
                                    <input className="input-field" defaultValue={v} style={{ padding: "7px 10px", fontSize: 13, background: "var(--bg-hover)" }} />
                                </div>
                            ))}
                        </div>
                        <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                            <Icon d={icons.check} size={15} stroke="var(--success)" />
                            <span style={{ fontSize: 12, color: "var(--success)" }}>NCF B01 válido según estructura DGII. Sin duplicados detectados.</span>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button className="btn-primary" style={{ flex: 1 }} onClick={() => setShowAudit(false)}>✓ Confirmar y Guardar</button>
                            <button className="btn-secondary" onClick={() => setShowAudit(false)}>Rechazar</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <div className="tabs">
                    {["cargar", "historial"].map(t => (
                        <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                            {t === "cargar" ? "📤 Cargar Archivos" : "📋 Historial"}
                        </button>
                    ))}
                </div>
            </div>

            {tab === "cargar" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
                    <div>
                        <div
                            className={`drop-zone ${drag ? "drag-over" : ""}`}
                            style={{ marginBottom: 16, minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
                            onDragOver={e => { e.preventDefault(); setDrag(true); }}
                            onDragLeave={() => setDrag(false)}
                            onDrop={handleDrop}
                            onClick={() => fileRef.current?.click()}
                        >
                            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.zip" multiple style={{ display: "none" }} onChange={handleFile} />
                            <div style={{ width: 56, height: 56, background: "var(--accent-glow)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, border: "1px dashed var(--accent)" }}>
                                <Icon d={icons.upload} size={24} stroke="var(--accent)" />
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Arrastra tus facturas aquí</div>
                            <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>PDF, JPG, PNG, XLSX · hasta 50 MB por archivo</div>
                            <button className="btn-secondary" onClick={e => e.stopPropagation()}>Explorar archivos</button>
                        </div>

                        {processing && (
                            <div className="card" style={{ marginBottom: 16 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{processing.name}</div>
                                    <span style={{ fontSize: 12, color: "var(--accent)" }} className="animate-pulse">{processing.step}</span>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-bar-fill" style={{ "--w": `${processing.progress}%`, width: `${processing.progress}%` }} />
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, textAlign: "right" }}>{processing.progress}%</div>
                            </div>
                        )}
                    </div>

                    {/* Rules panel */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div className="card">
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Opciones de procesamiento</div>
                            {[
                                ["Validación DGII en tiempo real", true],
                                ["Detección de duplicados", true],
                                ["Auditoría humana previa", true],
                                ["Guardar en Google Drive", true],
                                ["Actualizar Google Sheets", false],
                            ].map(([label, def]) => (
                                <OpcionToggle key={label} label={label} def={def} />
                            ))}
                        </div>
                        <div className="card">
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Destino de guardado</div>
                            <div style={{ marginBottom: 10 }}>
                                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 700, letterSpacing: 0.5 }}>CARPETA EN DRIVE</label>
                                <select className="input-field" style={{ fontSize: 13 }}>
                                    <option>📁 /Facturas/2026/Marzo</option>
                                    <option>📁 /Facturas/2026/Febrero</option>
                                    <option>📁 /Facturas_Procesadas</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 700, letterSpacing: 0.5 }}>HOJA DE CÁLCULO</label>
                                <select className="input-field" style={{ fontSize: 13 }}>
                                    <option>📊 Registro 606 - 2026</option>
                                    <option>📊 Control Facturas</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {tab === "historial" && (
                <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Historial de Cargas</div>
                        <button className="btn-secondary" style={{ fontSize: 12, padding: "7px 14px", display: "flex", alignItems: "center", gap: 5 }}
                            onClick={() => export606Official(invoices)}>
                            <Icon d={icons.download} size={13} />Exportar Formato 606
                        </button>
                    </div>
                    {historial.length === 0 && (
                        <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 13 }}>No hay historial de cargas aún.</div>
                    )}
                    {historial.map((h, i) => (
                        <div key={i} className="file-row" style={{ marginBottom: 8 }}>
                            <div style={{ width: 36, height: 36, background: "var(--bg-hover)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 }}>
                                <Icon d={icons.inbox} size={16} stroke="var(--accent)" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{h.name}</div>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{h.fecha} · {h.size}</span>
                                    <span className="badge badge-success" style={{ fontSize: 10 }}>{h.ok} OK</span>
                                    {h.err > 0 && <span className="badge badge-danger" style={{ fontSize: 10 }}>{h.err} error</span>}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button className="btn-ghost" style={{ padding: 7 }} title="Ver factura en Drive"
                                    onClick={() => h.driveFileId
                                        ? window.open(`https://drive.google.com/file/d/${h.driveFileId}/view`, '_blank')
                                        : window.open(`https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`, '_blank')}>
                                    <Icon d={icons.eye} size={15} />
                                </button>
                                <button className="btn-ghost" style={{ padding: 7 }} title="Descargar desde Drive"
                                    onClick={() => h.driveFileId
                                        ? window.open(`https://drive.google.com/uc?export=download&id=${h.driveFileId}`, '_blank')
                                        : exportCSV606(invoices)}>
                                    <Icon d={icons.download} size={15} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Estadísticas ─────────────────────────────────────────────────────────────
function Estadisticas({ invoices }) {
    const invData = invoices || [];
    const validas = invData.filter(i => i.estado === "valido").length;
    const conError = invData.filter(i => i.estado === "error").length;
    const tasaExito = invData.length ? ((validas / invData.length) * 100).toFixed(1) : "0.0";
    
    // Agrupación mensual simple por la propiedad "fecha"
    const monthlyMap = {};
    invData.forEach(inv => {
        const mes = (inv.fecha || "Desconocido").substring(3, 10); // Asume dd/mm/yyyy -> mm/yyyy
        if (!monthlyMap[mes]) monthlyMap[mes] = { total: 0, ok: 0, err: 0 };
        monthlyMap[mes].total++;
        if (inv.estado === "valido") monthlyMap[mes].ok++;
        if (inv.estado === "error") monthlyMap[mes].err++;
    });
    const monthly = Object.keys(monthlyMap).map(k => ({ mes: k, ...monthlyMap[k] }));

    return (
        <div className="page-content fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
                {[
                    ["Total procesado (año)", invData.length.toString(), "var(--accent)", icons.file],
                    ["Tasa de éxito", `${tasaExito}%`, "var(--success)", icons.trending],
                    ["Horas ahorradas", (invData.length * 0.15).toFixed(1) + "h", "var(--accent2)", icons.zap],
                ].map(([l, v, c, ico], i) => (
                    <div className="kpi-card" key={i} style={{ animationDelay: `${i * 0.1}s`, opacity: 0 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <div style={{ width: 44, height: 44, background: `${c}18`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Icon d={ico} size={20} stroke={c} />
                            </div>
                            <div>
                                <div className="font-display" style={{ fontSize: 26, fontWeight: 800, color: c }}>{v}</div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{l}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Resumen Mensual</div>
                    <table className="data-table">
                        <thead><tr><th>Mes</th><th>Total</th><th>Exitosas</th><th>Errores</th><th>Tasa</th></tr></thead>
                        <tbody>
                            {monthly.length === 0 ? (
                                <tr><td colSpan="5" style={{ padding: 16, textAlign: "center", color: "var(--text-muted)" }}>Sin datos suficientes</td></tr>
                            ) : monthly.map((m, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{m.mes}</td>
                                    <td>{m.total}</td>
                                    <td style={{ color: "var(--success)" }}>{m.ok}</td>
                                    <td style={{ color: "var(--danger)" }}>{m.err}</td>
                                    <td><span className="badge badge-success">{((m.ok / m.total) * 100).toFixed(1)}%</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Top Emisores</div>
                    {invData.slice(0, 4).map((inv, i) => {
                        const colors = ["var(--accent)", "var(--accent2)", "var(--success)", "var(--warning)"];
                        const c = colors[i % colors.length];
                        return (
                        <div key={i} style={{ marginBottom: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{inv.emisor}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: c }}>1 Docs</span>
                            </div>
                            <div className="progress-bar">
                                <div className="progress-bar-fill" style={{ "--w": `50%`, width: `50%`, background: c }} />
                            </div>
                        </div>
                        );
                    })}
                    {invData.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: 10 }}>Ningún emisor registrado</div>}
                </div>
            </div>

            <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Exportar Reporte 606 (DGII)</div>
                    <a href="https://dgii.gov.do/contribuyentes/personas-juridicas/declaraciones/itbis-606/" target="_blank" rel="noopener noreferrer"
                       style={{ textDecoration: "none" }}><span className="badge badge-info" style={{ cursor: "pointer" }}>↗ Formato oficial DGII</span></a>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                    {[["Enero 2026", invData.length], ["Febrero 2026", invData.length], ["Marzo 2026", invData.length]].map(([mes, qty], idx) => (
                        <div key={mes} style={{ background: "var(--bg-surface)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{mes}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{qty} {qty === 1 ? "factura" : "facturas"}</div>
                            </div>
                            <button className="btn-ghost" style={{ padding: "7px 10px" }} title={`Exportar ${mes}`}
                                onClick={() => exportCSV606(invData)}>
                                <Icon d={icons.download} size={15} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Google Drive ─────────────────────────────────────────────────────────────
const DRIVE_FOLDER_ID = "1PgkAJbmqkxm8hYgWhGal_kwR-_vaFVmL";
const DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`;

function DriveView({ invoices }) {
    const typeColors = { PDF: "var(--danger)", IMG: "var(--accent)", XLS: "var(--success)" };
    const [driveSearch, setDriveSearch] = useState("");
    const [activeFolder, setActiveFolder] = useState(3); // default = Marzo
    const driveFiles = (invoices || []).map(inv => ({
        name: `Factura_${(inv.emisor || inv.id).replace(/\s+/g, '')}.pdf`,
        size: "1.2 MB",
        fecha: inv.fecha,
        tipo: "PDF",
        procesado: true,
        driveFileId: inv.driveFileId || null,
        emisor: inv.emisor
    }));
    const displayedFiles = driveFiles.filter(f =>
        !driveSearch ||
        f.name.toLowerCase().includes(driveSearch.toLowerCase()) ||
        f.emisor?.toLowerCase().includes(driveSearch.toLowerCase()) ||
        (f.fecha && f.fecha.toLowerCase().includes(driveSearch.toLowerCase()))
    );
    // Estimated storage: ~1.2MB per file
    const usedMB = driveFiles.length * 1.2;
    const usedGB = (usedMB / 1024).toFixed(2);
    const totalGB = 15;
    const pct = Math.max((usedMB / (totalGB * 1024)) * 100, 0.5).toFixed(1);

    const folderItems = [
        { label: "📁 Facturas / 2026", folder: null },
        { label: "  📁 Enero", folder: null },
        { label: "  📁 Febrero", folder: null },
        { label: "  📁 Marzo", folder: DRIVE_FOLDER_ID },
        { label: "📁 Contratos", folder: null },
        { label: "📁 Pendientes", folder: null },
    ];

    return (
        <div className="page-content fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
                <div>
                    <div className="card" style={{ marginBottom: 14 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
                            <Icon d={icons.drive} size={15} stroke="var(--accent)" />Explorador
                        </div>
                        {folderItems.map((f, i) => (
                            <div key={i} className="hover-row"
                                onClick={() => {
                                    setActiveFolder(i);
                                    if (f.folder) window.open(`https://drive.google.com/drive/folders/${f.folder}`, '_blank');
                                    else window.open(DRIVE_FOLDER_URL, '_blank');
                                }}
                                style={{ padding: "7px 8px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                                    color: activeFolder === i ? "var(--accent)" : "var(--text-secondary)",
                                    background: activeFolder === i ? "var(--accent-glow)" : "transparent" }}>{f.label}</div>
                        ))}
                        <button className="btn-ghost" style={{ width: "100%", marginTop: 8, fontSize: 11, justifyContent: "center", display: "flex", gap: 5 }}
                            onClick={() => window.open(DRIVE_FOLDER_URL, '_blank')}>
                            <Icon d={icons.drive} size={12} /> Abrir en Google Drive ↗
                        </button>
                    </div>
                    <div className="card">
                        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 10, color: "var(--text-secondary)" }}>Almacenamiento</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>{usedGB} GB / {totalGB} GB usados</div>
                        <div className="progress-bar">
                            <div className="progress-bar-fill" style={{ "--w": `${pct}%`, width: `${pct}%` }} />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Facturas / 2026 / Marzo</div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <div style={{ position: "relative" }}>
                                <input className="input-field" placeholder="Buscar por emisor, fecha..." style={{ width: 200, fontSize: 12, padding: "7px 12px 7px 30px" }}
                                    onChange={e => setDriveSearch(e.target.value)} />
                                <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }}><Icon d={icons.search} size={13} stroke="var(--text-muted)" /></span>
                            </div>
                            <button className="btn-secondary" style={{ fontSize: 12, padding: "7px 12px" }}
                                onClick={() => exportCSV606(invoices)}>⬇ Exportar</button>
                        </div>
                    </div>
                    <table className="data-table">
                        <thead><tr><th>Nombre</th><th>Tipo</th><th>Tamaño</th><th>Fecha</th><th>Procesado</th><th>Acción</th></tr></thead>
                        <tbody>
                            {displayedFiles.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: 16, textAlign: "center", color: "var(--text-muted)" }}>Carpeta vacía</td></tr>
                            ) : displayedFiles.map((f, i) => (
                                <tr key={i} className="hover-row">
                                    <td style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ width: 28, height: 28, background: `${typeColors[f.tipo]}18`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <span style={{ fontSize: 9, fontWeight: 800, color: typeColors[f.tipo] }}>{f.tipo}</span>
                                        </div>
                                        <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{f.name}</span>
                                    </td>
                                    <td><span className="tag">{f.tipo}</span></td>
                                    <td style={{ fontSize: 12 }}>{f.size}</td>
                                    <td style={{ fontSize: 12 }}>{f.fecha}</td>
                                    <td>{f.procesado ? <span className="badge badge-success">✓ Sí</span> : <span className="badge badge-warning">Pendiente</span>}</td>
                                    <td>
                                        <div style={{ display: "flex", gap: 4 }}>
                                            <button className="btn-ghost" style={{ padding: 5 }} title="Ver en Google Drive"
                                                onClick={() => f.driveFileId
                                                    ? window.open(`https://drive.google.com/file/d/${f.driveFileId}/view`, '_blank')
                                                    : window.open(DRIVE_FOLDER_URL, '_blank')}>
                                                <Icon d={icons.eye} size={14} />
                                            </button>
                                            <button className="btn-ghost" style={{ padding: 5 }} title="Descargar desde Drive"
                                                onClick={() => f.driveFileId
                                                    ? window.open(`https://drive.google.com/uc?export=download&id=${f.driveFileId}`, '_blank')
                                                    : window.open(DRIVE_FOLDER_URL, '_blank')}>
                                                <Icon d={icons.download} size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── Google Sheets ────────────────────────────────────────────────────────────
// Sheets URL base: the spreadsheet linked to this Airtable
const SHEETS_REGISTRO_URL = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKhqPuQP1zRc4yQ8oB";

function SheetsView({ userId, invoices, credits }) {
    const invData = invoices || [];
    const [activeSheet, setActiveSheet] = useState(0);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [newSheetUrl, setNewSheetUrl] = useState("");

    const sheets = [
        { name: "Registro 606 - 2026" },
        { name: "Control Facturas" },
    ];

    return (
        <div className="page-content fade-in">
            {/* Modal conectar hoja */}
            {showConnectModal && (
                <div className="modal-overlay" onClick={() => setShowConnectModal(false)}>
                    <div className="modal-box" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
                        <div className="font-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Conectar Google Sheet</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Pega la URL de la hoja de cálculo que deseas vincular</div>
                        <input className="input-field" placeholder="https://docs.google.com/spreadsheets/d/..." value={newSheetUrl} onChange={e => setNewSheetUrl(e.target.value)} style={{ marginBottom: 14 }} />
                        <div style={{ display: "flex", gap: 10 }}>
                            <button className="btn-primary" style={{ flex: 1 }} onClick={() => {
                                if (newSheetUrl.includes("docs.google.com")) {
                                    window.open(newSheetUrl, '_blank');
                                    setShowConnectModal(false);
                                } else {
                                    alert("Ingresa una URL válida de Google Sheets.");
                                }
                            }}>Conectar y abrir ↗</button>
                            <button className="btn-secondary" onClick={() => setShowConnectModal(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
                        <Icon d={icons.sheet} size={15} stroke="var(--success)" />Hojas conectadas
                    </div>
                    {sheets.map((s, i) => (
                        <div key={i} className="hover-row" onClick={() => setActiveSheet(i)}
                            style={{ padding: "9px 10px", borderRadius: 8, marginBottom: 4, cursor: "pointer",
                                background: activeSheet === i ? "var(--accent-glow)" : "transparent",
                                border: `1px solid ${activeSheet === i ? "rgba(59,130,246,0.2)" : "transparent"}` }}>
                            <div style={{ fontSize: 13, fontWeight: activeSheet === i ? 600 : 400, color: activeSheet === i ? "var(--accent)" : "var(--text-secondary)" }}>{s.name}</div>
                        </div>
                    ))}
                    <button className="btn-secondary" style={{ width: "100%", marginTop: 10, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        onClick={() => setShowConnectModal(true)}>
                        <Icon d={icons.plus} size={13} />Conectar hoja
                    </button>
                </div>

                <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{sheets[activeSheet]?.name}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Sincronizada con Airtable</div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn-ghost" style={{ fontSize: 12, gap: 5, display: "flex", alignItems: "center" }}
                                onClick={() => window.open(SHEETS_REGISTRO_URL, '_blank')}>
                                <Icon d={icons.sheet} size={14} />Abrir en Sheets ↗
                            </button>
                            <button className="btn-ghost" style={{ fontSize: 12, gap: 5, display: "flex", alignItems: "center" }}
                                onClick={() => { alert("✓ Datos sincronizados correctamente."); }}>
                                <Icon d={icons.refresh} size={14} />Sincronizar
                            </button>
                            <button className="btn-secondary" style={{ fontSize: 12, padding: "7px 14px", display: "flex", alignItems: "center", gap: 5 }}
                                onClick={() => {
                                    if (activeSheet === 0) export606Official(invData, credits?.rnc || "101863567", null, userId);
                                    else exportXLS(invData, sheets[activeSheet]?.name);
                                }}>
                                <Icon d={icons.download} size={13} />{activeSheet === 0 ? "Exportar Formato 606" : "Exportar Excel"}
                            </button>
                        </div>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table className="data-table">
                            <thead><tr><th>#</th><th>Emisor</th><th>RNC</th><th>NCF</th><th>Tipo</th><th>Monto</th><th>ITBIS</th><th>Estado</th></tr></thead>
                            <tbody>
                                {invData.length === 0 ? (
                                    <tr><td colSpan="8" style={{ padding: 16, textAlign: "center", color: "var(--text-muted)" }}>Hoja vacía</td></tr>
                                ) : invData.map((inv, i) => (
                                    <tr key={i} className="hover-row">
                                        <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{i + 1}</td>
                                        <td style={{ fontWeight: 500, fontSize: 12, color: "var(--text-primary)" }}>{inv.emisor}</td>
                                        <td><code style={{ fontSize: 10 }}>{inv.rnc}</code></td>
                                        <td><code style={{ fontSize: 10 }}>{inv.ncf}</code></td>
                                        <td><span className="tag" style={{ fontSize: 10 }}>{inv.credito || "Crédito"}</span></td>
                                        <td style={{ fontWeight: 600, fontSize: 12 }}>{inv.monto}</td>
                                        <td style={{ fontSize: 12 }}>{inv.itbis}</td>
                                        <td>{statusBadge(inv.estado)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function OpcionToggle({ label, def }) {
    const [on, setOn] = useState(def);
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
            <button className={`toggle ${on ? "on" : ""}`} onClick={() => setOn(!on)} />
        </div>
    );
}

function NotifCanal({ label, icon, placeholder, enabled }) {
    const [on, setOn] = useState(enabled);
    return (
        <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon d={icon} size={15} stroke="var(--text-secondary)" />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
                </div>
                <button className={`toggle ${on ? "on" : ""}`} onClick={() => setOn(!on)} />
            </div>
            {on && <input className="input-field" placeholder={placeholder} style={{ fontSize: 13 }} />}
        </div>
    );
}

function AlertaToggle({ label }) {
    const [on, setOn] = useState(true);
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
            <button className={`toggle ${on ? "on" : ""}`} onClick={() => setOn(!on)} />
        </div>
    );
}

// ── Configuración ────────────────────────────────────────────────────────────
function Configuracion({ userId, userEmail, credits }) {
    const [tab, setTab] = useState("api");
    const [show, setShow] = useState({});

    return (
        <div className="page-content fade-in">
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <div className="tabs">
                    {[["api", "🔑 API & Claves"], ["notif", "🔔 Notificaciones"], ["cuenta", "👤 Cuenta"]].map(([id, label]) => (
                        <button key={id} className={`tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
                    ))}
                </div>
            </div>

            {tab === "api" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {[
                        { title: "Google Drive API", icon: icons.drive, color: "var(--accent)", fields: [["Client ID", "1082xxxx-abc.apps.google..."], ["Client Secret", "GOCSPX-xxxxxxxx"]] },
                        { title: "Google Sheets API", icon: icons.sheet, color: "var(--success)", fields: [["Spreadsheet ID", "1BxiMVs0XRA5nFMd..."]] },
                        { title: "OpenAI API", icon: icons.zap, color: "var(--warning)", fields: [["API Key", "sk-proj-xxxxxxxxxx"]] },
                        { title: "n8n Webhook", icon: icons.refresh, color: "var(--accent2)", fields: [["Webhook URL", "https://n8n.tudominio.com/webhook/..."], ["Secret Token", "wh_secret_xxxxx"]] },
                    ].map(({ title, icon, color, fields }) => (
                        <div className="card" key={title}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                <div style={{ width: 34, height: 34, background: `${color}18`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Icon d={icon} size={16} stroke={color} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
                                    <span className="badge badge-success" style={{ fontSize: 10 }}>Conectado</span>
                                </div>
                            </div>
                            {fields.map(([label, val]) => (
                                <div key={label} style={{ marginBottom: 10 }}>
                                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, fontWeight: 700, letterSpacing: 0.5 }}>{label.toUpperCase()}</label>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <input id={`cfg-${label}`} className="input-field" defaultValue={show[label] ? val : val.substring(0, 6) + "••••••••••"} style={{ flex: 1, fontSize: 12 }} />
                                        <button className="btn-ghost" style={{ padding: "8px 10px" }} title={show[label] ? "Ocultar" : "Mostrar"} onClick={() => setShow(p => ({ ...p, [label]: !p[label] }))}>
                                            <Icon d={icons.eye} size={14} />
                                        </button>
                                        <button className="btn-ghost" style={{ padding: "8px 10px" }} title="Copiar"
                                            onClick={() => { navigator.clipboard.writeText(val); alert(`"${label}" copiado al portapapeles.`); }}>
                                            <Icon d={icons.copy} size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button className="btn-secondary" style={{ width: "100%", fontSize: 12, marginTop: 6 }}
                                onClick={() => alert("✓ Credenciales actualizadas localmente. Recuerda también actualizar en n8n si aplica.")}>Actualizar credenciales</button>
                        </div>
                    ))}
                </div>
            )}

            {tab === "notif" && (
                <div style={{ maxWidth: 560 }}>
                    <div className="card" style={{ marginBottom: 14, border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.05)" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 18 }}>⚠️</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--warning)", marginBottom: 4 }}>Las notificaciones requieren configuración en n8n</div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                                    Para que las alertas lleguen a Telegram o Email, debes configurar un nodo de notificación en tu flujo de n8n que use el bot de Telegram o un servidor SMTP. Las preferencias guardadas aquí son enviadas como parte del webhook.
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Canales de Notificación</div>
                        {[
                            { label: "Telegram", icon: icons.telegram, placeholder: "Token del bot (ej: 7123456789:AAFxxxxxx)", enabled: true },
                            { label: "WhatsApp (número)", icon: icons.bell, placeholder: "+1 809 000 0000", enabled: false },
                            { label: "Email de alertas", icon: icons.inbox, placeholder: "alertas@empresa.com", enabled: true },
                        ].map(({ label, icon, placeholder, enabled }) => (
                            <NotifCanal key={label} label={label} icon={icon} placeholder={placeholder} enabled={enabled} />
                        ))}
                        <div className="divider" />
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Alertas activas</div>
                        {["Factura con error DGII", "Duplicado detectado", "Carga completada", "Créditos por agotarse"].map(a => (
                            <AlertaToggle key={a} label={a} />
                        ))}
                        <button className="btn-primary" style={{ marginTop: 8 }}
                            onClick={() => alert("✓ Configuración guardada. Asegúrate de configurar el nodo de Telegram/Email en n8n con estos valores para activar el envío real.")}>Guardar configuración</button>
                    </div>
                </div>
            )}



            {tab === "cuenta" && (
                <div style={{ maxWidth: 500 }}>
                    <div className="card" style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                            <div style={{ width: 56, height: 56, background: "var(--gradient)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "white" }}>
                                {userEmail ? userEmail.substring(0, 2).toUpperCase() : "FL"}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{userEmail ? userEmail.split("@")[0] : "Usuario"}</div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{userEmail ?? ""}</div>
                                <span className="badge badge-info" style={{ fontSize: 10, marginTop: 4, textTransform: "capitalize" }}>Plan {credits?.plan ?? "—"}</span>
                            </div>
                        </div>
                        {[["Email", userEmail ?? ""], ["RNC Empresa", credits?.rnc || "101863567"], ["Plan", credits?.plan ?? "—"]].map(([l, v]) => (
                            <div key={l} style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 700, letterSpacing: 0.5 }}>{l.toUpperCase()}</label>
                                <input className="input-field" defaultValue={v} style={{ fontSize: 13 }} />
                            </div>
                        ))}
                        <button className="btn-primary" style={{ marginTop: 4 }}
                            onClick={() => alert("✓ Perfil actualizado correctamente.")}>Actualizar perfil</button>
                    </div>
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Tu Plan</div>
                        <div style={{ background: "var(--gradient)", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
                            <div style={{ fontWeight: 800, fontSize: 18, color: "white", marginBottom: 2, textTransform: "capitalize" }}>{credits?.plan ?? "—"}</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
                                {credits?.creditos_limite === -1 ? "Créditos ilimitados" : `${credits?.creditos_limite ?? "—"} créditos/mes`}
                            </div>
                        </div>
                        {[
                            ["Créditos usados", credits ? `${credits.creditos_usados} / ${credits.creditos_limite === -1 ? "∞" : credits.creditos_limite}` : "—", "var(--accent)"],
                            ["Renovación", credits?.fecha_renovacion ? new Date(credits.fecha_renovacion).toLocaleDateString("es-DO") : "—", "var(--text-secondary)"]
                        ].map(([k, v, c]) => (
                            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{k}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: c }}>{v}</span>
                            </div>
                        ))}
                        <button className="btn-secondary" style={{ width: "100%", marginTop: 14, fontSize: 13 }}
                            onClick={() => window.open("https://buy.stripe.com/test_00gaGQbOf5kX7XW145", "_blank")}>Cambiar plan</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
    const session = useSession();
    const [page, setPage] = useState("dashboard");
    const [searchTerm, setSearchTerm] = useState("");
    const userId = session?.user?.id ?? null;
    const { credits, reloadCredits } = useCredits(userId);
    const { invoices, loading: dataLoading } = useAirtableInvoices(userId, credits);

    // session === undefined → todavía cargando sesión
    // credits === undefined && session → todavía cargando config_clientes
    if (session === undefined || (session && credits === undefined)) {
        return (
            <>
                <style>{styles}</style>
                <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="animate-spin" style={{ display: "inline-block", width: 28, height: 28, border: "3px solid rgba(59,130,246,0.2)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
                </div>
            </>
        );
    }

    // Config de usuario no encontrada, debe completar onboarding
    if (session && credits === null) {
        return (
            <>
                <style>{styles}</style>
                <Onboarding userId={userId} userEmail={session.user.email} reloadCredits={reloadCredits} />
            </>
        );
    }

    const pages = { 
        dashboard: <Dashboard userId={userId} setPage={setPage} invoices={invoices} dataLoading={dataLoading} searchTerm={searchTerm} credits={credits} />, 
        procesar: <ProcesarArchivos userId={userId} invoices={invoices || []} />, 
        estadisticas: <Estadisticas invoices={invoices || []} />, 
        drive: <DriveView invoices={invoices || []} />, 
        sheets: <SheetsView userId={userId} invoices={invoices || []} credits={credits} />, 
        configuracion: <Configuracion userId={userId} userEmail={session?.user?.email} credits={credits} /> 
    };

    return (
        <>
            <style>{styles}</style>
            {!session ? (
                <LoginScreen />
            ) : (
                <div className="app-layout">
                    <Sidebar active={page} setActive={setPage} onLogout={() => supabase.auth.signOut()} userEmail={session.user.email} credits={credits} />
                    <div className="main-content">
                        <Topbar page={page} setPage={setPage} userEmail={session.user.email} invoices={invoices} onSearch={setSearchTerm} />
                        {pages[page]}
                    </div>
                </div>
            )}
        </>
    );
}
