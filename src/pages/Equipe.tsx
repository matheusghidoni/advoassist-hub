import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  UserPlus,
  Mail,
  MoreVertical,
  Shield,
  Trash2,
  Crown,
  Loader2,
  Link,
  Check,
} from "lucide-react";

import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  useEquipe,
  useConvites,
  useConvidarMembro,
  useUpdateRoleMembro,
  useRemoverMembro,
  useCancelarConvite,
  type MembroEquipe,
} from "@/hooks/queries/useEquipeQuery";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/hooks/useAuth";
import {
  ROLE_META,
  podeGerenciarEquipe,
  isDono,
  type RoleEscritorio,
} from "@/types/equipe";

// ── Invite form schema ────────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.enum(["admin", "advogado", "estagiario", "secretaria"] as const, {
    required_error: "Selecione um papel",
  }),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined, email: string): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function roleBadge(role: string) {
  const meta = ROLE_META[role as RoleEscritorio];
  if (!meta) return <Badge variant="outline">{role}</Badge>;
  return (
    <Badge variant="outline" className={meta.color}>
      {meta.label}
    </Badge>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function MemberAvatar({ name, email }: { name: string | null; email?: string }) {
  const initials = getInitials(name, email ?? "??");
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
      {initials}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Equipe() {
  const { user } = useAuth();
  const { myRole } = useWorkspace();

  const { data: membros = [], isLoading: loadingMembros } = useEquipe();
  const { data: convites = [], isLoading: loadingConvites } = useConvites();

  const convidarMembro = useConvidarMembro();
  const updateRole = useUpdateRoleMembro();
  const removerMembro = useRemoverMembro();
  const cancelarConvite = useCancelarConvite();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [copiedId, setCopiedId]     = useState<string | null>(null);

  const copiarLink = (token: string, id: string) => {
    const url = `${window.location.origin}/aceitar-convite/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const canManage = podeGerenciarEquipe(myRole);
  const amDono = isDono(myRole);

  const activeMembros = membros.filter((m) => m.status === "ativo");

  // ── Invite form ─────────────────────────────────────────────────────────────

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "advogado" },
  });

  async function onSubmitInvite(values: InviteFormValues) {
    await convidarMembro.mutateAsync(values);
    form.reset();
    setInviteOpen(false);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isLoading = loadingMembros || loadingConvites;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
            <p className="text-muted-foreground">
              Gerencie os membros do seu escritório
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setInviteOpen(true)} className="shrink-0">
              <UserPlus className="mr-2 h-4 w-4" />
              Convidar Membro
            </Button>
          )}
        </div>

        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Membros Ativos</p>
                <p className="text-2xl font-bold">{activeMembros.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Mail className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Convites Pendentes
                </p>
                <p className="text-2xl font-bold">{convites.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Seu Papel</p>
                <p className="text-lg font-semibold">
                  {myRole ? ROLE_META[myRole]?.label ?? myRole : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Members list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Membros da Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : membros.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <Users className="h-10 w-10 opacity-30" />
                <p className="font-medium">Nenhum membro encontrado</p>
                <p className="text-sm">
                  Convide colegas para colaborar no escritório.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {membros.map((membro) => (
                  <MemberRow
                    key={membro.id}
                    membro={membro}
                    currentUserId={user?.id ?? ""}
                    canManage={canManage}
                    amDono={amDono}
                    onChangeRole={(role) =>
                      updateRole.mutate({ id: membro.id, role })
                    }
                    onRemove={() => removerMembro.mutate(membro.id)}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Pending invites — only visible to dono/admin */}
        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" />
                Convites Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {convites.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum convite pendente.
                </p>
              ) : (
                <ul className="divide-y">
                  {convites.map((convite) => (
                    <li
                      key={convite.id}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="truncate font-medium">
                          {convite.email}
                        </span>
                        <div className="flex items-center gap-2">
                          {roleBadge(convite.role)}
                          <span className="text-xs text-muted-foreground">
                            Expira em{" "}
                            {format(
                              new Date(convite.expires_at),
                              "dd/MM/yyyy",
                              { locale: ptBR }
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => copiarLink(convite.token, convite.id)}
                        >
                          {copiedId === convite.id ? (
                            <><Check className="h-3.5 w-3.5 text-green-500" />Copiado!</>
                          ) : (
                            <><Link className="h-3.5 w-3.5" />Copiar link</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => cancelarConvite.mutate(convite.id)}
                          disabled={cancelarConvite.isPending}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Convidar Membro
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitInvite)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="colega@escritorio.com.br"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Papel</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o papel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">
                          {ROLE_META.admin.label}
                        </SelectItem>
                        <SelectItem value="advogado">
                          {ROLE_META.advogado.label}
                        </SelectItem>
                        <SelectItem value="estagiario">
                          {ROLE_META.estagiario.label}
                        </SelectItem>
                        <SelectItem value="secretaria">
                          {ROLE_META.secretaria.label}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
                <strong>Como funciona:</strong> após criar o convite, copie o link gerado na seção "Convites Pendentes" e envie para o colega. Ele precisará acessar o link para entrar na equipe.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setInviteOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={convidarMembro.isPending}
                >
                  {convidarMembro.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Gerar Convite
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

// ── MemberRow subcomponent ────────────────────────────────────────────────────

interface MemberRowProps {
  membro: MembroEquipe;
  currentUserId: string;
  canManage: boolean;
  amDono: boolean;
  onChangeRole: (role: string) => void;
  onRemove: () => void;
}

function MemberRow({
  membro,
  currentUserId,
  canManage,
  amDono,
  onChangeRole,
  onRemove,
}: MemberRowProps) {
  const isCurrentUser = membro.user_id === currentUserId;
  const isDonoMember = membro.role === "dono";
  const fullName = membro.profiles?.full_name ?? null;
  const oab = membro.profiles?.oab ?? null;

  const roleOptions: RoleEscritorio[] = [
    "admin",
    "advogado",
    "estagiario",
    "secretaria",
  ];

  const showMenu = canManage && !isCurrentUser;

  return (
    <li className="flex items-center gap-4 py-4">
      <MemberAvatar name={fullName} email={membro.user_id} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {fullName ?? "Usuário"}
          </span>
          {isCurrentUser && (
            <Badge variant="secondary" className="text-xs">
              Você
            </Badge>
          )}
          {isDonoMember && (
            <Crown className="h-4 w-4 text-amber-500" aria-label="Dono" />
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {roleBadge(membro.role)}
          {oab && (
            <span className="text-xs text-muted-foreground">OAB {oab}</span>
          )}
        </div>
      </div>

      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Ações</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Change role submenu — can't change dono via this UI */}
            {!isDonoMember && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Shield className="mr-2 h-4 w-4" />
                  Alterar papel
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {roleOptions.map((r) => (
                    <DropdownMenuItem
                      key={r}
                      onSelect={() => onChangeRole(r)}
                      disabled={membro.role === r}
                      className={membro.role === r ? "font-semibold" : ""}
                    >
                      {ROLE_META[r].label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}

            {/* Remove from team — only dono can remove, can't remove another dono */}
            {amDono && !isDonoMember && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={onRemove}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover da equipe
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
