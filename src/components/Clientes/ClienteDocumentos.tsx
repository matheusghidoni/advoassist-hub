import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, Trash2, Download, Loader2, File } from "lucide-react";
import { format } from "date-fns";
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

interface Documento {
  id: string;
  nome_arquivo: string;
  caminho_storage: string;
  tamanho_bytes: number | null;
  tipo_mime: string | null;
  created_at: string;
}

interface ClienteDocumentosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: { id: string; nome: string } | null;
}

export function ClienteDocumentos({ open, onOpenChange, cliente }: ClienteDocumentosProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentoToDelete, setDocumentoToDelete] = useState<Documento | null>(null);

  useEffect(() => {
    if (open && cliente) {
      fetchDocumentos();
    }
  }, [open, cliente]);

  const fetchDocumentos = async () => {
    if (!cliente) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cliente_documentos")
        .select("*")
        .eq("cliente_id", cliente.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocumentos(data || []);
    } catch (error) {
      toast.error("Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !cliente) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${cliente.id}/${fileName}`;

      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from("client-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Salvar referência no banco
      const { error: dbError } = await supabase
        .from("cliente_documentos")
        .insert({
          cliente_id: cliente.id,
          user_id: user.id,
          nome_arquivo: file.name,
          caminho_storage: filePath,
          tamanho_bytes: file.size,
          tipo_mime: file.type,
        });

      if (dbError) throw dbError;

      toast.success("Documento enviado com sucesso!");
      fetchDocumentos();
    } catch (error: any) {
      toast.error("Erro ao enviar documento: " + error.message);
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = "";
    }
  };

  const handleDownload = async (documento: Documento) => {
    try {
      const { data, error } = await supabase.storage
        .from("client-documents")
        .download(documento.caminho_storage);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = documento.nome_arquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Erro ao baixar documento");
    }
  };

  const handleDelete = async () => {
    if (!documentoToDelete) return;

    try {
      // Deletar do storage
      const { error: storageError } = await supabase.storage
        .from("client-documents")
        .remove([documentoToDelete.caminho_storage]);

      if (storageError) throw storageError;

      // Deletar do banco
      const { error: dbError } = await supabase
        .from("cliente_documentos")
        .delete()
        .eq("id", documentoToDelete.id);

      if (dbError) throw dbError;

      toast.success("Documento excluído com sucesso!");
      fetchDocumentos();
    } catch (error) {
      toast.error("Erro ao excluir documento");
    } finally {
      setDeleteDialogOpen(false);
      setDocumentoToDelete(null);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string | null) => {
    if (mimeType?.includes("pdf")) return "📄";
    if (mimeType?.includes("image")) return "🖼️";
    if (mimeType?.includes("word") || mimeType?.includes("document")) return "📝";
    if (mimeType?.includes("sheet") || mimeType?.includes("excel")) return "📊";
    return "📎";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos - {cliente?.nome}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Upload */}
            <div className="flex gap-2">
              <Input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => document.getElementById("file-upload")?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "Enviando..." : "Enviar Documento"}
              </Button>
            </div>

            {/* Lista de documentos */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : documentos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <File className="h-12 w-12 mb-2 opacity-50" />
                  <p>Nenhum documento encontrado</p>
                  <p className="text-sm">Clique no botão acima para enviar</p>
                </div>
              ) : (
                documentos.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-2xl">{getFileIcon(doc.tipo_mime)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{doc.nome_arquivo}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(doc.tamanho_bytes)} • {format(new Date(doc.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(doc)}
                        title="Baixar"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDocumentoToDelete(doc);
                          setDeleteDialogOpen(true);
                        }}
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o documento "{documentoToDelete?.nome_arquivo}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
