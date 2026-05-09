import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useProcessos } from "@/hooks/queries/useProcessosQuery";
import { useClientes } from "@/hooks/queries/useClientesQuery";
import {
  useCreateDespesa,
  useUpdateDespesa,
  CATEGORIAS_DESPESA,
  type Despesa,
} from "@/hooks/queries/useDespesasQuery";

// ── Sentinel for empty FK selects ─────────────────────────────────────────────
const NONE = "__none__";

// ── Schema ────────────────────────────────────────────────────────────────────
const schema = z.object({
  descricao:   z.string().min(3, "Descrição deve ter ao menos 3 caracteres"),
  categoria:   z.string().min(1, "Selecione uma categoria"),
  valor:       z.coerce.number({ invalid_type_error: "Informe um valor" }).min(0.01, "Valor deve ser maior que zero"),
  data:        z.string().min(1, "Informe a data"),
  status:      z.enum(["pendente", "pago"]),
  processo_id: z.string(),
  cliente_id:  z.string(),
  observacoes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editingDespesa?: Despesa | null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function DespesaForm({ open, onOpenChange, onSuccess, editingDespesa }: Props) {
  const { data: processos = [] } = useProcessos();
  const { data: clientes  = [] } = useClientes();
  const create = useCreateDespesa();
  const update = useUpdateDespesa();
  const isEditing = !!editingDespesa;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      descricao:   "",
      categoria:   "custas_judiciais",
      valor:       0,
      data:        new Date().toISOString().split("T")[0],
      status:      "pendente",
      processo_id: NONE,
      cliente_id:  NONE,
      observacoes: "",
    },
  });

  // Reset form when dialog opens / editing target changes
  useEffect(() => {
    if (open) {
      if (editingDespesa) {
        form.reset({
          descricao:   editingDespesa.descricao,
          categoria:   editingDespesa.categoria,
          valor:       editingDespesa.valor,
          data:        editingDespesa.data,
          status:      editingDespesa.status,
          processo_id: editingDespesa.processo_id ?? NONE,
          cliente_id:  editingDespesa.cliente_id  ?? NONE,
          observacoes: editingDespesa.observacoes ?? "",
        });
      } else {
        form.reset({
          descricao:   "",
          categoria:   "custas_judiciais",
          valor:       0,
          data:        new Date().toISOString().split("T")[0],
          status:      "pendente",
          processo_id: NONE,
          cliente_id:  NONE,
          observacoes: "",
        });
      }
    }
  }, [open, editingDespesa]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      descricao:   values.descricao,
      categoria:   values.categoria,
      valor:       values.valor,
      data:        values.data,
      status:      values.status,
      processo_id: values.processo_id !== NONE ? values.processo_id : null,
      cliente_id:  values.cliente_id  !== NONE ? values.cliente_id  : null,
      observacoes: values.observacoes || null,
    };

    try {
      if (isEditing) {
        await update.mutateAsync({ id: editingDespesa!.id, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // mutation's onError already shows a toast; keep dialog open so user can retry
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Despesa" : "Nova Despesa / Custa"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Descrição */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Custas de distribuição" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categoria + Valor */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CATEGORIAS_DESPESA).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Data + Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Processo */}
            <FormField
              control={form.control}
              name="processo_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Processo (opcional)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>— Nenhum —</SelectItem>
                      {processos.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.numero} — {p.tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cliente */}
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente (opcional)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>— Nenhum —</SelectItem>
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observações */}
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : isEditing ? "Salvar alterações" : "Registrar Despesa"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
