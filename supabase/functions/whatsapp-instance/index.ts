/**
 * whatsapp-instance
 *
 * Gerencia o ciclo de vida da instância WhatsApp via Evolution API.
 * Ações suportadas (campo "action" no body):
 *   get        – retorna o estado atual da instância (default)
 *   create     – cria uma nova instância e exibe o QR code
 *   refresh    – sincroniza o estado com a Evolution API
 *   disconnect – faz logout da sessão (mantém a instância no DB)
 *   delete     – remove a instância da Evolution API e do DB
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl        = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey    = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const evolutionApiUrl    = Deno.env.get("EVOLUTION_API_URL")!;
    const evolutionApiKey    = Deno.env.get("EVOLUTION_API_KEY")!;

    // ── Autenticação JWT ──────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json().catch(() => ({}));
    const { action = "get", escritorioId } = body as {
      action?: string;
      escritorioId?: string;
    };

    if (!escritorioId) {
      return json({ error: "escritorioId obrigatório" }, 400);
    }

    // ── Verificar pertencimento ao escritório ─────────────────────────────────
    const { data: membership } = await supabase
      .from("escritorio_membros")
      .select("id")
      .eq("escritorio_id", escritorioId)
      .eq("user_id", authData.user.id)
      .eq("status", "ativo")
      .maybeSingle();

    if (!membership) {
      return json({ error: "Forbidden" }, 403);
    }

    // ── Buscar instância existente ────────────────────────────────────────────
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("escritorio_id", escritorioId)
      .maybeSingle();

    // ── action: get ───────────────────────────────────────────────────────────
    if (action === "get") {
      return json({ instance });
    }

    // ── action: create ────────────────────────────────────────────────────────
    if (action === "create") {
      if (instance) {
        return json({ error: "Instância já existe para este escritório" }, 409);
      }

      const shortId      = escritorioId.replace(/-/g, "").slice(0, 12);
      const instanceName = `legalflow-${shortId}`;
      const webhookSecret = crypto.randomUUID();
      const webhookUrl    = `${supabaseUrl}/functions/v1/whatsapp-webhook`;

      // Criar instância na Evolution API
      const evoRes = await fetch(`${evolutionApiUrl}/instance/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": evolutionApiKey,
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });

      if (!evoRes.ok) {
        const err = await evoRes.text();
        console.error("Evolution API error (create):", err);
        return json({ error: "Falha ao criar instância na Evolution API" }, 502);
      }

      const evoData   = await evoRes.json();
      const qrBase64  = evoData?.qrcode?.base64 ?? null;
      const qrExpires = qrBase64
        ? new Date(Date.now() + 60_000).toISOString()
        : null;

      // Registrar webhook na Evolution API
      await fetch(`${evolutionApiUrl}/webhook/set/${instanceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": evolutionApiKey,
        },
        body: JSON.stringify({
          url: webhookUrl,
          webhook_by_events: true,
          webhook_base64: false,
          events: [
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "CONNECTION_UPDATE",
            "QRCODE_UPDATED",
          ],
          headers: { "x-webhook-secret": webhookSecret },
        }),
      });

      // Persistir no banco
      const { data: newInstance, error: insertError } = await supabase
        .from("whatsapp_instances")
        .insert({
          escritorio_id: escritorioId,
          instance_name: instanceName,
          status:        qrBase64 ? "qr_pending" : "connecting",
          qr_code:       qrBase64,
          qr_expires_at: qrExpires,
          webhook_secret: webhookSecret,
        })
        .select()
        .single();

      if (insertError) {
        console.error("DB insert error:", insertError);
        return json({ error: "Falha ao salvar instância" }, 500);
      }

      return json({ instance: newInstance });
    }

    // ── action: refresh ───────────────────────────────────────────────────────
    if (action === "refresh") {
      if (!instance) return json({ error: "Nenhuma instância encontrada" }, 404);

      const stateRes = await fetch(
        `${evolutionApiUrl}/instance/connectionState/${instance.instance_name}`,
        { headers: { "apikey": evolutionApiKey } },
      );

      if (!stateRes.ok) {
        await supabase
          .from("whatsapp_instances")
          .update({ status: "error" })
          .eq("id", instance.id);
        return json({ error: "Falha ao buscar estado na Evolution API" }, 502);
      }

      const stateData = await stateRes.json();
      const evoState  = stateData?.instance?.state;

      let newStatus: string = instance.status;
      if (evoState === "open")       newStatus = "connected";
      else if (evoState === "close") newStatus = "disconnected";
      else if (evoState === "connecting") newStatus = "connecting";

      const { data: updated } = await supabase
        .from("whatsapp_instances")
        .update({ status: newStatus })
        .eq("id", instance.id)
        .select()
        .single();

      return json({ instance: updated });
    }

    // ── action: disconnect ────────────────────────────────────────────────────
    if (action === "disconnect") {
      if (!instance) return json({ error: "Nenhuma instância encontrada" }, 404);

      await fetch(`${evolutionApiUrl}/instance/logout/${instance.instance_name}`, {
        method: "DELETE",
        headers: { "apikey": evolutionApiKey },
      });

      const { data: updated } = await supabase
        .from("whatsapp_instances")
        .update({ status: "disconnected", phone_number: null, qr_code: null })
        .eq("id", instance.id)
        .select()
        .single();

      return json({ instance: updated });
    }

    // ── action: delete ────────────────────────────────────────────────────────
    if (action === "delete") {
      if (!instance) return json({ error: "Nenhuma instância encontrada" }, 404);

      await fetch(`${evolutionApiUrl}/instance/delete/${instance.instance_name}`, {
        method: "DELETE",
        headers: { "apikey": evolutionApiKey },
      });

      await supabase
        .from("whatsapp_instances")
        .delete()
        .eq("id", instance.id);

      return json({ success: true });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (error: unknown) {
    console.error("Error in whatsapp-instance:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
