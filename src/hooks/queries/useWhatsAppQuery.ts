import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { queryKeys } from "./queryKeys";
import { comunicacaoKeys } from "./useComunicacoesQuery";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type WhatsAppStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "qr_pending"
  | "error";

export interface WhatsAppInstance {
  id: string;
  escritorio_id: string;
  instance_name: string;
  status: WhatsAppStatus;
  phone_number: string | null;
  qr_code: string | null;
  qr_expires_at: string | null;
  webhook_secret: string;
  created_at: string;
  updated_at: string;
}

export interface SendWhatsAppPayload {
  clienteId: string;
  processoId?: string | null;
  message: string;
}

export type InstanceAction = "create" | "refresh" | "disconnect" | "delete";

// ── Hook: estado da instância ─────────────────────────────────────────────────

export function useWhatsAppInstance() {
  const { escritorioId } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.whatsappInstance(escritorioId ?? ""),
    enabled:  !!escritorioId,
    // Polling automático enquanto aguarda QR code ou conectando
    refetchInterval: (query) => {
      const status = (query.state.data as WhatsAppInstance | null)?.status;
      if (status === "qr_pending" || status === "connecting") return 3_000;
      return false;
    },
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-instance", {
        body: { action: "get", escritorioId },
      });
      if (error) throw error;
      return (data?.instance ?? null) as WhatsAppInstance | null;
    },
  });
}

// ── Mutation: gerenciar instância ─────────────────────────────────────────────

export function useManageWhatsAppInstance() {
  const { escritorioId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (action: InstanceAction) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-instance", {
        body: { action, escritorioId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, action) => {
      qc.invalidateQueries({
        queryKey: queryKeys.whatsappInstance(escritorioId ?? ""),
      });
      if (action === "create")     toast.success("Instância criada! Escaneie o QR code.");
      if (action === "disconnect") toast.info("WhatsApp desconectado.");
      if (action === "delete")     toast.info("Instância removida.");
      if (action === "refresh")    toast.success("Estado sincronizado.");
    },
    onError: (err: Error) => {
      toast.error("Erro: " + (err?.message ?? "Falha ao gerenciar instância"));
    },
  });
}

// ── Mutation: enviar mensagem ─────────────────────────────────────────────────

export function useSendWhatsApp() {
  const { escritorioId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendWhatsAppPayload) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          escritorioId,
          clienteId:  payload.clienteId,
          processoId: payload.processoId ?? null,
          message:    payload.message,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      toast.success("Mensagem enviada com sucesso!");
      qc.invalidateQueries({
        queryKey: comunicacaoKeys.porCliente(variables.clienteId),
      });
    },
    onError: (err: Error) => {
      toast.error("Erro ao enviar: " + (err?.message ?? "Falha desconhecida"));
    },
  });
}
