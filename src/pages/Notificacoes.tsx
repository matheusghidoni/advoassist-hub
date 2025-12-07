import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Bell, 
  Check, 
  Trash2, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  Calendar,
  DollarSign,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  link: string | null;
  created_at: string;
}

export default function Notificacoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<"todas" | "lidas" | "nao_lidas">("todas");

  const fetchNotificacoes = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar notificações",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setNotificacoes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotificacoes();
  }, [user]);

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case "prazo":
        return <Calendar className="h-5 w-5 text-orange-500" />;
      case "honorario":
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case "processo":
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "alerta":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "sucesso":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const handleMarcarComoLida = async (ids: string[]) => {
    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true })
      .in("id", ids);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível marcar como lida",
        variant: "destructive",
      });
    } else {
      setNotificacoes(prev => 
        prev.map(n => ids.includes(n.id) ? { ...n, lida: true } : n)
      );
      setSelectedIds([]);
      toast({ title: "Notificações marcadas como lidas" });
    }
  };

  const handleExcluir = async (ids: string[]) => {
    const { error } = await supabase
      .from("notificacoes")
      .delete()
      .in("id", ids);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir",
        variant: "destructive",
      });
    } else {
      setNotificacoes(prev => prev.filter(n => !ids.includes(n.id)));
      setSelectedIds([]);
      toast({ title: "Notificações excluídas" });
    }
  };

  const handleMarcarTodasComoLidas = async () => {
    const naoLidas = notificacoes.filter(n => !n.lida).map(n => n.id);
    if (naoLidas.length > 0) {
      await handleMarcarComoLida(naoLidas);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredNotificacoes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotificacoes.map(n => n.id));
    }
  };

  const filteredNotificacoes = notificacoes.filter(n => {
    if (filter === "lidas") return n.lida;
    if (filter === "nao_lidas") return !n.lida;
    return true;
  });

  const naoLidasCount = notificacoes.filter(n => !n.lida).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notificações</h1>
            <p className="text-muted-foreground">
              Histórico completo de notificações
            </p>
          </div>
          {naoLidasCount > 0 && (
            <Button onClick={handleMarcarTodasComoLidas} variant="outline">
              <Check className="mr-2 h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{notificacoes.length}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-500/10">
                  <Info className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{naoLidasCount}</p>
                  <p className="text-sm text-muted-foreground">Não lidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{notificacoes.length - naoLidasCount}</p>
                  <p className="text-sm text-muted-foreground">Lidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button 
                  variant={filter === "todas" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setFilter("todas")}
                >
                  Todas
                </Button>
                <Button 
                  variant={filter === "nao_lidas" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setFilter("nao_lidas")}
                >
                  Não lidas
                </Button>
                <Button 
                  variant={filter === "lidas" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setFilter("lidas")}
                >
                  Lidas
                </Button>
              </div>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.length} selecionada(s)
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleMarcarComoLida(selectedIds)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Marcar como lida
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleExcluir(selectedIds)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : filteredNotificacoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma notificação encontrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Select All */}
                <div className="flex items-center gap-3 p-2 border-b">
                  <Checkbox 
                    checked={selectedIds.length === filteredNotificacoes.length && filteredNotificacoes.length > 0}
                    onCheckedChange={selectAll}
                  />
                  <span className="text-sm text-muted-foreground">Selecionar todas</span>
                </div>
                
                {filteredNotificacoes.map((notificacao) => (
                  <div 
                    key={notificacao.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                      notificacao.lida 
                        ? "bg-muted/30" 
                        : "bg-card border-primary/20"
                    }`}
                  >
                    <Checkbox 
                      checked={selectedIds.includes(notificacao.id)}
                      onCheckedChange={() => toggleSelection(notificacao.id)}
                    />
                    <div className="shrink-0 mt-0.5">
                      {getIcon(notificacao.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium ${notificacao.lida ? "text-muted-foreground" : "text-foreground"}`}>
                            {notificacao.titulo}
                          </h4>
                          {!notificacao.lida && (
                            <Badge variant="secondary" className="text-xs">Nova</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(notificacao.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${notificacao.lida ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
                        {notificacao.mensagem}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
