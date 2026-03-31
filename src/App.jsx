import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { sanitizePlan, sanitizeUUID } from "./utils/sanitize";
import { updateInvoiceInAirtable } from "./utils/airtableActions";
import "./styles/App.css";

// Hooks
import { useSession } from "./hooks/useSession";
import { useCredits } from "./hooks/useCredits";
import { useClients } from "./hooks/useClients";
import { useAirtableInvoices } from "./hooks/useAirtableInvoices";

// Components
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { Dashboard } from "./components/Dashboard";
import { ProcesarArchivos } from "./components/ProcesarArchivos";
import { Estadisticas } from "./components/Estadisticas";
import { DriveView } from "./components/DriveView";
import { SheetsView } from "./components/SheetsView";
import { ClientsView } from "./components/ClientsView";
import { Configuracion } from "./components/Configuracion";
import { Reporteria } from "./components/Reporteria";
import { LoginScreen } from "./components/LoginScreen";
import { Onboarding } from "./components/Onboarding";
import { IT1View } from "./components/IT1View";
import { DesglosesView } from "./components/DesglosesView";

export default function App() {
    const session = useSession();
    const [page, setPage] = useState("dashboard");
    const [searchTerm, setSearchTerm] = useState("");
    const [isGlobalLocked, setIsGlobalLocked] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem("fluxia-theme") || "dark");
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [mockInvoices, setMockInvoices] = useState([]);

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };
    
    // Uygulama Teması Değişikliği
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("fluxia-theme", theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");
    
    const userId = session?.user?.id ?? null;
    const { credits, reloadCredits } = useCredits(userId);
    const { clients, reloadClients, loading: clientsLoading } = useClients(userId);
    const [selectedClient, setSelectedClient] = useState(null);
    const { invoices, setInvoices, loading: dataLoading, reloadInvoices } = useAirtableInvoices(userId, credits, selectedClient?.rnc);

    const withGlobalLock = useCallback(async (taskFn, taskName = "Operación") => {
        if (isGlobalLocked) {
            alert(`⏳ Por favor espera: Hay otra operación en curso (${taskName}).`);
            return;
        }
        setIsGlobalLocked(true);
        try {
            await taskFn();
        } finally {
            setTimeout(() => setIsGlobalLocked(false), 800);
        }
    }, [isGlobalLocked]);

    // useAirtableInvoices ya reacciona al cambio de selectedClient?.rnc internamente.
    // Se elimina el reload manual redundante para evitar dobles peticiones.

    // Detectar retorno desde Whop después de pago/cambio de plan
    useEffect(() => {
        if (!userId) return;
        const params = new URLSearchParams(window.location.search);
        const planParam = sanitizePlan(params.get("plan"));
        const idParam = sanitizeUUID(params.get("id"));
        if (!planParam || idParam !== userId) return;

        const PLAN_LIMITS = { basic: 200, pro: 500, premium: 3000 };
        const newLimit = PLAN_LIMITS[planParam];
        if (!newLimit) return;

        // Limpiar URL inmediatamente
        window.history.replaceState({}, "", "/");

        const updatePlan = async () => {
            try {
                const { error } = await supabase.from("config_clientes").update({
                    plan: planParam,
                    creditos_limite: newLimit,
                    creditos_usados: 0,
                    fecha_renovacion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }).eq("user_id", userId);
                if (error) throw error;
                reloadCredits();
                alert(`✅ ¡Plan actualizado a ${planParam.toUpperCase()} correctamente! Ahora tienes ${newLimit} créditos disponibles.`);
            } catch (err) {
                console.error("❌ Error actualizando plan:", err);
                alert("❌ Error al actualizar el plan: " + err.message);
            }
        };
        updatePlan();
    }, [userId, reloadCredits]);

    const deleteInvoiceFromAirtable = async (airtableId) => {
        if (!confirm("¿Estás seguro de que deseas eliminar esta factura?")) return;
        withGlobalLock(async () => {
            try {
                const token = import.meta.env.VITE_AIRTABLE_TOKEN;
                const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID || "appPfkS3Gi2CJEDuG";
                const tableId = import.meta.env.VITE_AIRTABLE_TABLE_ID || "tbl7XkZpew0ZU64rG";
                const res = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${airtableId}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (res.ok) {
                    // Actualización Optimista: Eliminar del estado local inmediatamente
                    if (setInvoices) {
                        setInvoices(prev => prev.filter(inv => inv.airtableId !== airtableId));
                    }
                    showToast("Factura eliminada correctamente", "success");
                } else {
                    throw new Error("No se pudo eliminar de la base de datos");
                }
            } catch (err) { 
                console.error("Error deleting:", err);
                showToast("Error al eliminar: " + err.message, "error");
            }
        }, "Eliminar Factura");
    };

    const editInvoiceInAirtable = async (airtableId, updatedFields) => {
        withGlobalLock(async () => {
            try {
                const res = await updateInvoiceInAirtable(airtableId, updatedFields);
                if (res) {
                    // Actualización Optimista: Actualizar localmente si es necesario 
                    // (aunque reloadInvoices se llama abajo, esto ayuda a la persistencia visual)
                    if (reloadInvoices) reloadInvoices();
                    showToast("Factura actualizada correctamente", "success");
                }
            } catch (err) {
                console.error("Error editando factura:", err);
                showToast("Error al actualizar factura", "error");
            }
        }, "Editando Factura");
    };

    const displayInvoices = useMemo(() => {
        const allInvs = [...(invoices || []), ...mockInvoices];
        if (!searchTerm) return allInvs;
        
        const lowSearch = searchTerm.toLowerCase();
        return allInvs.filter(inv => {
            const emisor = inv?.emisor ? String(inv.emisor).toLowerCase() : "";
            const ncf = inv?.ncf ? String(inv.ncf).toLowerCase() : "";
            const rnc = inv?.rnc ? String(inv.rnc).toLowerCase() : "";
            return emisor.includes(lowSearch) || ncf.includes(lowSearch) || rnc.includes(lowSearch);
        });
    }, [invoices, mockInvoices, searchTerm]);

    if (session === undefined || (session && credits === undefined)) {
        return (
            <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="animate-spin" style={{ display: "inline-block", width: 28, height: 28, border: "3px solid rgba(59,130,246,0.2)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
            </div>
        );
    }

    if (session && credits === null) {
        return <Onboarding userId={userId} userEmail={session.user.email} reloadCredits={reloadCredits} />;
    }

    const pages = {
        dashboard: <Dashboard 
            setPage={setPage} 
            invoices={displayInvoices} 
            mockInvoices={mockInvoices}
            setMockInvoices={setMockInvoices}
            dataLoading={dataLoading} 
            credits={credits} 
            selectedClient={selectedClient} 
            reloadInvoices={reloadInvoices} 
            deleteInvoice={deleteInvoiceFromAirtable} 
            editInvoice={editInvoiceInAirtable} 
        />,
        procesar: <ProcesarArchivos setPage={setPage} userId={userId} selectedClient={selectedClient} credits={credits} reloadInvoices={reloadInvoices} withGlobalLock={withGlobalLock} isGlobalLocked={isGlobalLocked} />,
        clientes: <ClientsView userId={userId} clients={clients} reloadClients={reloadClients} setSelectedClient={setSelectedClient} setPage={setPage} selectedClient={selectedClient} clientsLoading={clientsLoading} />,
        estadisticas: <Estadisticas invoices={displayInvoices} />,
        drive: <DriveView invoices={displayInvoices} />,
        sheets: <SheetsView invoices={displayInvoices} reloadInvoices={reloadInvoices} deleteInvoice={deleteInvoiceFromAirtable} editInvoice={editInvoiceInAirtable} dataLoading={dataLoading} credits={credits} selectedClient={selectedClient} />,
        reportes: <Reporteria invoices={displayInvoices} credits={credits} selectedClient={selectedClient} />,
        configuracion: <Configuracion userId={userId} userEmail={session?.user?.email} credits={credits} reloadCredits={reloadCredits} />,
        it1: <IT1View 
            invoices={displayInvoices} 
            selectedClient={selectedClient} 
            credits={credits} 
        />,
        desgloses: <DesglosesView invoices={displayInvoices} loading={dataLoading} credits={credits} />
    };

    return (
        <>
            {!session ? (
                <LoginScreen />
            ) : (
                <div className="app-layout" style={{ filter: isGlobalLocked ? "grayscale(0.5) opacity(0.8)" : "none", pointerEvents: isGlobalLocked ? "none" : "auto", transition: "all 0.3s ease" }}>
                    <Sidebar 
                        active={page} 
                        setActive={(p) => { setPage(p); setIsSidebarOpen(false); }} 
                        onLogout={() => supabase.auth.signOut()} 
                        userEmail={session.user.email} 
                        credits={credits}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />
                    <div className="main-content">
                        <Topbar
                            page={page} userEmail={session.user.email}
                            invoices={invoices} onSearch={setSearchTerm}
                            clients={clients} selectedClient={selectedClient} setSelectedClient={setSelectedClient}
                            onMenuClick={() => setIsSidebarOpen(true)}
                            theme={theme}
                            toggleTheme={toggleTheme}
                        />
                        {pages[page]}
                    </div>
                    {isGlobalLocked && (
                        <div style={{ position: "fixed", top: 20, right: 20, background: "var(--bg-card)", border: "1px solid var(--border)", padding: "10px 16px", borderRadius: 12, boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", gap: 10, zIndex: 9999, animation: "slide-down 0.3s ease" }}>
                            <span className="animate-spin" style={{ width: 14, height: 14, border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Procesando...</span>
                        </div>
                    )}

                    {toast.show && (
                        <div className={`toast-notification ${toast.type}`} style={{
                            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
                            background: toast.type === "success" ? "var(--success)" : "var(--danger)",
                            color: "white", padding: "12px 24px", borderRadius: 12, fontWeight: 700,
                            boxShadow: "0 10px 25px rgba(0,0,0,0.2)", zIndex: 10000,
                            display: "flex", alignItems: "center", gap: 10, animation: "slide-up 0.3s ease"
                        }}>
                            <div style={{ background: "rgba(255,255,255,0.2)", width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                                {toast.type === "success" ? "✓" : "!"}
                            </div>
                            {toast.message}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
