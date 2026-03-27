import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useCredits(userId) {
    const [credits, setCredits] = useState(undefined); 
    const [reload, setReload] = useState(0);

    const reloadCredits = useCallback(() => setReload(r => r + 1), []);

    useEffect(() => {
        if (!userId) return;

        async function loadConfig() {
            try {
                const { data: config, error: configErr } = await supabase
                    .from("config_clientes")
                    .select("*")
                    .eq("user_id", userId)
                    .single();

                if (configErr && configErr.code !== 'PGRST116') throw configErr;
                if (!config) { setCredits(null); return; }

                const { data: user, error: userErr } = await supabase
                    .from("usuarios")
                    .select("rnc_empresa")
                    .eq("id", userId)
                    .single();

                setCredits({
                    ...config,
                    rnc: user?.rnc_empresa || ""
                });

            } catch (err) {
                console.error("❌ Error cargando configuración:", err);
                setCredits(null);
            }
        }

        loadConfig();
    }, [userId, reload]);
    return { credits, setCredits, reloadCredits };
}
