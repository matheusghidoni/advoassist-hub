/**
 * Centralized React Query key factory.
 *
 * Rules:
 *  - Business data keys use escritorioId (shared across team members).
 *  - User-personal keys (notifications, profile) use userId.
 *  - Always use `as const` to keep the tuple type narrow.
 */

export const queryKeys = {
  // ── Per-escritório (team-shared data) ────────────────────────────────────
  clientes:        (eid: string) => ['clientes',        eid] as const,
  processos:       (eid: string) => ['processos',       eid] as const,
  prazos:          (eid: string) => ['prazos',          eid] as const,
  honorarios:      (eid: string) => ['honorarios',      eid] as const,
  despesas:        (eid: string) => ['despesas',        eid] as const,
  tarefas:         (eid: string) => ['tarefas',         eid] as const,
  registrosHoras:  (eid: string) => ['registros_horas', eid] as const,
  dashboard:       (eid: string) => ['dashboard',       eid] as const,
  equipe:          (eid: string) => ['equipe',          eid] as const,
  agenda:          (eid: string, start: string, end: string) => ['agenda', eid, start, end] as const,

  // ── Per-processo (scoped by id, RLS handles team access) ─────────────────
  andamentos:      (processoId: string) => ['andamentos', processoId] as const,

  // ── WhatsApp (per-escritório) ─────────────────────────────────────────────
  whatsappInstance: (eid: string) => ['whatsapp_instance', eid] as const,
} as const;
