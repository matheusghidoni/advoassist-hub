import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast as sonnerToast } from "sonner";

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  link?: string;
  created_at: string;
}

export function NotificacoesPopover() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { permission, showNotification } = usePushNotifications();
  const previousNotificacoesRef = useRef<string[]>([]);
  const isInitialLoadRef = useRef(true);

  const fetchNotificacoes = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar notificações:", error);
      return;
    }

    const newNotificacoes = data || [];
    
    // Verificar se há novas notificações não lidas para enviar push
    if (!isInitialLoadRef.current && previousNotificacoesRef.current.length > 0) {
      const previousIds = previousNotificacoesRef.current;
      const brandNewNotifications = newNotificacoes.filter(
        (n) => !n.lida && !previousIds.includes(n.id)
      );

      // Mostrar toast e push para novas notificações
      brandNewNotifications.forEach((notif) => {
        // Toast visual
        const toastType = notif.tipo === 'urgente' ? 'warning' : 'info';
        sonnerToast[toastType](notif.titulo, {
          description: notif.mensagem,
          duration: 5000,
        });

        // Push notification
        if (permission === "granted") {
          showNotification(notif.titulo, {
            body: notif.mensagem,
            tag: notif.id,
          });
        }

        // Animate badge
        setHasNewNotification(true);
        setTimeout(() => setHasNewNotification(false), 2000);
      });
    }

    isInitialLoadRef.current = false;
    // Atualizar referência de IDs
    previousNotificacoesRef.current = newNotificacoes.map((n) => n.id);
    setNotificacoes(newNotificacoes);
  }, [user, permission, showNotification]);

  useEffect(() => {
    if (!user) return;

    fetchNotificacoes();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("notificacoes-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Nova notificação recebida:", payload);
          fetchNotificacoes();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotificacoes();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotificacoes();
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotificacoes]);

  const marcarComoLida = async (id: string) => {
    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível marcar como lida.",
        variant: "destructive",
      });
      return;
    }

    fetchNotificacoes();
  };

  const marcarTodasComoLidas = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("user_id", user.id)
      .eq("lida", false);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível marcar todas como lidas.",
        variant: "destructive",
      });
      return;
    }

    fetchNotificacoes();
  };

  const excluirNotificacao = async (id: string) => {
    const { error } = await supabase
      .from("notificacoes")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a notificação.",
        variant: "destructive",
      });
      return;
    }

    fetchNotificacoes();
    toast({
      title: "Sucesso",
      description: "Notificação excluída.",
    });
  };

  const handleNotificacaoClick = (notificacao: Notificacao) => {
    if (!notificacao.lida) {
      marcarComoLida(notificacao.id);
    }
    if (notificacao.link) {
      setOpen(false);
      navigate(notificacao.link);
    }
  };

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "success":
        return "bg-green-500/10 text-green-500";
      case "warning":
        return "bg-yellow-500/10 text-yellow-500";
      case "error":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-blue-500/10 text-blue-500";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={`h-5 w-5 transition-transform ${hasNewNotification ? 'animate-bounce text-primary' : ''}`} />
          {naoLidas > 0 && (
            <Badge
              variant="destructive"
              className={`absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs ${hasNewNotification ? 'animate-pulse' : ''}`}
            >
              {naoLidas}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Notificações</h3>
          {naoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={marcarTodasComoLidas}
              className="h-8 text-xs"
            >
              <Check className="mr-1 h-3 w-3" />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notificacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notificacoes.map((notificacao) => (
                <div
                  key={notificacao.id}
                  className={`p-4 transition-colors hover:bg-accent/50 ${
                    !notificacao.lida ? "bg-accent/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 h-2 w-2 rounded-full shrink-0 ${getTipoColor(
                        notificacao.tipo
                      )}`}
                    />
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleNotificacaoClick(notificacao)}
                    >
                      <p className="text-sm font-medium mb-1">
                        {notificacao.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {notificacao.mensagem}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notificacao.created_at).toLocaleString(
                          "pt-BR"
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!notificacao.lida && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => marcarComoLida(notificacao.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => excluirNotificacao(notificacao.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
