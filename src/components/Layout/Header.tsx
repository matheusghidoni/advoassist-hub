import { Search, User, LogOut, Settings, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ImportacaoProcessoModal } from "@/components/Processos/ImportacaoProcessoModal";
import { NotificacoesPopover } from "@/components/Notificacoes/NotificacoesPopover";
import { useSidebar } from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createLogger } from "@/lib/logger";
import { BuscaGlobal } from "@/components/BuscaGlobal/BuscaGlobal";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const log = createLogger('Header');

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const { escritorio } = useWorkspace();
  const sidebarWidth = state === "collapsed" ? "3.5rem" : "16rem";
  const [fullName, setFullName] = useState<string>("");
  const [buscaOpen, setBuscaOpen] = useState(false);
  const [importacaoOpen, setImportacaoOpen] = useState(false);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  // Atalho global Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setBuscaOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setFullName(data.full_name || '');
      }
    } catch (error) {
      log.error('Erro ao carregar perfil:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const getUserInitials = () => {
    if (fullName) {
      const names = fullName.trim().split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
      }
      return fullName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <header 
      className="fixed right-0 top-0 z-30 h-16 bg-primary transition-all duration-300"
      style={{ left: sidebarWidth, borderBottom: "1px solid hsl(46 65% 52% / 0.35)" }}
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Busca global */}
        <div className="flex flex-1 max-w-xl">
          <Button
            variant="outline"
            onClick={() => setBuscaOpen(true)}
            className="w-full justify-start gap-2 font-normal border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15 hover:border-primary-foreground/30 transition-smooth"
          >
            <Search className="h-4 w-4 shrink-0 text-primary-foreground/70" />
            <span className="flex-1 text-left truncate text-primary-foreground/70">
              Buscar clientes, processos, prazos...
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-sm border border-primary-foreground/20 bg-primary-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-primary-foreground/50">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Funcionalidade de importação temporariamente desativada
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setImportacaoOpen(true)}
            className="hidden md:flex gap-2 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground transition-smooth"
          >
            <Download className="h-4 w-4" />
            <span className="text-sm font-medium">Importar</span>
          </Button>
          */}

          <NotificacoesPopover />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {fullName || 'Minha Conta'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {escritorio?.nome || user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/perfil')}>
                <User className="mr-2 h-4 w-4" />
                <span>Meu Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <BuscaGlobal open={buscaOpen} onOpenChange={setBuscaOpen} />
      <ImportacaoProcessoModal open={importacaoOpen} onOpenChange={setImportacaoOpen} />
    </header>
  );
}
