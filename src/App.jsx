import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { sanitizePlan, sanitizeUUID } from "./utils/sanitize";
import { updateInvoiceInAirtable } from "./utils/airtableActions";
import { Icon } from "./components/common/Icon";
import { icons } from "./lib/icons";
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
import { InstalliOSPrompt } from "./components/InstalliOSPrompt";

export default function App() {
    const { session, authEvent } = useSession();
    const [page, setPage] = useState("dashboard");
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        if (authEvent === "PASSWORD_RECOVERY") {
            setIsResetting(true);
        }
    }, [authEvent]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isGlobalLocked, setIsGlobalLocked] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem("fluxia-theme") || "dark");
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [toasts, setToasts] = useState([]);
    const [confirmConfig, setConfirmConfig] = useState({ show: false, title: "", message: "", onConfirm: null });
    const [mockInvoices, setMockInvoices] = useState([]);
    
    // Default al mes en curso
    // Lógica de "Mes Inteligente" para contabilidad
    const today = new Date();
    let targetMonth = today.getMonth();
    let targetYear = today.getFullYear();

    // Si estamos en los primeros 10 días del mes, mostrar el mes anterior (periodo de reporte de ITBIS)
    if (today.getDate() <= 10) {
        if (targetMonth === 0) {
            targetMonth = 11;
            targetYear -= 1;
        } else {
            targetMonth -= 1;
        }
    }

    const firstDay = new Date(targetYear, targetMonth, 1).toISOString().split('T')[0];
    const lastDay = new Date(targetYear, targetMonth + 1, 0).toISOString().split('T')[0];
    
    const [filters, setFilters] = useState({
        type: "todos", // todos, 606, 607
        status: "todos", // todos, valido, error
        dateRange: { from: firstDay, to: lastDay }
    });

    const addToast = useCallback((message, type = "info") => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const confirmAction = useCallback((title, message, onConfirm) => {
        setConfirmConfig({ show: true, title, message, onConfirm });
    }, []);
    
    // Cambio de Tema de la Aplicación
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("fluxia-theme", theme);
    }, [theme]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            addToast("Conexión recuperada ✅", "success");
        };
        const handleOffline = () => {
            setIsOnline(false);
            addToast("Sin conexión a internet ⚠️", "warning");
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [addToast]);

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

    // Notificación de Procesado Completado
    useEffect(() => {
        if (!invoices || invoices.length === 0) return;
        const lastCount = parseInt(localStorage.getItem("last_invoice_count") || "0");
        if (invoices.length > lastCount && lastCount > 0) {
            addToast(`✅ ¡Procesamiento completado! Se añadieron ${invoices.length - lastCount} nuevas facturas.`, "success");
        }
        localStorage.setItem("last_invoice_count", invoices.length.toString());
    }, [invoices, addToast]);

    // Detectar retorno desde Whop después de pago/cambio de plan
    useEffect(() => {
        if (!userId) return;
        const params = new URLSearchParams(window.location.search);
        const planParam = sanitizePlan(params.get("plan"));
        const idParam = sanitizeUUID(params.get("id"));
        if (!planParam || idParam !== userId) return;

        const PLAN_LIMITS = { basic: 150, pro: 500, premium: 2500 };
        const newLimit = PLAN_LIMITS[planParam];
        if (!newLimit) return;

        // Limpiar URL inmediatamente
        window.history.replaceState({}, "", "/");

        // Avisar al usuario; no alteramos la base de datos visualmente
        alert(`¡Bienvenido! Has comenzado tu prueba de Fluxia con 10 créditos. Tus límites (${newLimit} créditos) se activarán 100% al procesarse tu membresía.`);
    }, [userId]);

    const deleteInvoiceFromAirtable = async (airtableId) => {
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
                    addToast("Factura eliminada correctamente", "success");
                } else {
                    throw new Error("No se pudo eliminar de la base de datos");
                }
            } catch (err) { 
                console.error("Error deleting:", err);
                addToast("Error al eliminar: " + err.message, "error");
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
                    addToast("Factura actualizada correctamente", "success");
                }
            } catch (err) {
                console.error("Error editando factura:", err);
                addToast("Error al actualizar factura", "error");
            }
        }, "Editando Factura");
    };

    const displayInvoices = useMemo(() => {
        let filtered = [...(invoices || [])];

        // 1. Filtro de Texto (Buscador)
        if (searchTerm) {
            const lowSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(inv => {
                const emisor = inv?.emisor ? String(inv.emisor).toLowerCase() : "";
                const ncf = inv?.ncf ? String(inv.ncf).toLowerCase() : "";
                const rnc = inv?.rnc ? String(inv.rnc).toLowerCase() : "";
                return emisor.includes(lowSearch) || ncf.includes(lowSearch) || rnc.includes(lowSearch);
            });
        }

        // 2. Filtro de Tipo Fiscal (606/607)
        if (filters.type !== "todos") {
            filtered = filtered.filter(inv => inv.tipo_fiscal === filters.type);
        }

        // 3. Filtro de Estado (Valido/Error)
        if (filters.status !== "todos") {
            filtered = filtered.filter(inv => {
                const isError = inv.estado === "error"; // Ajustar según lógica real de error
                return filters.status === "error" ? isError : !isError;
            });
        }

        // 4. Filtro de Fecha (Desde/Hasta)
        const parseDateToISO = (dateStr) => {
            if (!dateStr || typeof dateStr !== "string" || dateStr === "—") return "";
            if (dateStr.includes("-")) return dateStr; // Already YYYY-MM-DD
            const parts = dateStr.split("/");
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert DD/MM/YYYY to YYYY-MM-DD
            return dateStr;
        };

        if (filters.dateRange.from) {
            filtered = filtered.filter(inv => parseDateToISO(inv.fecha) >= filters.dateRange.from);
        }
        if (filters.dateRange.to) {
            filtered = filtered.filter(inv => parseDateToISO(inv.fecha) <= filters.dateRange.to);
        }

        return filtered;
    }, [invoices, searchTerm, filters]);

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
            rawInvoices={invoices}
            mockInvoices={mockInvoices}
            setMockInvoices={setMockInvoices}
            dataLoading={dataLoading} 
            credits={credits} 
            selectedClient={selectedClient} 
            reloadInvoices={reloadInvoices} 
            deleteInvoice={deleteInvoiceFromAirtable} 
            editInvoice={editInvoiceInAirtable} 
            filters={filters}
            setFilters={setFilters}
            confirmAction={confirmAction}
        />,
        procesar: <ProcesarArchivos setPage={setPage} userId={userId} selectedClient={selectedClient} credits={credits} reloadInvoices={reloadInvoices} withGlobalLock={withGlobalLock} isGlobalLocked={isGlobalLocked} />,
        clientes: <ClientsView userId={userId} clients={clients} reloadClients={reloadClients} setSelectedClient={setSelectedClient} setPage={setPage} selectedClient={selectedClient} clientsLoading={clientsLoading} credits={credits} />,
        estadisticas: <Estadisticas invoices={displayInvoices} />,
        drive: <DriveView invoices={displayInvoices} />,
        sheets: <SheetsView 
            invoices={displayInvoices} 
            reloadInvoices={reloadInvoices} 
            deleteInvoice={deleteInvoiceFromAirtable} 
            editInvoice={editInvoiceInAirtable} 
            dataLoading={dataLoading} 
            credits={credits} 
            selectedClient={selectedClient} 
            filters={filters}
            setFilters={setFilters}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            confirmAction={confirmAction}
        />,
        reportes: <Reporteria invoices={displayInvoices} credits={credits} selectedClient={selectedClient} />,
        configuracion: <Configuracion userId={userId} userEmail={session?.user?.email} credits={credits} reloadCredits={reloadCredits} />,
        it1: <IT1View 
            invoices={displayInvoices} 
            credits={credits} 
            selectedClient={selectedClient} 
            userId={userId} 
            periodo={filters.period} 
            refreshData={reloadInvoices}
            addToast={addToast}
            confirmAction={confirmAction}
        />,
        desgloses: <DesglosesView invoices={displayInvoices} loading={dataLoading} credits={credits} />
    };

    return (
        <>
            {!session || isResetting ? (
                <LoginScreen 
                    isResetting={isResetting} 
                    onResetDone={() => {
                        setIsResetting(false);
                        window.location.href = "/";
                    }} 
                />
            ) : (
                <div className="app-layout" style={{ filter: isGlobalLocked ? "grayscale(0.5) opacity(0.8)" : "none", pointerEvents: isGlobalLocked ? "none" : "auto", transition: "all 0.3s ease" }}>
                    {!isOnline && (
                        <div style={{ position: "fixed", top: 0, left: 0, right: 0, background: "var(--danger)", color: "white", padding: "8px", textAlign: "center", zIndex: 10000, fontSize: 12 }}>
                            ⚠️ Estás trabajando sin conexión. Algunos cambios podrían no guardarse.
                        </div>
                    )}
                    <div className="toast-container" style={{ position: "fixed", top: 20, right: 20, zIndex: 10000, display: "flex", flexDirection: "column", gap: 10 }}>
                        {toasts.map(t => (
                            <div key={t.id} className={`toast ${t.type}`} style={{ background: "var(--bg-card)", padding: "12px 20px", borderRadius: 8, border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
                                {t.message}
                            </div>
                        ))}
                    </div>

                    {confirmConfig.show && (
                        <div className="modal-overlay" style={{ zIndex: 11000 }}>
                            <div className="confirmation-card">
                                <div style={{ background: "rgba(239,68,68,0.1)", width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                                    <Icon d={icons.trash} size={32} style={{ color: "var(--danger)" }} />
                                </div>
                                <h2 className="font-display" style={{ fontSize: 22, color: "var(--text-primary)", marginBottom: 12 }}>{confirmConfig.title}</h2>
                                <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>{confirmConfig.message}</p>
                                <div style={{ display: "flex", gap: 12 }}>
                                    <button className="btn-secondary" style={{ flex: 1, padding: "12px" }} onClick={() => setConfirmConfig({ ...confirmConfig, show: false })}>Cancelar</button>
                                    <button className="btn-primary" style={{ flex: 1, background: "var(--danger)", padding: "12px" }} onClick={() => {
                                        confirmConfig.onConfirm();
                                        setConfirmConfig({ ...confirmConfig, show: false });
                                    }}>Confirmar</button>
                                </div>
                            </div>
                        </div>
                    )}

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
                        <div key={page} className="fade-in">
                            {pages[page]}
                        </div>
                    </div>
                    {isGlobalLocked && (
                        <div style={{ position: "fixed", top: 20, right: 20, background: "var(--bg-card)", border: "1px solid var(--border)", padding: "10px 16px", borderRadius: 12, boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", gap: 10, zIndex: 9999, animation: "slide-down 0.3s ease" }}>
                            <span className="animate-spin" style={{ width: 14, height: 14, border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Procesando...</span>
                        </div>
                    )}
                    <InstalliOSPrompt />
                </div>
            )}
        </>
    );
}
