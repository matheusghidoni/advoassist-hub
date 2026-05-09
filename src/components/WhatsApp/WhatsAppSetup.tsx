import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Unplug, Trash2, Smartphone } from "lucide-react";
import {
  useWhatsAppInstance,
  useManageWhatsAppInstance,
  type WhatsAppStatus,
} from "@/hooks/queries/useWhatsAppQuery";

// ── Metadados por status ──────────────────────────────────────────────────────

const STATUS_META: Record<
  WhatsAppStatus,
  {
    label: string;
    badgeVariant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  connected:    { label: "Conectado",     badgeVariant: "default"     },
  qr_pending:   { label: "Aguardando QR", badgeVariant: "secondary"   },
  connecting:   { label: "Conectando...", badgeVariant: "secondary"   },
  disconnected: { label: "Desconectado",  badgeVariant: "outline"     },
  error:        { label: "Erro",          badgeVariant: "destructive" },
};

// ── Componente principal ──────────────────────────────────────────────────────

export function WhatsAppSetup() {
  const { data: instance, isLoading } = useWhatsAppInstance();
  const manage = useManageWhatsAppInstance();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Carregando...</span>
      </div>
    );
  }

  // ── Sem instância: exibir botão de conexão ────────────────────────────────
  if (!instance) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Conecte o WhatsApp do escritório para enviar mensagens diretamente
          pela plataforma, sem abrir o aplicativo manualmente.
        </p>
        <Button
          onClick={() => manage.mutate("create")}
          disabled={manage.isPending}
          className="gap-2"
        >
          {manage.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Smartphone className="h-4 w-4" />
          )}
          Conectar WhatsApp
        </Button>
      </div>
    );
  }

  const meta = STATUS_META[instance.status];

  return (
    <div className="space-y-4">
      {/* ── Linha de status + ações ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Status:</span>
          <Badge variant={meta.badgeVariant} className="gap-1.5">
            {instance.status === "connected" && (
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            )}
            {(instance.status === "qr_pending" ||
              instance.status === "connecting") && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {meta.label}
          </Badge>
          {instance.phone_number && (
            <span className="text-sm text-muted-foreground">
              +{instance.phone_number}
            </span>
          )}
        </div>

        {/* Botões de ação */}
        <div className="flex items-center gap-2">
          {/* Atualizar estado (disponível quando não conectado) */}
          {instance.status !== "connected" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => manage.mutate("refresh")}
              disabled={manage.isPending}
              title="Atualizar estado"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${manage.isPending ? "animate-spin" : ""}`}
              />
            </Button>
          )}

          {/* Desconectar (somente quando conectado) */}
          {instance.status === "connected" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => manage.mutate("disconnect")}
              disabled={manage.isPending}
              className="gap-1.5"
            >
              <Unplug className="h-3.5 w-3.5" />
              Desconectar
            </Button>
          )}

          {/* Remover instância */}
          {!confirmDelete ? (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remover
            </Button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-destructive font-medium">
                Confirmar?
              </span>
              <Button
                size="sm"
                variant="destructive"
                disabled={manage.isPending}
                onClick={() => {
                  manage.mutate("delete");
                  setConfirmDelete(false);
                }}
              >
                Sim
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
              >
                Não
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── QR Code ─────────────────────────────────────────────────────────── */}
      {instance.status === "qr_pending" && instance.qr_code && (
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground text-center">
            Escaneie o QR code com o WhatsApp do seu celular
          </p>
          <img
            src={instance.qr_code}
            alt="WhatsApp QR Code"
            className="h-48 w-48 rounded-md border bg-white p-1"
          />
          <p className="text-xs text-muted-foreground text-center">
            Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo
          </p>
          <p className="text-xs text-muted-foreground">
            O QR code expira em ~60 segundos. Clique em{" "}
            <button
              className="underline font-medium"
              onClick={() => manage.mutate("refresh")}
            >
              Atualizar
            </button>{" "}
            se expirar.
          </p>
        </div>
      )}

      {/* ── Conectado ───────────────────────────────────────────────────────── */}
      {instance.status === "connected" && (
        <p className="text-sm text-muted-foreground">
          WhatsApp conectado. Os botões de envio nos cartões de clientes agora
          usarão a conexão direta.
        </p>
      )}

      {/* ── Erro ────────────────────────────────────────────────────────────── */}
      {instance.status === "error" && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          Ocorreu um erro na conexão. Clique em Atualizar ou remova e reconecte.
        </div>
      )}
    </div>
  );
}
