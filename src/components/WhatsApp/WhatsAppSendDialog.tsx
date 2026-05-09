import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";
import { useSendWhatsApp } from "@/hooks/queries/useWhatsAppQuery";

// ── Ícone WhatsApp ────────────────────────────────────────────────────────────

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface WhatsAppSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cliente destinatário */
  cliente: { id: string; nome: string; telefone: string } | null;
  /** Processo vinculado (opcional) */
  processoId?: string | null;
  /** Nome do escritório para compor a mensagem padrão */
  escritorioNome?: string;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function WhatsAppSendDialog({
  open,
  onOpenChange,
  cliente,
  processoId,
  escritorioNome,
}: WhatsAppSendDialogProps) {
  const sendMessage = useSendWhatsApp();

  const buildDefaultMessage = () => {
    if (!cliente) return "";
    const primeiroNome = cliente.nome.split(" ")[0];
    const escritorio   = escritorioNome
      ? `do escritório ${escritorioNome}`
      : "do escritório";
    return `Olá, ${primeiroNome}! Tudo bem?\n\nEntramos em contato ${escritorio} referente ao seu processo. Podemos conversar?`;
  };

  const [message, setMessage] = useState(buildDefaultMessage);

  // Reinicializa a mensagem quando o dialog abre com um novo cliente
  useEffect(() => {
    if (open) setMessage(buildDefaultMessage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cliente?.id]);

  const handleSend = async () => {
    if (!cliente || !message.trim()) return;
    await sendMessage.mutateAsync({
      clienteId:  cliente.id,
      processoId: processoId ?? null,
      message:    message.trim(),
    });
    onOpenChange(false);
  };

  const remaining = 1000 - message.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
            Enviar mensagem — {cliente?.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="wa-message">Mensagem</Label>
            <Textarea
              id="wa-message"
              rows={6}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="resize-none"
            />
            <p
              className={`text-right text-xs ${
                remaining < 50 ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {remaining} caracteres restantes
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Para:{" "}
            <span className="font-medium text-foreground">
              {cliente?.telefone}
            </span>
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sendMessage.isPending || !message.trim()}
            className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white border-0"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
