import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  DollarSign,
  BarChart2,
  ListChecks,
  Bell,
  Settings,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  Timer,
} from "lucide-react";
import { useClientes } from "@/hooks/queries/useClientesQuery";
import { useProcessos } from "@/hooks/queries/useProcessosQuery";
import { usePrazos } from "@/hooks/queries/usePrazosQuery";
import { useTarefas } from "@/hooks/queries/useTarefasQuery";
import { isPast, isToday, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── Atalhos de navegação ─────────────────────────────────────────────────────

const PAGES = [
  { path: "/",            label: "Dashboard",    icon: LayoutDashboard },
  { path: "/clientes",    label: "Clientes",     icon: Users },
  { path: "/processos",   label: "Processos",    icon: FileText },
  { path: "/prazos",      label: "Prazos",       icon: Calendar },
  { path: "/financeiro",  label: "Financeiro",   icon: DollarSign },
  { path: "/relatorios",  label: "Relatórios",   icon: BarChart2 },
  { path: "/tarefas",      label: "Tarefas",        icon: ListChecks },
  { path: "/timesheet",    label: "Timesheet",      icon: Timer },
  { path: "/notificacoes", label: "Notificações",   icon: Bell },
  { path: "/configuracoes",label: "Configurações",icon: Settings },
  { path: "/perfil",      label: "Meu Perfil",   icon: User },
];

// ── Props ────────────────────────────────────────────────────────────────────

interface BuscaGlobalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Utilitário: destaque do termo buscado ────────────────────────────────────

function highlight(text: string, query: string) {
  if (!query.trim()) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary font-semibold rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

// ── Componente ────────────────────────────────────────────────────────────────

export function BuscaGlobal({ open, onOpenChange }: BuscaGlobalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const { data: clientes  = [] } = useClientes();
  const { data: processos = [] } = useProcessos();
  const { data: prazos    = [] } = usePrazos();
  const { data: tarefas   = [] } = useTarefas();

  // Limpa o campo ao fechar
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const go = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  // ── Filtros sobre cache local ─────────────────────────────────────────────

  const q = query.trim().toLowerCase();

  const clientesFiltrados = useMemo(() => {
    if (!q) return [];
    return clientes
      .filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.cpf.replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
          c.telefone.replace(/\D/g, "").includes(q.replace(/\D/g, "")),
      )
      .slice(0, 5);
  }, [clientes, q]);

  const processosFiltrados = useMemo(() => {
    if (!q) return [];
    return processos
      .filter(
        (p) =>
          p.numero.toLowerCase().includes(q) ||
          p.tipo.toLowerCase().includes(q) ||
          (p.comarca ?? "").toLowerCase().includes(q) ||
          (p.vara ?? "").toLowerCase().includes(q) ||
          (p.clientes?.nome ?? "").toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [processos, q]);

  const prazosFiltrados = useMemo(() => {
    if (!q) return [];
    return prazos
      .filter(
        (p) =>
          p.titulo.toLowerCase().includes(q) ||
          (p.descricao ?? "").toLowerCase().includes(q) ||
          (p.processos?.numero ?? "").toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [prazos, q]);

  const tarefasFiltradas = useMemo(() => {
    if (!q) return [];
    return tarefas
      .filter(
        (t) =>
          t.titulo.toLowerCase().includes(q) ||
          (t.descricao ?? "").toLowerCase().includes(q) ||
          (t.processos?.numero ?? "").toLowerCase().includes(q) ||
          (t.clientes?.nome ?? "").toLowerCase().includes(q),
      )
      .filter((t) => t.status !== "cancelada")
      .slice(0, 5);
  }, [tarefas, q]);

  const paginasFiltradas = useMemo(() => {
    if (!q) return PAGES;
    return PAGES.filter((p) => p.label.toLowerCase().includes(q));
  }, [q]);

  const temResultados =
    clientesFiltrados.length > 0 ||
    processosFiltrados.length > 0 ||
    prazosFiltrados.length > 0 ||
    tarefasFiltradas.length > 0;

  // ── Status visual do prazo ────────────────────────────────────────────────

  const getPrazoMeta = (data: string, concluido: boolean) => {
    if (concluido) return { icon: CheckCircle2, cls: "text-muted-foreground" };
    const d = new Date(data + "T12:00:00");
    if (isPast(d) && !isToday(d)) return { icon: AlertCircle, cls: "text-destructive" };
    return { icon: Clock, cls: "text-warning" };
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar clientes, processos, prazos ou navegar..."
        value={query}
        onValueChange={setQuery}
      />

      <CommandList className="max-h-[480px]">

        {/* Estado vazio */}
        {q && !temResultados && (
          <CommandEmpty>Nenhum resultado para "{query}".</CommandEmpty>
        )}

        {/* ── Resultados de clientes ── */}
        {clientesFiltrados.length > 0 && (
          <CommandGroup heading="Clientes">
            {clientesFiltrados.map((cliente) => (
              <CommandItem
                key={cliente.id}
                value={`cliente-${cliente.id}-${cliente.nome}`}
                onSelect={() => go("/clientes")}
                className="gap-3"
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {highlight(cliente.nome, query)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {cliente.email}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {cliente.tipo ?? "Cliente"}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ── Resultados de processos ── */}
        {processosFiltrados.length > 0 && (
          <>
            {clientesFiltrados.length > 0 && <CommandSeparator />}
            <CommandGroup heading="Processos">
              {processosFiltrados.map((processo) => (
                <CommandItem
                  key={processo.id}
                  value={`processo-${processo.id}-${processo.numero}`}
                  onSelect={() => go("/processos")}
                  className="gap-3"
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                    <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      {highlight(processo.numero, query)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {processo.clientes?.nome
                        ? `${processo.tipo} · ${processo.clientes.nome}`
                        : processo.tipo}
                    </p>
                  </div>
                  <span
                    className={`text-xs shrink-0 ${
                      processo.status === "em_andamento"
                        ? "text-primary"
                        : processo.status === "concluido"
                        ? "text-success"
                        : "text-muted-foreground"
                    }`}
                  >
                    {processo.status === "em_andamento"
                      ? "Ativo"
                      : processo.status === "concluido"
                      ? "Concluído"
                      : processo.status === "suspenso"
                      ? "Suspenso"
                      : "Arquivado"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* ── Resultados de prazos ── */}
        {prazosFiltrados.length > 0 && (
          <>
            {(clientesFiltrados.length > 0 || processosFiltrados.length > 0) && (
              <CommandSeparator />
            )}
            <CommandGroup heading="Prazos">
              {prazosFiltrados.map((prazo) => {
                const meta = getPrazoMeta(prazo.data, prazo.concluido);
                const IconPrazo = meta.icon;
                return (
                  <CommandItem
                    key={prazo.id}
                    value={`prazo-${prazo.id}-${prazo.titulo}`}
                    onSelect={() => go("/prazos")}
                    className="gap-3"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                      <IconPrazo className={`h-3.5 w-3.5 ${meta.cls}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-tight ${prazo.concluido ? "line-through text-muted-foreground" : ""}`}>
                        {highlight(prazo.titulo, query)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(prazo.data + "T12:00:00"), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                        {prazo.processos?.numero ? ` · ${prazo.processos.numero}` : ""}
                      </p>
                    </div>
                    <span className={`text-xs shrink-0 font-medium ${meta.cls}`}>
                      {prazo.prioridade === "alta" ? "Alta" : prazo.prioridade === "media" ? "Média" : "Baixa"}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {/* ── Resultados de tarefas ── */}
        {tarefasFiltradas.length > 0 && (
          <>
            {(clientesFiltrados.length > 0 || processosFiltrados.length > 0 || prazosFiltrados.length > 0) && (
              <CommandSeparator />
            )}
            <CommandGroup heading="Tarefas">
              {tarefasFiltradas.map((tarefa) => {
                const isUrgente = tarefa.prioridade === "urgente";
                const isConcluida = tarefa.status === "concluida";
                return (
                  <CommandItem
                    key={tarefa.id}
                    value={`tarefa-${tarefa.id}-${tarefa.titulo}`}
                    onSelect={() => go("/tarefas")}
                    className="gap-3"
                  >
                    <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${isUrgente ? "bg-red-100 dark:bg-red-900/40" : "bg-muted"}`}>
                      <ListChecks className={`h-3.5 w-3.5 ${isUrgente ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-tight ${isConcluida ? "line-through text-muted-foreground" : ""}`}>
                        {highlight(tarefa.titulo, query)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {tarefa.processos?.numero
                          ? `${tarefa.processos.numero}${tarefa.clientes?.nome ? ` · ${tarefa.clientes.nome}` : ""}`
                          : tarefa.clientes?.nome ?? "Sem vínculo"}
                      </p>
                    </div>
                    <span className={`text-xs shrink-0 ${isUrgente ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                      {tarefa.prioridade === "urgente" ? "Urgente"
                        : tarefa.prioridade === "alta" ? "Alta"
                        : tarefa.prioridade === "media" ? "Média"
                        : "Baixa"}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {/* ── Navegação rápida ── */}
        {paginasFiltradas.length > 0 && (
          <>
            {temResultados && <CommandSeparator />}
            <CommandGroup heading={q ? "Páginas" : "Navegação rápida"}>
              {paginasFiltradas.map((page) => {
                const Icon = page.icon;
                return (
                  <CommandItem
                    key={page.path}
                    value={`nav-${page.path}-${page.label}`}
                    onSelect={() => go(page.path)}
                    className="gap-3"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{page.label}</span>
                    <CommandShortcut>Ir para</CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

      </CommandList>

      {/* Rodapé com dicas de teclado */}
      <div className="border-t px-3 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span><kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">↑↓</kbd> navegar</span>
        <span><kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">↵</kbd> selecionar</span>
        <span><kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">Esc</kbd> fechar</span>
      </div>
    </CommandDialog>
  );
}
