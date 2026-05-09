/**
 * whatsapp-webhook
 *
 * Endpoint público chamado pela Evolution API quando eventos WhatsApp ocorrem.
 * Autenticação via `x-webhook-secret` (sem JWT — é server-to-server).
 *
 * Eventos tratados:
 *   CONNECTION_UPDATE  – atualiza status da instância no DB
 *   QRCODE_UPDATED     – armazena novo QR code no DB
 *   MESSAGES_UPSERT    – registra mensagens recebidas em `comunicacoes`
 *   MESSAGES_UPDATE    – atualiza whatsapp_status (delivered/read/failed)
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const supabaseUrl        = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase           = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json().catch(() => null);
    if (!payload) {
      return new Response("Invalid JSON", { status: 400 });
    }

    const instanceName: string = payload?.instance ?? "";
    const event: string        = (payload?.event ?? "").toLowerCase();

    console.log(`Webhook: ${event} para instância: ${instanceName}`);

    if (!instanceName || !event) {
      return new Response("Missing instance or event", { status: 400 });
    }

    // ── Buscar instância no DB ────────────────────────────────────────────────
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("instance_name", instanceName)
      .maybeSingle();

    if (!instance) {
      // Instância desconhecida — aceitar silenciosamente para evitar retentativas
      console.warn(`Instância desconhecida: ${instanceName}`);
      return new Response("OK", { status: 200 });
    }

    // ── Validar webhook secret ────────────────────────────────────────────────
    const incomingSecret = req.headers.get("x-webhook-secret");
    if (incomingSecret !== instance.webhook_secret) {
      console.error(`Webhook secret inválido para: ${instanceName}`);
      return new Response("Unauthorized", { status: 401 });
    }

    // ── CONNECTION_UPDATE ─────────────────────────────────────────────────────
    if (event === "connection.update") {
      const state = payload?.data?.state ?? payload?.state;

      if (state === "open") {
        const wuid          = payload?.data?.instance?.wuid ?? "";
        const phoneFromJid  = wuid.split(":")[0].replace(/\D/g, "") || null;

        await supabase
          .from("whatsapp_instances")
          .update({
            status:       "connected",
            phone_number: phoneFromJid,
            qr_code:      null,
            qr_expires_at: null,
          })
          .eq("id", instance.id);

      } else if (state === "close") {
        await supabase
          .from("whatsapp_instances")
          .update({ status: "disconnected", qr_code: null })
          .eq("id", instance.id);

      } else if (state === "connecting") {
        await supabase
          .from("whatsapp_instances")
          .update({ status: "connecting" })
          .eq("id", instance.id);
      }

      return new Response("OK", { status: 200 });
    }

    // ── QRCODE_UPDATED ────────────────────────────────────────────────────────
    if (event === "qrcode.updated") {
      const qrBase64 = payload?.data?.qrcode?.base64 ?? null;
      if (qrBase64) {
        await supabase
          .from("whatsapp_instances")
          .update({
            status:       "qr_pending",
            qr_code:      qrBase64,
            qr_expires_at: new Date(Date.now() + 60_000).toISOString(),
          })
          .eq("id", instance.id);
      }
      return new Response("OK", { status: 200 });
    }

    // ── MESSAGES_UPSERT (mensagens recebidas) ─────────────────────────────────
    if (event === "messages.upsert") {
      const messages = Array.isArray(payload?.data) ? payload.data : [payload?.data];

      // Buscar dono do escritório para usar como user_id no insert
      const { data: owner } = await supabase
        .from("escritorio_membros")
        .select("user_id")
        .eq("escritorio_id", instance.escritorio_id)
        .eq("role", "dono")
        .maybeSingle();

      if (!owner) {
        console.warn("Dono do escritório não encontrado:", instance.escritorio_id);
        return new Response("OK", { status: 200 });
      }

      // Buscar clientes do escritório para match por telefone
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nome, telefone")
        .eq("escritorio_id", instance.escritorio_id);

      const today = new Date().toISOString().split("T")[0];

      for (const msg of messages) {
        if (!msg) continue;
        if (msg.key?.fromMe) continue; // ignorar mensagens enviadas por nós

        const senderJid: string = msg.key?.remoteJid ?? "";
        const senderPhone       = senderJid.split("@")[0].replace(/\D/g, "");
        if (!senderPhone) continue;

        // Extrair texto da mensagem
        const text =
          msg.message?.conversation ??
          msg.message?.extendedTextMessage?.text ??
          msg.message?.imageMessage?.caption ??
          "[Mídia recebida]";

        const messageId = msg.key?.id ?? null;

        // Normalizar para match: remover DDI 55 se presente
        const phoneNorm = senderPhone.startsWith("55")
          ? senderPhone.slice(2)
          : senderPhone;

        const matchedCliente = (clientes ?? []).find((c) => {
          const d = c.telefone.replace(/\D/g, "");
          const n = d.startsWith("55") ? d.slice(2) : d;
          return n === phoneNorm || d === senderPhone;
        });

        await supabase.from("comunicacoes").insert({
          user_id:             owner.user_id,
          escritorio_id:       instance.escritorio_id,
          cliente_id:          matchedCliente?.id ?? null,
          tipo:                "whatsapp",
          direcao:             "entrada",
          assunto:             text.slice(0, 80),
          descricao:           text,
          data:                today,
          whatsapp_message_id: messageId,
          whatsapp_status:     "read",
        });
      }

      return new Response("OK", { status: 200 });
    }

    // ── MESSAGES_UPDATE (confirmações de entrega/leitura) ─────────────────────
    if (event === "messages.update") {
      const updates = Array.isArray(payload?.data) ? payload.data : [payload?.data];

      for (const upd of updates) {
        if (!upd?.key?.id) continue;
        const rawStatus = upd.update?.status;

        let whatsapp_status: string | null = null;
        if (rawStatus === "DELIVERY_ACK" || rawStatus === 3) whatsapp_status = "delivered";
        if (rawStatus === "READ"         || rawStatus === 4) whatsapp_status = "read";
        if (rawStatus === "ERROR"        || rawStatus === 0) whatsapp_status = "failed";

        if (whatsapp_status) {
          await supabase
            .from("comunicacoes")
            .update({ whatsapp_status })
            .eq("whatsapp_message_id", upd.key.id);
        }
      }

      return new Response("OK", { status: 200 });
    }

    // Evento não tratado — aceitar silenciosamente
    return new Response("OK", { status: 200 });

  } catch (error: unknown) {
    console.error("Error in whatsapp-webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
