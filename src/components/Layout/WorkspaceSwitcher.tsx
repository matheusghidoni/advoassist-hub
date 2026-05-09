/**
 * WorkspaceSwitcher — Seletor de Escritório na sidebar
 *
 * Se o usuário pertence a apenas 1 escritório: exibe o nome sem dropdown.
 * Se pertence a vários: exibe um DropdownMenu para trocar o workspace ativo.
 */

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Building2, ChevronDown, Check } from "lucide-react";
import { ROLE_META } from "@/types/equipe";
import type { RoleEscritorio } from "@/types/equipe";

export function WorkspaceSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { escritorio, escritorios, escritorioId, myRole, switchEscritorio } =
    useWorkspace();

  if (!escritorio) return null;

  const roleMeta = myRole ? ROLE_META[myRole as RoleEscritorio] : null;

  // Apenas um escritório — exibe sem dropdown
  if (escritorios.length <= 1) {
    return (
      <div
        className={`flex items-center gap-2 px-2 py-2 rounded-lg bg-sidebar-accent/40 border border-sidebar-border/50 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
          {escritorio.nome.charAt(0).toUpperCase()}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">
              {escritorio.nome}
            </p>
            {roleMeta && (
              <p className="text-[10px] text-sidebar-foreground/60 truncate">
                {roleMeta.label}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Múltiplos escritórios — dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`w-full h-auto px-2 py-2 rounded-lg bg-sidebar-accent/40 border border-sidebar-border/50 hover:bg-sidebar-accent justify-start ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
            {escritorio.nome.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 text-left ml-2">
                <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">
                  {escritorio.nome}
                </p>
                {roleMeta && (
                  <p className="text-[10px] text-sidebar-foreground/60 truncate">
                    {roleMeta.label}
                  </p>
                )}
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50 ml-1" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right" align="start" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs">
          <Building2 className="h-3.5 w-3.5" />
          Trocar escritório
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {escritorios.map((esc) => (
          <DropdownMenuItem
            key={esc.id}
            onClick={() => switchEscritorio(esc.id)}
            className="flex items-center gap-2"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold">
              {esc.nome.charAt(0).toUpperCase()}
            </div>
            <span className="flex-1 truncate text-sm">{esc.nome}</span>
            {esc.id === escritorioId && (
              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
