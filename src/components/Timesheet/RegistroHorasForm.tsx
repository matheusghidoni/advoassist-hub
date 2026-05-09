import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useClientes } from "@/hooks/queries/useClientesQuery";
import { useProcessos } from "@/hooks/queries/useProcessosQuery";
import {
  useCreateRegistroHoras,
  useUpdateRegistroHoras,
  type RegistroHoras,
} from "@/hooks/queries/useTimesheetQuery";

// ── Schema de validação ───────────────────────────────────────────────────────

// Sentinel usado nos <SelectItem> — o Radix UI proíbe value=""
const NONE = "__none__";

const schema = z.object({
  descricao:   z.string().min(3, "Descrição obrigatória (mínimo 3 caracteres)"),
  data:        z.string().min(1, "Data obrigatória"),
  horas:       z
    .string()
    .min(1, "Horas obrigatórias")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Informe um valor positivo")
    .refine((v) => Number(v) <= 24, "Máximo 24h por registro"),
  valor_hora:  z.string().optional(),
  processo_id: z.string().optional(),
  cliente_id:  z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface RegistroHorasFormProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  registro?:    RegistroHoras | null; // se fornecido, modo edição
}

// ── Componente ────────────────────────────────────────────────────────────────

export function RegistroHorasForm({ open, onOpenChange, registro }: RegistroHorasFormProps) {
  const isEdit = !!registro;

  const { data: clientes  = [] } = useClientes();
  const { data: processos = [] } = useProcessos();

  const createMutation = useCreateRegistroHoras();
  const updateMutation = useUpdateRegistroHoras();
  const isSaving       = createMutation.isPending || updateMutation.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      descricao:   "",
      data:        new Date().toISOString().split("T")[0],
      horas:       "",
      valor_hora:  "",
      processo_id: NONE,
      cliente_id:  NONE,
    },
  });

  // Preenche o form ao abrir em modo edição
  useEffect(() => {
    if (open && registro) {
      form.reset({
        descricao:   registro.descricao,
        data:        registro.data,
        horas:       String(registro.horas),
        valor_hora:  registro.valor_hora != null ? String(registro.valor_hora) : "",
        processo_id: registro.processo_id ?? NONE,
        cliente_id:  registro.cliente_id  ?? NONE,
      });
    } else if (open && !registro) {
      form.reset({
        descricao:   "",
        data:        new Date().toISOString().split("T")[0],
        horas:       "",
        valor_hora:  "",
        processo_id: NONE,
        cliente_id:  NONE,
      });
    }
  }, [open, registro, form]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      descricao:   values.descricao,
      data:        values.data,
      horas:       Number(values.horas),
      valor_hora:  values.valor_hora && values.valor_hora !== "" ? Number(values.valor_hora) : null,
      processo_id: values.processo_id && values.processo_id !== NONE ? values.processo_id : null,
      cliente_id:  values.cliente_id  && values.cliente_id  !== NONE ? values.cliente_id  : null,
    };

    if (isEdit && registro) {
      await updateMutation.mutateAsync({ id: registro.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Registro" : "Novo Registro de Horas"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Descrição */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição da Atividade <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex.: Elaboração de petição inicial, Audiência de instrução…"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data + Horas + Valor/hora — linha */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="horas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.25"
                        min="0.25"
                        max="24"
                        placeholder="1.5"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valor_hora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor/hora (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="350,00"
                        {...field}
                      />
                    </FormControl>
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
                        <SelectValue placeholder="Selecione um processo..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>— Nenhum —</SelectItem>
                      {processos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.numero} · {p.tipo}
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
                        <SelectValue placeholder="Selecione um cliente..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>— Nenhum —</SelectItem>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Salvando…" : isEdit ? "Salvar alterações" : "Registrar horas"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
