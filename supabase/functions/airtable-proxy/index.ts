import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "./shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const AIRTABLE_TOKEN = Deno.env.get("AIRTABLE_TOKEN");

Deno.serve(async (req) => {
    // Manejo de CORS explícito
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    console.log("Edge Function Executing! Received request.");

    try {
        // Manual JWT verification for debugging 401 errors
        const authHeader = req.headers.get('Authorization');
        console.log("Authorization Header Present?", !!authHeader);
        
        if (!authHeader) {
            console.error("No authorization header found!");
            return new Response(JSON.stringify({ error: "Missing authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Initialize supabase client to verify token
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const token = authHeader.replace('Bearer ', '');
        
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            console.error("Manual Auth Error:", authError);
            return new Response(JSON.stringify({ error: "Invalid token", details: authError }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log("User authorized manually:", user.id);

        const body = await req.json();
        const { action, endpoint, payload } = body;

        if (!action || !endpoint) {
            return new Response(JSON.stringify({ error: "Missing action or endpoint" }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const url = `https://api.airtable.com/v0/${endpoint}`;
        
        let fetchOptions: RequestInit = {
            method: action,
            headers: {
                Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                "Content-Type": "application/json",
            },
        };

        if (action !== "GET" && action !== "HEAD" && payload) {
            fetchOptions.body = JSON.stringify(payload);
        }

        console.log(`Sending to Airtable: ${action} ${url}`);
        const res = await fetch(url, fetchOptions);
        
        console.log(`Airtable replied with status: ${res.status}`);
        const data = await res.json();
        
        return new Response(JSON.stringify(data), {
            status: res.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("Function error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
