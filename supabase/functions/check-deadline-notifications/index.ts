import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
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
        processos (numero)
      `)
      .eq("concluido", false)
      .in("data", [todayStr, oneDayStr, threeDaysStr]);

    if (prazosError) {
      console.error("Error fetching prazos:", prazosError);
      throw prazosError;
    }

    console.log(`Found ${prazos?.length || 0} deadlines to check`);

    const notificationsCreated: string[] = [];

    for (const prazo of prazos || []) {
      // Check if notification already exists for this prazo today
      const notificationKey = `prazo_${prazo.id}_${todayStr}`;
      
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
        message: `Checked ${prazos?.length || 0} deadlines, created ${notificationsCreated.length} notifications`,
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
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
