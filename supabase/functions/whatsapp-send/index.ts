/**
 * whatsapp-send
 *
 * Envia uma mensagem de texto para um cliente via Evolution API e registra
 * o envio na tabela `comunicacoes`.
 *
 * Body esperado:
 *   { escritorioId, clienteId, message, processoId? }
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

// ── Rate limiter: máx 30 mensagens/min por escritório ─────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now   = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 30;
}

// ── Normaliza número brasileiro para o formato wa.me ─────────────────────────
function formatPhone(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  return digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
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

    const body = await req.json().catch(() => ({}));
    const { escritorioId, clienteId, processoId, message } = body as {
      escritorioId?: string;
      clienteId?: string;
      processoId?: string | null;
      message?: string;
    };

    if (!escritorioId || !clienteId || !message?.trim()) {
      return json({ error: "escritorioId, clienteId e message são obrigatórios" }, 400);
    }

    // ── Rate limiting ─────────────────────────────────────────────────────────
    if (isRateLimited(escritorioId)) {
      return json(
        { error: "Limite de envio atingido. Máximo 30 mensagens por minuto." },
        429,
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // ── Verificar instância conectada ─────────────────────────────────────────
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("escritorio_id", escritorioId)
      .maybeSingle();

    if (!instance || instance.status !== "connected") {
      return json(
        {
          error:
            "WhatsApp não está conectado. Conecte na tela de Configurações antes de enviar.",
        },
        409,
      );
    }

    // ── Buscar telefone do cliente ────────────────────────────────────────────
    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select("nome, telefone")
      .eq("id", clienteId)
      .eq("escritorio_id", escritorioId)
      .maybeSingle();

    if (clienteError || !cliente) {
      return json({ error: "Cliente não encontrado" }, 404);
    }

    const number = formatPhone(cliente.telefone);

    // ── Enviar mensagem via Evolution API ─────────────────────────────────────
    const sendRes = await fetch(
      `${evolutionApiUrl}/message/sendText/${instance.instance_name}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": evolutionApiKey,
        },
        body: JSON.stringify({ number, text: message.trim() }),
      },
    );

    if (!sendRes.ok) {
      const err = await sendRes.text();
      console.error("Evolution API send error:", err);
      return json({ error: "Falha ao enviar mensagem pelo WhatsApp" }, 502);
    }

    const sendData  = await sendRes.json();
    const messageId = sendData?.key?.id ?? null;

    // ── Registrar em comunicacoes ─────────────────────────────────────────────
    const today = new Date().toISOString().split("T")[0];
    const hora  = new Date().toTimeString().slice(0, 5);

    const { data: comunicacao, error: logError } = await supabase
      .from("comunicacoes")
      .insert({
        user_id:             authData.user.id,
        escritorio_id:       escritorioId,
        cliente_id:          clienteId,
        processo_id:         processoId ?? null,
        tipo:                "whatsapp",
        direcao:             "saida",
        assunto:             message.trim().slice(0, 80),
        descricao:           message.trim(),
        data:                today,
        hora:                hora,
        whatsapp_message_id: messageId,
        whatsapp_status:     "sent",
      })
      .select()
      .single();

    if (logError) {
      // Não falhar — a mensagem já foi enviada
      console.error("Erro ao registrar comunicacao:", logError);
    }

    return json({ success: true, messageId, comunicacaoId: comunicacao?.id ?? null });
  } catch (error: unknown) {
    console.error("Error in whatsapp-send:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
