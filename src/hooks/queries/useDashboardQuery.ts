import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { queryKeys } from './queryKeys';

export interface DashboardPrazo {
  id: string;
  titulo: string;
  data: string;
  daysLeft: number;
  priority: 'high' | 'medium' | 'low';
  clientName: string;
}

export interface DashboardActivity {
  id: string;
  action: string;
  details: string;
  time: string;
}

export interface DashboardData {
  stats: {
    processosAtivos: number;
    clientesAtivos: number;
    prazosProximos: number;
    prazosCriticos: number;
  };
  upcomingPrazos: DashboardPrazo[];
  recentActivities: DashboardActivity[];
}

async function fetchDashboard(escritorioId: string): Promise<DashboardData> {
  const today = new Date();
  const todayStr          = today.toISOString().split('T')[0];
  const sevenDaysFromNow  = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);
  const sevenDaysStr      = sevenDaysFromNow.toISOString().split('T')[0];
  const threeDaysFromNow  = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);
  const threeDaysStr      = threeDaysFromNow.toISOString().split('T')[0];

  // All queries run in parallel — 5 independent requests instead of 7 sequential ones.
  const [
    processosResult,
    clientesResult,
    prazosProximosResult,
    upcomingPrazosResult,
    recentResult,
  ] = await Promise.all([
    // Count-only queries (head: true = no row data transferred)
    supabase
      .from('processos')
      .select('id', { count: 'exact', head: true })
      .eq('escritorio_id', escritorioId)
      .eq('status', 'em_andamento'),

    supabase
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .eq('escritorio_id', escritorioId)
      .eq('status', 'ativo'),

    // Prazos próximos — used for both stats counters
    supabase
      .from('prazos')
      .select('id, data')
      .eq('escritorio_id', escritorioId)
      .eq('concluido', false)
      .gte('data', todayStr)
      .lte('data', sevenDaysStr),

    // Upcoming prazos card (with relations for names)
    supabase
      .from('prazos')
      .select('id, titulo, data, processos!prazos_processo_id_fkey(numero, clientes!processos_cliente_id_fkey(nome))')
      .eq('escritorio_id', escritorioId)
      .eq('concluido', false)
      .gte('data', todayStr)
      .order('data', { ascending: true })
      .limit(5),

    // Recent activity — 3 parallel queries bundled in one Promise.all slot
    Promise.all([
      supabase
        .from('processos')
        .select('id, numero, created_at')
        .eq('escritorio_id', escritorioId)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('clientes')
        .select('id, nome, cpf, created_at')
        .eq('escritorio_id', escritorioId)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('prazos')
        .select('id, titulo, created_at')
        .eq('escritorio_id', escritorioId)
        .order('created_at', { ascending: false })
        .limit(3),
    ]),
  ]);

  if (processosResult.error)    throw processosResult.error;
  if (clientesResult.error)     throw clientesResult.error;
  if (prazosProximosResult.error) throw prazosProximosResult.error;
  if (upcomingPrazosResult.error) throw upcomingPrazosResult.error;

  const [recentProcessos, recentClientes, recentPrazos] = recentResult;

  // Derive critical prazos from the proximos data already fetched
  const prazosCriticos = (prazosProximosResult.data ?? []).filter(
    (p) => p.data <= threeDaysStr,
  ).length;

  // Map upcoming prazos to view model
  const upcomingPrazos: DashboardPrazo[] = (upcomingPrazosResult.data ?? []).map((prazo) => {
    const prazoDate = new Date(prazo.data + 'T00:00:00');
    const diffTime  = prazoDate.getTime() - today.getTime();
    const daysLeft  = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const priority: DashboardPrazo['priority'] =
      daysLeft <= 3 ? 'high' : daysLeft <= 5 ? 'medium' : 'low';

    // Type guard for nested join
    const processoData = prazo.processos as unknown as {
      numero: string;
      clientes: { nome: string } | null;
    } | null;

    return {
      id: prazo.id,
      titulo: prazo.titulo,
      data: prazo.data,
      daysLeft,
      priority,
      clientName: processoData?.clientes?.nome ?? 'Sem cliente',
    };
  });

  // Merge and sort recent activities
  const recentActivities: DashboardActivity[] = [
    ...(recentProcessos.data ?? []).map((p) => ({
      id: `processo-${p.id}`,
      action: 'Novo processo cadastrado',
      details: p.numero,
      time: p.created_at,
    })),
    ...(recentClientes.data ?? []).map((c) => ({
      id: `cliente-${c.id}`,
      action: 'Cliente cadastrado',
      details: `${c.nome} — CPF ${c.cpf}`,
      time: c.created_at,
    })),
    ...(recentPrazos.data ?? []).map((p) => ({
      id: `prazo-${p.id}`,
      action: 'Prazo cadastrado',
      details: p.titulo,
      time: p.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);

  return {
    stats: {
      processosAtivos:  processosResult.count  ?? 0,
      clientesAtivos:   clientesResult.count   ?? 0,
      prazosProximos:   prazosProximosResult.data?.length ?? 0,
      prazosCriticos,
    },
    upcomingPrazos,
    recentActivities,
  };
}

/** Fetches all dashboard data in parallel. Cached for 5 minutes by default. */
export function useDashboard() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.dashboard(escritorioId ?? ''),
    queryFn: () => fetchDashboard(escritorioId!),
    enabled: !!user && !!escritorioId,
  });
}
