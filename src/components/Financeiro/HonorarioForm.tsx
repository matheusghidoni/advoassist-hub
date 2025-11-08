import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Processo {
  id: string;
  numero: string;
  clientes: { nome: string } | null;
}

interface HonorarioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingHonorario?: any;
}

export function HonorarioForm({ open, onOpenChange, onSuccess, editingHonorario }: HonorarioFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [processos, setProcessos] = useState<Processo[]>([]);
  
  const [formData, setFormData] = useState({
    processo_id: '',
    valor_total: '',
    valor_pago: '',
    data_vencimento: '',
    status: 'pendente',
    observacoes: '',
    tipo_pagamento: 'a_vista',
    numero_parcelas: ''
  });

  useEffect(() => {
    if (open) {
      fetchProcessos();
      if (editingHonorario) {
        setFormData({
          processo_id: editingHonorario.processo_id || '',
          valor_total: editingHonorario.valor_total?.toString() || '',
          valor_pago: editingHonorario.valor_pago?.toString() || '',
          data_vencimento: editingHonorario.data_vencimento || '',
          status: editingHonorario.status || 'pendente',
          observacoes: editingHonorario.observacoes || '',
          tipo_pagamento: editingHonorario.tipo_pagamento || 'a_vista',
          numero_parcelas: editingHonorario.numero_parcelas?.toString() || ''
        });
      } else {
        setFormData({
          processo_id: '',
          valor_total: '',
          valor_pago: '',
          data_vencimento: '',
          status: 'pendente',
          observacoes: '',
          tipo_pagamento: 'a_vista',
          numero_parcelas: ''
        });
      }
    }
  }, [open, editingHonorario]);

  const fetchProcessos = async () => {
    const { data, error } = await supabase
      .from('processos')
      .select('id, numero, clientes!processos_cliente_id_fkey(nome)')
      .eq('user_id', user?.id)
      .order('numero', { ascending: true });

    if (error) {
      console.error('Erro ao buscar processos:', error);
      return;
    }

    setProcessos(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        user_id: user?.id,
        processo_id: formData.processo_id || null,
        valor_total: parseFloat(formData.valor_total),
        valor_pago: parseFloat(formData.valor_pago || '0'),
        data_vencimento: formData.data_vencimento || null,
        status: formData.status,
        observacoes: formData.observacoes || null,
        tipo_pagamento: formData.tipo_pagamento,
        numero_parcelas: formData.tipo_pagamento === 'parcelado' ? parseInt(formData.numero_parcelas) : null
      };

      if (editingHonorario) {
        const { error } = await supabase
          .from('honorarios')
          .update(payload)
          .eq('id', editingHonorario.id);

        if (error) throw error;
        toast.success('Honorário atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('honorarios')
          .insert([payload]);

        if (error) throw error;
        toast.success('Honorário cadastrado com sucesso!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar honorário:', error);
      toast.error(error.message || 'Erro ao salvar honorário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingHonorario ? 'Editar Honorário' : 'Novo Honorário'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="processo_id">Processo (Opcional)</Label>
            <Select
              value={formData.processo_id}
              onValueChange={(value) => setFormData({ ...formData, processo_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um processo" />
              </SelectTrigger>
              <SelectContent>
                {processos.map((processo) => (
                  <SelectItem key={processo.id} value={processo.id}>
                    {processo.numero} - {processo.clientes?.nome || 'Sem cliente'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_total">Valor Total *</Label>
              <Input
                id="valor_total"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.valor_total}
                onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_pago">Valor Pago</Label>
              <Input
                id="valor_pago"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.valor_pago}
                onChange={(e) => setFormData({ ...formData, valor_pago: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo_pagamento">Tipo de Pagamento *</Label>
              <Select
                value={formData.tipo_pagamento}
                onValueChange={(value) => setFormData({ ...formData, tipo_pagamento: value, numero_parcelas: value === 'a_vista' ? '' : formData.numero_parcelas })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_vista">À Vista</SelectItem>
                  <SelectItem value="parcelado">Parcelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.tipo_pagamento === 'parcelado' && (
              <div className="space-y-2">
                <Label htmlFor="numero_parcelas">Número de Parcelas *</Label>
                <Input
                  id="numero_parcelas"
                  type="number"
                  min="2"
                  placeholder="Ex: 12"
                  value={formData.numero_parcelas}
                  onChange={(e) => setFormData({ ...formData, numero_parcelas: e.target.value })}
                  required
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_vencimento">Data Vencimento</Label>
              <Input
                id="data_vencimento"
                type="date"
                value={formData.data_vencimento}
                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações sobre o honorário..."
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : editingHonorario ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
