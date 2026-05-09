import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Building2, UserPlus } from "lucide-react";
import { toast } from "sonner";

type Estado = "carregando" | "valido" | "invalido" | "ja_aceito" | "aceitando" | "concluido";

interface ConviteInfo {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  aceito_em: string | null;
  escritorio_id: string;
  escritorios: { nome: string } | null;
}

const ROLE_LABEL: Record<string, string> = {
  admin:      "Administrador",
  advogado:   "Advogado(a)",
  estagiario: "Estagiário(a)",
  secretaria: "Secretaria",
  dono:       "Sócio / Dono",
};

export default function AceitarConvite() {
  const { token } = useParams<{ token: string }>();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [estado, setEstado]     = useState<Estado>("carregando");
  const [convite, setConvite]   = useState<ConviteInfo | null>(null);

  // ── Carregar convite pelo token ─────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setEstado("invalido"); return; }

    (async () => {
      const { data, error } = await supabase
        .from("convites")
        .select("id, email, role, expires_at, aceito_em, escritorio_id, escritorios(nome)")
        .eq("token", token)
        .maybeSingle();

      // Remove o token da URL/histórico do navegador após leitura
      window.history.replaceState(null, '', '/aceitar-convite');

      if (error || !data) { setEstado("invalido"); return; }
      if (data.aceito_em)  { setEstado("ja_aceito"); setConvite(data as ConviteInfo); return; }
      if (new Date(data.expires_at) < new Date()) { setEstado("invalido"); return; }

      setConvite(data as ConviteInfo);
      setEstado("valido");
    })();
  }, [token]);

  // ── Aceitar convite ─────────────────────────────────────────────────────────
  const aceitar = async () => {
    if (!convite || !user) return;
    setEstado("aceitando");

    try {
      // Chama função SECURITY DEFINER que faz upsert + marca convite aceito
      // sem depender de RLS (evita erros com membros suspensos / re-convidados)
      const { data, error } = await supabase.rpc("aceitar_convite_por_token", {
        p_token: token!,
      });

      if (error) throw error;
      if (data?.ok === false) {
        throw new Error(data.error === "invalid_or_expired"
          ? "Convite inválido ou expirado"
          : data.error);
      }

      setEstado("concluido");
      toast.success("Convite aceito! Bem-vindo à equipe.");

      // Reload completo para limpar o cache do React Query e carregar
      // todos os escritórios (incluindo o recém-aceito) do zero
      setTimeout(() => { window.location.href = "/"; }, 2000);
    } catch (err: any) {
      toast.error("Erro ao aceitar convite: " + err.message);
      setEstado("valido");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-3">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">LegalFlow</h1>
          <p className="text-muted-foreground text-sm">Convite para equipe</p>
        </div>

        <Card className="p-6 shadow-card">
          {/* Carregando */}
          {estado === "carregando" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Verificando convite...</p>
            </div>
          )}

          {/* Inválido / expirado */}
          {estado === "invalido" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <XCircle className="h-10 w-10 text-destructive" />
              <h2 className="font-semibold text-lg">Convite inválido ou expirado</h2>
              <p className="text-muted-foreground text-sm">
                Este link pode ter expirado (válido por 48h) ou já não existe.
              </p>
              <Button variant="outline" onClick={() => navigate("/")}>
                Ir para o início
              </Button>
            </div>
          )}

          {/* Já aceito */}
          {estado === "ja_aceito" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <h2 className="font-semibold text-lg">Convite já aceito</h2>
              <p className="text-muted-foreground text-sm">
                Você já faz parte de{" "}
                <strong>{(convite?.escritorios as any)?.nome ?? "este escritório"}</strong>.
              </p>
              <Button onClick={() => navigate("/")}>Acessar plataforma</Button>
            </div>
          )}

          {/* Válido — aguardando aceite */}
          {(estado === "valido" || estado === "aceitando") && convite && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="font-semibold text-lg">Você foi convidado!</h2>
                <p className="text-muted-foreground text-sm">
                  Para fazer parte da equipe de
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Escritório</span>
                  <span className="font-medium">
                    {(convite.escritorios as any)?.nome ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cargo</span>
                  <span className="font-medium">{ROLE_LABEL[convite.role] ?? convite.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expira em</span>
                  <span className="font-medium">
                    {new Date(convite.expires_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>

              {/* Usuário não logado */}
              {!user && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Faça login ou crie uma conta para aceitar o convite.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/login?redirect=/aceitar-convite/${token}`)}
                  >
                    Entrar / Criar conta
                  </Button>
                </div>
              )}

              {/* Usuário logado */}
              {user && (
                <Button
                  className="w-full gap-2"
                  onClick={aceitar}
                  disabled={estado === "aceitando"}
                >
                  {estado === "aceitando" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  {estado === "aceitando" ? "Aceitando..." : "Aceitar convite"}
                </Button>
              )}
            </div>
          )}

          {/* Concluído */}
          {estado === "concluido" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <h2 className="font-semibold text-lg">Bem-vindo à equipe! 🎉</h2>
              <p className="text-muted-foreground text-sm">
                Redirecionando para o dashboard...
              </p>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
