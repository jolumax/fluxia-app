import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useClients(userId) {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);

    const reloadClients = useCallback(() => setReload(r => r + 1), []);

    useEffect(() => {
        if (!userId) return;
        supabase
            .from("config_clientes_multi") 
            .select("*")
            .eq("user_id", userId)
            .then(({ data }) => {
                if (data) setClients(data);
                setLoading(false);
            });
    }, [userId, reload]);

    return { clients, setClients, loading, reloadClients };
}
