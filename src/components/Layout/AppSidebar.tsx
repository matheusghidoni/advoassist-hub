import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  DollarSign,
  BarChart2,
  ListChecks,
  Scale,
  Settings,
  Bell,
  Timer,
  UsersRound,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { SidebarMiniCalendar } from "./SidebarMiniCalendar";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { isPast, isToday, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard",    path: "/" },
  { icon: Users,           label: "Clientes",     path: "/clientes" },
  { icon: FileText,        label: "Processos",    path: "/processos" },
  { icon: Calendar,        label: "Prazos",       path: "/prazos" },
  { icon: DollarSign,      label: "Financeiro",   path: "/financeiro" },
  { icon: BarChart2,       label: "Relatórios",   path: "/relatorios" },
  { icon: ListChecks,      label: "Tarefas",      path: "/tarefas" },
  { icon: Timer,           label: "Timesheet",    path: "/timesheet" },
  { icon: UsersRound,      label: "Equipe",       path: "/equipe" },
  { icon: Bell,            label: "Notificações", path: "/notificacoes" },
  { icon: Settings,        label: "Configurações",path: "/configuracoes" },
];

export function AppSidebar() {
  const location   = useLocation();
  const { state }  = useSidebar();
  const isCollapsed = state === "collapsed";
  const { user }   = useAuth();
  const { escritorioId, escritorio } = useWorkspace();

  const [fullName, setFullName] = useState("");
  const [oab, setOab]           = useState("");
  const [urgentPrazosCount, setUrgentPrazosCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name,oab")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name || "");
        setOab(data.oab || "");
      }
    };
    load();
  }, [user]);

  // Prazos urgentes (vencidos ou próximos 3 dias) — agora filtrado pelo escritório
  useEffect(() => {
    const fetchUrgentPrazos = async () => {
      if (!user || !escritorioId) return;

      const tresDias = addDays(new Date(), 3);

      const { data } = await supabase
        .from("prazos")
        .select("id, data, concluido")
        .eq("escritorio_id", escritorioId)
        .eq("concluido", false)
        .lte("data", tresDias.toISOString().split("T")[0]);

      if (data) {
        const count = data.filter((p) => {
          const prazoDate = new Date(p.data);
          return isPast(prazoDate) || isToday(prazoDate) || prazoDate <= tresDias;
        }).length;
        setUrgentPrazosCount(count);
      }
    };

    fetchUrgentPrazos();
    const interval = setInterval(fetchUrgentPrazos, 60000);
    return () => clearInterval(interval);
  }, [user, escritorioId]);

  const getInitials = () => {
    if (fullName) {
      const names = fullName.trim().split(" ");
      const first = names[0]?.[0] || "";
      const last  = names.length > 1 ? names[names.length - 1][0] : "";
      return `${first}${last}`.toUpperCase() || "U";
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className={`flex h-16 items-center border-b gap-2 ${isCollapsed ? "justify-center px-0" : "px-3"}`}>
          <SidebarTrigger className="shrink-0" />
          {!isCollapsed && (
            <>
              <Scale className="h-8 w-8 text-sidebar-primary shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-lg font-bold text-sidebar-foreground truncate">LegalFlow</span>
                <span className="text-xs text-sidebar-foreground/60 truncate">Gestão Jurídica</span>
              </div>
            </>
          )}
        </div>

        {/* Workspace Switcher */}
        <div className={`px-2 pt-2 ${isCollapsed ? "px-1" : ""}`}>
          <WorkspaceSwitcher collapsed={isCollapsed} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon     = item.icon;
                const isActive = location.pathname === item.path;
                const isPrazosItem = item.path === "/prazos";
                const showBadge    = isPrazosItem && urgentPrazosCount > 0;

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.path} className="relative">
                        <div className="relative">
                          <Icon className="h-5 w-5" />
                          {showBadge && isCollapsed && (
                            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                              {urgentPrazosCount > 9 ? "9+" : urgentPrazosCount}
                            </span>
                          )}
                        </div>
                        <span className="flex items-center gap-2">
                          {item.label}
                          {showBadge && !isCollapsed && (
                            <Badge
                              variant="destructive"
                              className="h-5 px-1.5 text-[10px] animate-pulse"
                            >
                              {urgentPrazosCount}
                            </Badge>
                          )}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Mini Calendário */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendário de Prazos
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMiniCalendar />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="border-t p-2">
          <div
            className={`flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-2 ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground font-semibold shrink-0">
              {getInitials()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {fullName || user?.email || "Minha Conta"}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {escritorio?.nome
                    ? escritorio.nome
                    : oab
                    ? `OAB ${oab}`
                    : ""}
                </p>
              </div>
            )}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
