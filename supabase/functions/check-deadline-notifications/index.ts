import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// Simple in-memory rate limiter (resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5; // max 5 calls per minute

const isRateLimited = (key: string): boolean => {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
};

// Constant-time string comparison to prevent timing attacks
const safeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

// API key verification for cron job authentication
const verifyApiKey = (req: Request): boolean => {
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = Deno.env.get("CRON_API_KEY");
  
  // If no CRON_API_KEY is set, require the service role key in Authorization header
  if (!expectedKey) {
    const authHeader = req.headers.get("authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authHeader || !serviceKey) return false;
    return safeCompare(authHeader, `Bearer ${serviceKey}`);
  }
  
  if (!apiKey) return false;
  return safeCompare(apiKey, expectedKey);
};

const getBearerToken = (req: Request) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientId = req.headers.get("x-api-key") ? "api-key" : "auth-header";
  if (isRateLimited(clientId)) {
    console.warn("Rate limit exceeded for check-deadline-notifications");
    return new Response(
      JSON.stringify({ success: false, error: "Rate limit exceeded" }),
      {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const bearerToken = getBearerToken(req);
    const authenticatedViaApiKey = verifyApiKey(req);

    let targetUserId: string | null = null;

    if (!authenticatedViaApiKey && bearerToken) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        },
      });

      const { data: authData, error: authError } = await authClient.auth.getUser();

      if (authError || !authData.user) {
        console.error("Unauthorized: invalid bearer token");
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      targetUserId = authData.user.id;
    } else if (!authenticatedViaApiKey) {
      console.error("Unauthorized: Invalid or missing API key");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    // Calculate dates for notifications
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    const threeDaysStr = threeDaysFromNow.toISOString().split("T")[0];

    const oneDayFromNow = new Date(today);
    oneDayFromNow.setDate(today.getDate() + 1);
    const oneDayStr = oneDayFromNow.toISOString().split("T")[0];

    console.log("Checking deadlines for dates:", { todayStr, oneDayStr, threeDaysStr });

    // Fetch all non-completed deadlines that are due today, tomorrow, or in 3 days
    const { data: prazos, error: prazosError } = await supabase
      .from("prazos")
      .select(`
        id,
        user_id,
        titulo,
        data,
        prioridade,
        tipo,
        concluido,
        processo_id,
        processos!fk_prazos_processo (numero)
      `)
      .eq("concluido", false)
      .in("data", [todayStr, oneDayStr, threeDaysStr]);

    if (prazosError) {
      console.error("Error fetching prazos:", prazosError);
      throw prazosError;
    }

    const prazosFiltrados = (prazos || []).filter((prazo) =>
      targetUserId ? prazo.user_id === targetUserId : true
    );

    console.log(`Found ${prazosFiltrados.length} deadlines to check`);

    const notificationsCreated: string[] = [];

    for (const prazo of prazosFiltrados) {
      const { data: existingNotification } = await supabase
        .from("notificacoes")
        .select("id")
        .eq("user_id", prazo.user_id)
        .eq("link", `/prazos?id=${prazo.id}`)
        .gte("created_at", `${todayStr}T00:00:00`)
        .lte("created_at", `${todayStr}T23:59:59`)
        .maybeSingle();

      if (existingNotification) {
        console.log(`Notification already exists for prazo ${prazo.id}`);
        continue;
      }

      // Determine notification type based on date
      let titulo = "";
      let mensagem = "";
      let tipo = "aviso";

      const prazoDate = new Date(prazo.data);
      const diffDays = Math.ceil((prazoDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const processo = Array.isArray(prazo.processos) ? prazo.processos[0] : prazo.processos;
      const processoNumero = processo?.numero ? ` (Processo: ${processo.numero})` : "";

      if (diffDays === 0) {
        titulo = "⚠️ Prazo vence HOJE!";
        mensagem = `O prazo "${prazo.titulo}" vence hoje!${processoNumero}`;
        tipo = "urgente";
      } else if (diffDays === 1) {
        titulo = "🔔 Prazo vence amanhã";
        mensagem = `O prazo "${prazo.titulo}" vence amanhã.${processoNumero}`;
        tipo = "aviso";
      } else if (diffDays === 3) {
        titulo = "📅 Prazo em 3 dias";
        mensagem = `O prazo "${prazo.titulo}" vence em 3 dias.${processoNumero}`;
        tipo = "info";
      }

      if (titulo) {
        const { error: insertError } = await supabase
          .from("notificacoes")
          .insert({
            user_id: prazo.user_id,
            titulo,
            mensagem,
            tipo,
            link: `/prazos?id=${prazo.id}`,
            lida: false,
          });

        if (insertError) {
          console.error(`Error creating notification for prazo ${prazo.id}:`, insertError);
        } else {
          console.log(`Created notification for prazo ${prazo.id}: ${titulo}`);
          notificationsCreated.push(prazo.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${prazosFiltrados.length} deadlines, created ${notificationsCreated.length} notifications`,
        notifications_created: notificationsCreated,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-deadline-notifications:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
