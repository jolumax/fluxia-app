import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useSession() {
    const [session, setSession] = useState(undefined); // undefined = cargando
    const [authEvent, setAuthEvent] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session ?? null));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
            setAuthEvent(_e);
            setSession(s ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);

    return { session, authEvent };
}
