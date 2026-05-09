import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload, FileText, Trash2, Download, Loader2,
  File, Eye, FolderOpen, FileImage, FileSpreadsheet,
  FileCode, Archive,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ProcessoDocumento {
  id: string;
  nome_arquivo: string;
  caminho_storage: string;
  tamanho_bytes: number | null;
  tipo_mime: string | null;
  created_at: string;
}

export interface ProcessoDocumentosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processo: { id: string; numero: string } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STORAGE_BUCKET = "client-documents";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function canPreview(mime: string | null): boolean {
  return !!(mime?.includes("pdf") || mime?.includes("image"));
}

function FileIcon({ mime }: { mime: string | null }) {
  if (mime?.includes("pdf"))    return <FileText    className="h-8 w-8 text-red-500" />;
  if (mime?.includes("image"))  return <FileImage   className="h-8 w-8 text-blue-500" />;
  if (mime?.includes("sheet") || mime?.includes("excel"))
                                return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
  if (mime?.includes("word") || mime?.includes("document"))
                                return <FileText    className="h-8 w-8 text-blue-700" />;
  if (mime?.includes("zip") || mime?.includes("compressed"))
                                return <Archive     className="h-8 w-8 text-yellow-600" />;
  if (mime?.includes("text"))   return <FileCode    className="h-8 w-8 text-muted-foreground" />;
  return                               <File        className="h-8 w-8 text-muted-foreground" />;
}

function MimeBadge({ mime }: { mime: string | null }) {
  if (!mime) return null;
  const label =
    mime.includes("pdf")     ? "PDF"   :
    mime.includes("image")   ? mime.split("/")[1]?.toUpperCase() ?? "IMG" :
    mime.includes("sheet")   ? "XLS"   :
    mime.includes("excel")   ? "XLS"   :
    mime.includes("word")    ? "DOC"   :
    mime.includes("document")? "DOC"   :
    mime.includes("zip")     ? "ZIP"   :
    mime.includes("text")    ? "TXT"   : "ARQ";
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
      {label}
    </Badge>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ProcessoDocumentos({ open, onOpenChange, processo }: ProcessoDocumentosProps) {
  const [documentos,       setDocumentos]       = useState<ProcessoDocumento[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [uploading,        setUploading]        = useState(false);
  const [previewDoc,       setPreviewDoc]       = useState<ProcessoDocumento | null>(null);
  const [previewUrl,       setPreviewUrl]       = useState<string | null>(null);
  const [loadingPreview,   setLoadingPreview]   = useState(false);
  const [deletando,        setDeletando]        = useState<ProcessoDocumento | null>(null);

  useEffect(() => {
    if (open && processo) fetchDocumentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, processo]);

  // ── Busca ─────────────────────────────────────────────────────────────────

  async function fetchDocumentos() {
    if (!processo) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("processo_documentos")
        .select("*")
        .eq("processo_id", processo.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDocumentos(data ?? []);
    } catch {
      toast.error("Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !processo) return;

    // Limite de 50 MB
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Limite: 50 MB");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const ext      = file.name.split(".").pop();
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      // Caminho: {user_id}/processos/{processo_id}/arquivo
      // O primeiro segmento deve ser o user_id para satisfazer a storage policy existente
      const path     = `${user.id}/processos/${processo.id}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("processo_documentos")
        .insert({
          processo_id:     processo.id,
          user_id:         user.id,
          nome_arquivo:    file.name,
          caminho_storage: path,
          tamanho_bytes:   file.size,
          tipo_mime:       file.type || null,
        });
      if (dbError) throw dbError;

      toast.success("Documento enviado com sucesso!");
      fetchDocumentos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Erro ao enviar documento: ${msg}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  // ── Download ──────────────────────────────────────────────────────────────

  async function handleDownload(doc: ProcessoDocumento) {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(doc.caminho_storage);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = doc.nome_arquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao baixar documento");
    }
  }

  // ── Preview ───────────────────────────────────────────────────────────────

  async function handlePreview(doc: ProcessoDocumento) {
    if (!canPreview(doc.tipo_mime)) {
      toast.info("Visualização não disponível para este tipo de arquivo. Use o botão de download.");
      return;
    }
    setPreviewDoc(doc);
    setLoadingPreview(true);
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(doc.caminho_storage);
      if (error) throw error;
      setPreviewUrl(URL.createObjectURL(data));
    } catch {
      toast.error("Erro ao carregar visualização");
      setPreviewDoc(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewDoc(null);
  }

  // ── Exclusão ──────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deletando) return;
    try {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([deletando.caminho_storage]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("processo_documentos")
        .delete()
        .eq("id", deletando.id);
      if (dbError) throw dbError;

      toast.success("Documento excluído.");
      setDeletando(null);
      fetchDocumentos();
    } catch {
      toast.error("Erro ao excluir documento");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Modal principal ── */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Documentos — Processo {processo?.numero}
            </DialogTitle>
            <DialogDescription>
              Gerencie os arquivos vinculados a este processo. Limite por arquivo: 50 MB.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Botão de upload */}
            <div>
              <Input
                id="processo-file-upload"
                type="file"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
                accept="*/*"
              />
              <Button
                variant="outline"
                className="w-full gap-2 border-dashed h-12 text-muted-foreground hover:text-foreground"
                onClick={() => document.getElementById("processo-file-upload")?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</>
                ) : (
                  <><Upload className="h-4 w-4" /> Enviar documento</>
                )}
              </Button>
            </div>

            {/* Lista */}
            <ScrollArea className="flex-1 min-h-[200px] pr-1">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : documentos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                  <FolderOpen className="h-12 w-12 opacity-30" />
                  <p className="font-medium">Nenhum documento</p>
                  <p className="text-sm">Clique no botão acima para enviar o primeiro arquivo</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 hover:bg-muted/30 transition-colors group"
                    >
                      {/* Ícone */}
                      <div className="shrink-0">
                        <FileIcon mime={doc.tipo_mime} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate max-w-[280px]" title={doc.nome_arquivo}>
                            {doc.nome_arquivo}
                          </p>
                          <MimeBadge mime={doc.tipo_mime} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatFileSize(doc.tamanho_bytes)} ·{" "}
                          {format(new Date(doc.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>

                      {/* Ações */}
                      <TooltipProvider>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canPreview(doc.tipo_mime) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon" className="h-8 w-8"
                                  onClick={() => handlePreview(doc)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Visualizar</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => handleDownload(doc)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Baixar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeletando(doc)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Rodapé com contagem */}
            {documentos.length > 0 && (
              <p className="text-xs text-muted-foreground text-right">
                {documentos.length} documento{documentos.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal de preview ── */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && closePreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="truncate pr-8 text-sm">
              {previewDoc?.nome_arquivo}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center min-h-[400px]">
            {loadingPreview ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : previewUrl && previewDoc?.tipo_mime?.includes("pdf") ? (
              <iframe
                src={previewUrl}
                className="w-full h-[70vh] rounded border"
                title={previewDoc.nome_arquivo}
              />
            ) : previewUrl && previewDoc?.tipo_mime?.includes("image") ? (
              <img
                src={previewUrl}
                alt={previewDoc.nome_arquivo}
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            ) : null}
          </div>

          <div className="px-4 py-3 border-t flex justify-end gap-2">
            <Button variant="outline" onClick={closePreview}>Fechar</Button>
            {previewDoc && (
              <Button onClick={() => handleDownload(previewDoc)}>
                <Download className="h-4 w-4 mr-2" /> Baixar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirmação de exclusão ── */}
      <AlertDialog open={!!deletando} onOpenChange={(o) => !o && setDeletando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo <strong>"{deletando?.nome_arquivo}"</strong> será removido permanentemente
              do processo e do storage. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
