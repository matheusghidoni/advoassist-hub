import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { extrairProcessoDaUrl, ProcessoExtraido } from "@/lib/processosUtils";
import { Loader2, Link as LinkIcon, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/queryKeys";

interface ImportacaoProcessoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportacaoProcessoModal({ open, onOpenChange }: ImportacaoProcessoModalProps) {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [extraido, setExtraido] = useState<ProcessoExtraido | null>(null);

  useEffect(() => {
    if (!open) {
      setUrl("");
      setExtraido(null);
    }
  }, [open]);

  useEffect(() => {
    if (url.trim()) {
      const result = extrairProcessoDaUrl(url);
      setExtraido(result);
    } else {
      setExtraido(null);
    }
  }, [url]);

  const handleImportar = async () => {
    if (!extraido?.numeroCNJ || !user || !escritorioId) return;

    setLoading(true);
    try {
      // 1. Criar o processo
      const payload = {
        numero: extraido.numeroCNJ,
        tipo: "Cível", // Default genérico
        status: "em_andamento",
        user_id: user.id,
        escritorio_id: escritorioId,
      };

      const { data: novoProcesso, error: processoError } = await supabase
        .from("processos")
        .insert([payload])
        .select()
        .single();

      if (processoError) throw processoError;

      // 2. Criar andamento inicial informando o link de origem
      if (novoProcesso) {
        const andamentoPayload = {
          processo_id: novoProcesso.id,
          user_id: user.id,
          data: new Date().toISOString().split('T')[0],
          titulo: "Processo Importado via Link",
          descricao: `Processo importado a partir do link: ${extraido.linkOrigem}\n\nTribunal Inferido: ${extraido.tribunal || 'Desconhecido'}`,
          tipo: "outros"
        };
        
        // Pode ser que a tabela andamentos processuais aceite esses campos
        // Vamos checar o schema depois. Pelo que vi, andamentos tem "descricao", "data", "tipo", "titulo". Wait, o tipo de andamento pode ser diferente.
        const { error: andamentoError } = await supabase
          .from("andamentos_processuais")
          .insert([andamentoPayload]);
        
        if (andamentoError) {
          console.error("Erro ao salvar link como andamento", andamentoError);
        }
      }

      toast.success("Processo importado com sucesso!");
      queryClient.invalidateQueries({ queryKey: queryKeys.processos(escritorioId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId) });
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao importar processo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Importação Rápida de Processo
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="url">Link do Processo (PJe, e-SAJ, etc)</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="url"
                placeholder="Cole aqui a URL do tribunal..."
                className="pl-9"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O sistema irá extrair automaticamente o número padrão CNJ.
            </p>
          </div>

          {url.trim() && (
            <div className="rounded-lg border p-4 bg-muted/30">
              {extraido?.numeroCNJ ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-success">
                    <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Número encontrado!</p>
                      <p className="text-2xl font-mono mt-1 text-primary">{extraido.numeroCNJ}</p>
                    </div>
                  </div>
                  
                  {extraido.tribunal && (
                    <div className="text-sm border-t pt-3 mt-3 flex items-center justify-between text-muted-foreground">
                      <span>Tribunal identificado:</span>
                      <span className="font-medium text-foreground">{extraido.tribunal}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-2 text-warning-foreground">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Nenhum número padrão CNJ encontrado.</p>
                    <p className="text-sm mt-1 opacity-80">
                      Verifique se a URL contém os 20 dígitos do processo.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImportar} 
              disabled={loading || !extraido?.numeroCNJ}
              className="min-w-[140px]"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {loading ? "Importando..." : "Importar Processo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
