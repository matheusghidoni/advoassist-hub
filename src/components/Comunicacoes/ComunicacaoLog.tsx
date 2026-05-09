import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Mail,
  Users,
  MessageCircle,
  MessageSquare,
  Plus,
  Trash2,
  Pencil,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Loader2,
  ChevronLeft,
  X,
} from "lucide-react";
import {
  useComunicacoesPorCliente,
  useComunicacoesPorProcesso,
  useCreateComunicacao,
  useUpdateComunicacao,
  useDeleteComunicacao,
  TIPO_META,
  DIRECAO_META,
  type Comunicacao,
  type TipoComunicacao,
  type DirecaoComunicacao,
} from "@/hooks/queries/useComunicacoesQuery";

// ── Ícones por tipo ───────────────────────────────────────────────────────────

const TipoIcon: Record<TipoComunicacao, React.FC<{ className?: string }>> = {
  ligacao:  ({ className }) => <Phone           className={className} />,
  email:    ({ className }) => <Mail            className={className} />,
  reuniao:  ({ className }) => <Users           className={className} />,
  whatsapp: ({ className }) => <MessageCircle   className={className} />,
  outro:    ({ className }) => <MessageSquare   className={className} />,
};

// ── Schema do formulário ──────────────────────────────────────────────────────

const schema = z.object({
  tipo:             z.enum(["ligacao", "email", "reuniao", "whatsapp", "outro"]),
  direcao:          z.enum(["entrada", "saida"]),
  assunto:          z.string().min(3, "Assunto deve ter ao menos 3 caracteres"),
  descricao:        z.string().optional(),
  data:             z.string().min(1, "Informe a data"),
  hora:             z.string().optional(),
  duracao_minutos:  z.coerce.number().int().min(1).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fornecer cliente OU processo */
  cliente?:  { id: string; nome: string }    | null;
  processo?: { id: string; numero: string }  | null;
}

// ── Helper: formatar data relativa ────────────────────────────────────────────

function formatDataRelativa(dateStr: string): string {
  try {
    const d = parseISO(dateStr + "T12:00:00");
    if (isToday(d))     return "Hoje";
    if (isYesterday(d)) return "Ontem";
    return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ComunicacaoLog({ open, onOpenChange, cliente, processo }: Props) {
  const clienteId  = cliente?.id  ?? null;
  const processoId = processo?.id ?? null;
  const titulo     = cliente  ? `Comunicações — ${cliente.nome}`
                   : processo ? `Comunicações — Processo ${processo.numero}`
                   : "Comunicações";

  // Queries
  const { data: comCliente  = [], isLoading: loadCli } =
    useComunicacoesPorCliente(clienteId);
  const { data: comProcesso = [], isLoading: loadProc } =
    useComunicacoesPorProcesso(processoId);

  const comunicacoes = clienteId ? comCliente : comProcesso;
  const isLoading    = clienteId ? loadCli    : loadProc;

  // Mutations
  const create = useCreateComunicacao();
  const update = useUpdateComunicacao();
  const remove = useDeleteComunicacao();

  // UI state
  const [mode, setMode]               = useState<"list" | "form">("list");
  const [editingItem, setEditingItem] = useState<Comunicacao | null>(null);
  const [filterTipo, setFilterTipo]   = useState<TipoComunicacao | "todos">("todos");
  const [deleteTarget, setDeleteTarget] = useState<Comunicacao | null>(null);

  // Formulário
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo:            "ligacao",
      direcao:         "saida",
      assunto:         "",
      descricao:       "",
      data:            new Date().toISOString().split("T")[0],
      hora:            "",
      duracao_minutos: "",
    },
  });

  // Preencher form ao editar
  useEffect(() => {
    if (mode === "form") {
      if (editingItem) {
        form.reset({
          tipo:            editingItem.tipo,
          direcao:         editingItem.direcao,
          assunto:         editingItem.assunto,
          descricao:       editingItem.descricao ?? "",
          data:            editingItem.data,
          hora:            editingItem.hora ?? "",
          duracao_minutos: editingItem.duracao_minutos ?? "",
        });
      } else {
        form.reset({
          tipo:            "ligacao",
          direcao:         "saida",
          assunto:         "",
          descricao:       "",
          data:            new Date().toISOString().split("T")[0],
          hora:            "",
          duracao_minutos: "",
        });
      }
    }
  }, [mode, editingItem]);

  const handleClose = () => {
    setMode("list");
    setEditingItem(null);
    onOpenChange(false);
  };

  const handleNovaComuncicacao = () => {
    setEditingItem(null);
    setMode("form");
  };

  const handleEditar = (item: Comunicacao) => {
    setEditingItem(item);
    setMode("form");
  };

  const handleVoltar = () => {
    setMode("list");
    setEditingItem(null);
    form.reset();
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      tipo:             values.tipo,
      direcao:          values.direcao,
      assunto:          values.assunto,
      descricao:        values.descricao || null,
      data:             values.data,
      hora:             values.hora || null,
      duracao_minutos:  values.duracao_minutos !== "" && values.duracao_minutos != null
                          ? Number(values.duracao_minutos) : null,
      cliente_id:  clienteId,
      processo_id: processoId,
    };

    try {
      if (editingItem) {
        await update.mutateAsync({
          id: editingItem.id,
          clienteId,
          processoId,
          ...payload,
        });
      } else {
        await create.mutateAsync(payload);
      }
      handleVoltar();
    } catch {
      // toast already shown by hook
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove.mutateAsync({
      id:         deleteTarget.id,
      clienteId,
      processoId,
    });
    setDeleteTarget(null);
  };

  // Filtro por tipo
  const filtradas = filterTipo === "todos"
    ? comunicacoes
    : comunicacoes.filter((c) => c.tipo === filterTipo);

  // Agrupar por data
  const porData = filtradas.reduce((acc, com) => {
    const key = com.data;
    if (!acc[key]) acc[key] = [];
    acc[key].push(com);
    return acc;
  }, {} as Record<string, Comunicacao[]>);

  const datasOrdenadas = Object.keys(porData).sort((a, b) => b.localeCompare(a));

  const tipoWatchValue = form.watch("tipo");
  const mostrarDuracao = tipoWatchValue === "ligacao" || tipoWatchValue === "reuniao";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden p-0">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2">
                {mode === "form" && (
                  <Button variant="ghost" size="icon" onClick={handleVoltar} className="h-7 w-7">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <DialogTitle className="text-base font-semibold">
                  {mode === "form"
                    ? editingItem ? "Editar Comunicação" : "Registrar Comunicação"
                    : titulo}
                </DialogTitle>
              </div>
              {mode === "list" && (
                <Button size="sm" onClick={handleNovaComuncicacao} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Registrar
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* ── MODO: FORMULÁRIO ────────────────────────────────────────────── */}
          {mode === "form" && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                  {/* Tipo + Direção */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="tipo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(Object.keys(TIPO_META) as TipoComunicacao[]).map((t) => (
                              <SelectItem key={t} value={t}>{TIPO_META[t].label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="direcao" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Direção *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="saida">Enviada / Realizada</SelectItem>
                            <SelectItem value="entrada">Recebida</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {/* Data + Hora */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="data" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data *</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="hora" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora</FormLabel>
                        <FormControl><Input type="time" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {/* Duração (só para ligação e reunião) */}
                  {mostrarDuracao && (
                    <FormField control={form.control} name="duracao_minutos" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duração (minutos)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            placeholder="Ex: 30"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {/* Assunto */}
                  <FormField control={form.control} name="assunto" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assunto *</FormLabel>
                      <FormControl>
                        <Input placeholder="Do que se tratou a comunicação?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Notas */}
                  <FormField control={form.control} name="descricao" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas / Resumo</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detalhe o que foi tratado, acordado ou pendente..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Ações */}
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button type="button" variant="outline" onClick={handleVoltar}>
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={create.isPending || update.isPending}
                    >
                      {(create.isPending || update.isPending)
                        ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        : null}
                      {editingItem ? "Salvar alterações" : "Registrar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}

          {/* ── MODO: LISTA ────────────────────────────────────────────────── */}
          {mode === "list" && (
            <>
              {/* Filtros por tipo */}
              <div className="px-6 py-3 border-b shrink-0 flex gap-2 overflow-x-auto">
                {(["todos", ...Object.keys(TIPO_META)] as Array<"todos" | TipoComunicacao>).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterTipo(t)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      filterTipo === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:bg-accent"
                    }`}
                  >
                    {t === "todos" ? "Todos" : TIPO_META[t].label}
                    {t !== "todos" && (
                      <span className="ml-1 opacity-70">
                        ({comunicacoes.filter((c) => c.tipo === t).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Timeline */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filtradas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                    <MessageSquare className="h-12 w-12 opacity-20" />
                    <div className="text-center">
                      <p className="font-medium">
                        {comunicacoes.length === 0
                          ? "Nenhuma comunicação registrada"
                          : "Nenhuma comunicação deste tipo"}
                      </p>
                      <p className="text-sm mt-1">
                        {comunicacoes.length === 0
                          ? 'Clique em "Registrar" para começar o histórico'
                          : "Tente outro filtro"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {datasOrdenadas.map((data) => (
                      <div key={data}>
                        {/* Separador de data */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                            {formatDataRelativa(data)}
                          </span>
                          <div className="h-px flex-1 bg-border" />
                        </div>

                        {/* Items do dia */}
                        <div className="space-y-2">
                          {porData[data].map((com) => {
                            const meta = TIPO_META[com.tipo];
                            const Icon = TipoIcon[com.tipo];
                            return (
                              <div
                                key={com.id}
                                className="group relative flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                              >
                                {/* Ícone do tipo */}
                                <div
                                  className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-full border ${meta.bg}`}
                                >
                                  <Icon className={`h-4 w-4 ${meta.color}`} />
                                </div>

                                {/* Conteúdo */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-medium text-sm text-foreground truncate">
                                        {com.assunto}
                                      </p>
                                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        {/* Direção */}
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                          {com.direcao === "saida"
                                            ? <ArrowUpRight className="h-3 w-3 text-primary" />
                                            : <ArrowDownLeft className="h-3 w-3 text-orange-500" />}
                                          {DIRECAO_META[com.direcao].label}
                                        </span>

                                        {/* Hora */}
                                        {com.hora && (
                                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {com.hora.slice(0, 5)}
                                          </span>
                                        )}

                                        {/* Duração */}
                                        {com.duracao_minutos && (
                                          <span className="text-xs text-muted-foreground">
                                            {com.duracao_minutos}min
                                          </span>
                                        )}

                                        {/* Processo ou cliente (contextual) */}
                                        {clienteId && com.processos?.numero && (
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                            Proc. {com.processos.numero}
                                          </Badge>
                                        )}
                                        {processoId && com.clientes?.nome && (
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                            {com.clientes.nome}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Ações (visíveis no hover) */}
                                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleEditar(com)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => setDeleteTarget(com)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Notas */}
                                  {com.descricao && (
                                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-3">
                                      {com.descricao}
                                    </p>
                                  )}

                                  {/* Registrado por */}
                                  {com.profiles?.full_name && (
                                    <p className="mt-1.5 text-[10px] text-muted-foreground/70">
                                      Registrado por {com.profiles.full_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Resumo total */}
                    <p className="text-center text-xs text-muted-foreground pt-2">
                      {filtradas.length} registro{filtradas.length !== 1 ? "s" : ""} encontrado
                      {filtradas.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comunicação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o registro{" "}
              <strong>"{deleteTarget?.assunto}"</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {remove.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
