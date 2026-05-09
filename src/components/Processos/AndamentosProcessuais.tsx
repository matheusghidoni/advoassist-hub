import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Loader2,
  Trash2,
  Gavel,
  FileText,
  Scale,
  BookOpen,
  CornerUpRight,
  Bell,
  Handshake,
  Send,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";
import {
  useAndamentos,
  useCreateAndamento,
  useDeleteAndamento,
  ANDAMENTO_TIPO_OPTIONS,
  type AndamentoTipo,
} from "@/hooks/queries/useAndamentosQuery";

interface AndamentosProcessuaisProps {
  processoId: string;
  processoNumero: string;
}

// Icon and color per andamento tipo
const TIPO_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  audiencia:  { icon: Gavel,        color: "text-blue-600",    bg: "bg-blue-100" },
  decisao:    { icon: Scale,        color: "text-purple-600",  bg: "bg-purple-100" },
  despacho:   { icon: MessageSquare,color: "text-slate-600",   bg: "bg-slate-100" },
  sentenca:   { icon: BookOpen,     color: "text-red-600",     bg: "bg-red-100" },
  recurso:    { icon: CornerUpRight, color: "text-orange-600", bg: "bg-orange-100" },
  citacao:    { icon: Bell,         color: "text-yellow-600",  bg: "bg-yellow-100" },
  intimacao:  { icon: Bell,         color: "text-amber-600",   bg: "bg-amber-100" },
  acordo:     { icon: Handshake,    color: "text-green-600",   bg: "bg-green-100" },
  peticao:    { icon: Send,         color: "text-cyan-600",    bg: "bg-cyan-100" },
  outros:     { icon: HelpCircle,   color: "text-muted-foreground", bg: "bg-muted" },
};

const fallbackMeta = { icon: FileText, color: "text-muted-foreground", bg: "bg-muted" };

// ── Form schema ──────────────────────────────────────────────────────────────

const andamentoSchema = z.object({
  data:      z.string().min(1, "Data é obrigatória"),
  tipo:      z.string().min(1, "Tipo é obrigatório"),
  descricao: z.string().min(5, "Descrição deve ter no mínimo 5 caracteres"),
});

type AndamentoFormData = z.infer<typeof andamentoSchema>;

// ── Component ────────────────────────────────────────────────────────────────

export function AndamentosProcessuais({ processoId, processoNumero }: AndamentosProcessuaisProps) {
  const [expanded, setExpanded]               = useState(false);
  const [addingNew, setAddingNew]             = useState(false);
  const [deleteId, setDeleteId]               = useState<string | null>(null);

  const { data: andamentos = [], isLoading }  = useAndamentos(processoId);
  const createAndamento                        = useCreateAndamento();
  const deleteAndamento                        = useDeleteAndamento(processoId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<AndamentoFormData>({
    resolver: zodResolver(andamentoSchema),
    defaultValues: { data: "", tipo: "", descricao: "" },
  });

  const tipo = watch("tipo");

  const onSubmit = async (data: AndamentoFormData) => {
    await createAndamento.mutateAsync({
      processo_id: processoId,
      data:        data.data,
      tipo:        data.tipo,
      descricao:   data.descricao,
    });
    toast.success("Andamento registrado com sucesso!");
    reset();
    setAddingNew(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await deleteAndamento.mutateAsync(deleteId);
    toast.success("Andamento removido.");
    setDeleteId(null);
  };

  return (
    <div className="pt-4 border-t border-border">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          Andamentos{andamentos.length > 0 ? ` (${andamentos.length})` : ""}
        </span>
        {expanded
          ? <ChevronUp   className="h-4 w-4 ml-auto text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />
        }
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Timeline */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : andamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhum andamento registrado ainda.
            </p>
          ) : (
            <div className="relative space-y-0">
              {/* Vertical connector line */}
              <div className="absolute left-4 top-5 bottom-5 w-px bg-border" aria-hidden />

              {andamentos.map((andamento) => {
                const meta = TIPO_META[andamento.tipo] ?? fallbackMeta;
                const Icon = meta.icon;
                const tipoLabel =
                  ANDAMENTO_TIPO_OPTIONS.find((o) => o.value === andamento.tipo)?.label ??
                  andamento.tipo;

                return (
                  <div key={andamento.id} className="relative flex gap-4 pb-4">
                    {/* Icon bubble */}
                    <div
                      className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${meta.bg}`}
                    >
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 rounded-lg border border-border bg-card p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold uppercase tracking-wide ${meta.color}`}>
                              {tipoLabel}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(andamento.data + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground leading-snug">{andamento.descricao}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteId(andamento.id)}
                          className="flex-shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remover andamento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new form */}
          {addingNew ? (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="rounded-lg border border-border bg-muted/30 p-4 space-y-3"
            >
              <p className="text-sm font-medium">Novo Andamento</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`andamento-data-${processoId}`} className="text-xs">Data *</Label>
                  <Input
                    id={`andamento-data-${processoId}`}
                    type="date"
                    {...register("data")}
                    className="h-8 text-sm"
                  />
                  {errors.data && (
                    <p className="text-xs text-destructive">{errors.data.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`andamento-tipo-${processoId}`} className="text-xs">Tipo *</Label>
                  <Select value={tipo} onValueChange={(v) => setValue("tipo", v as AndamentoTipo)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ANDAMENTO_TIPO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tipo && (
                    <p className="text-xs text-destructive">{errors.tipo.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`andamento-desc-${processoId}`} className="text-xs">Descrição *</Label>
                <Textarea
                  id={`andamento-desc-${processoId}`}
                  {...register("descricao")}
                  placeholder="Descreva o andamento processual..."
                  rows={2}
                  className="text-sm resize-none"
                />
                {errors.descricao && (
                  <p className="text-xs text-destructive">{errors.descricao.message}</p>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { reset(); setAddingNew(false); }}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={createAndamento.isPending}>
                  {createAndamento.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1"
              onClick={() => setAddingNew(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Registrar andamento
            </Button>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover andamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este andamento do processo {processoNumero}? Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteAndamento.isPending}>
              {deleteAndamento.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
