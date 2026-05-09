import { useMemo, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Search, MoreVertical, FileText, Phone, Mail,
  Pencil, Trash2, Users, UserCheck, UserX, TrendingUp,
  FolderOpen, ChevronLeft, ChevronRight, MessageSquare,
} from "lucide-react";

// Ícone WhatsApp (SVG inline)
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { ClienteForm } from "@/components/Clientes/ClienteForm";
import { ClienteDocumentos } from "@/components/Clientes/ClienteDocumentos";
import { ComunicacaoLog } from "@/components/Comunicacoes/ComunicacaoLog";
import { startOfMonth, endOfMonth } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useClientes, useDeleteCliente, type Cliente } from "@/hooks/queries/useClientesQuery";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { queryKeys } from "@/hooks/queries/queryKeys";
import { useWhatsAppInstance } from "@/hooks/queries/useWhatsAppQuery";
import { WhatsAppSendDialog } from "@/components/WhatsApp/WhatsAppSendDialog";

const PAGE_SIZE = 20;

/** Remove tudo que não é dígito e adiciona o DDI 55 (Brasil) se necessário */
function formatWhatsAppNumber(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  // Se já começa com 55 e tem 12-13 dígitos, está ok
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  // Senão adiciona o DDI
  return `55${digits}`;
}

function openWhatsApp(cliente: { nome: string; telefone: string }, escritorioNome?: string) {
  const number  = formatWhatsAppNumber(cliente.telefone);
  const escritorio = escritorioNome ? `do escritório ${escritorioNome}` : "do escritório";
  const message = `Olá, ${cliente.nome.split(" ")[0]}! Tudo bem?\n\nEntramos em contato ${escritorio} referente ao seu processo. Podemos conversar?`;
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function Clientes() {
  const { user }       = useAuth();
  const { escritorioId, escritorio } = useWorkspace();
  const queryClient    = useQueryClient();
  const { data: clientes = [], isLoading } = useClientes();
  const deleteCliente  = useDeleteCliente();

  const [page, setPage]           = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen]   = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete]   = useState<Cliente | null>(null);
  const [documentosOpen, setDocumentosOpen]     = useState(false);
  const [selectedClienteForDocs, setSelectedClienteForDocs] =
    useState<{ id: string; nome: string } | null>(null);
  const [comunicacoesOpen, setComunicacoesOpen] = useState(false);
  const [selectedClienteForCom, setSelectedClienteForCom] =
    useState<{ id: string; nome: string } | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedClienteForSend, setSelectedClienteForSend] =
    useState<{ id: string; nome: string; telefone: string } | null>(null);

  const { data: waInstance } = useWhatsAppInstance();

  // Client-side filtering on cached data — no extra network requests
  const filtered = useMemo(
    () =>
      clientes.filter(
        (c) =>
          c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.cpf.includes(searchTerm) ||
          c.email.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [clientes, searchTerm],
  );

  // Reset to first page whenever search changes
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const paginated   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);

  // Stats derived from the full cached dataset (no extra queries)
  const hoje = new Date();
  const clientesAtivos     = useMemo(() => clientes.filter((c) => c.status === "ativo").length,    [clientes]);
  const clientesEncerrados = useMemo(() => clientes.filter((c) => c.status === "encerrado").length, [clientes]);
  const novosClientesMes   = useMemo(() => {
    const inicioMes = startOfMonth(hoje);
    const fimMes    = endOfMonth(hoje);
    return clientes.filter((c) => {
      const d = new Date(c.created_at);
      return d >= inicioMes && d <= fimMes;
    }).length;
  }, [clientes]);

  const handleDelete = async () => {
    if (!clienteToDelete) return;
    await deleteCliente.mutateAsync(clienteToDelete.id);
    setDeleteDialogOpen(false);
    setClienteToDelete(null);
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.clientes(escritorioId ?? '') });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">Gerencie seus clientes e seus dados</p>
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              setEditingCliente(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard title="Total de Clientes"    value={clientes.length}    icon={Users}      variant="default" />
          <StatsCard title="Clientes Ativos"      value={clientesAtivos}     icon={UserCheck}  variant="success" />
          <StatsCard title="Clientes Encerrados"  value={clientesEncerrados} icon={UserX}      variant="default" />
          <StatsCard title="Novos Este Mês"       value={novosClientesMes}   icon={TrendingUp} variant="default" />
        </div>

        {/* Search */}
        <Card className="p-4 shadow-card">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF, email..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Clients List */}
        <div className="grid gap-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          ) : paginated.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">
                {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </p>
            </Card>
          ) : (
            paginated.map((cliente) => (
              <Card
                key={cliente.id}
                className="p-6 shadow-card hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
                      {cliente.nome
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">{cliente.nome}</h3>
                          <Badge variant={cliente.status === "ativo" ? "default" : "secondary"}>
                            {cliente.status === "ativo" ? "Ativo" : "Encerrado"}
                          </Badge>
                          {cliente.tipo && (
                            <Badge variant="outline">
                              {cliente.tipo === "requerente" && "Requerente"}
                              {cliente.tipo === "requerido" && "Requerido"}
                              {cliente.tipo === "exequente" && "Exequente"}
                              {cliente.tipo === "executado" && "Executado"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">CPF: {cliente.cpf}</p>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-4 w-4" />
                          {cliente.email}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-4 w-4" />
                          {cliente.telefone}
                        </div>
                        <button
                          onClick={() => {
                            if (waInstance?.status === "connected") {
                              setSelectedClienteForSend({
                                id: cliente.id,
                                nome: cliente.nome,
                                telefone: cliente.telefone,
                              });
                              setSendDialogOpen(true);
                            } else {
                              openWhatsApp(cliente, escritorio?.nome);
                            }
                          }}
                          className="flex items-center gap-1.5 text-[#25D366] hover:text-[#128C7E] transition-colors font-medium"
                          title={
                            waInstance?.status === "connected"
                              ? "Enviar mensagem diretamente pela plataforma"
                              : "Abrir WhatsApp Web"
                          }
                        >
                          <WhatsAppIcon className="h-4 w-4" />
                          WhatsApp
                        </button>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedClienteForCom({ id: cliente.id, nome: cliente.nome });
                          setComunicacoesOpen(true);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Comunicações
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedClienteForDocs({ id: cliente.id, nome: cliente.nome });
                          setDocumentosOpen(true);
                        }}
                      >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Documentos
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingCliente(cliente);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setClienteToDelete(cliente);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filtered.length} cliente{filtered.length !== 1 ? "s" : ""} encontrado
              {filtered.length !== 1 ? "s" : ""} — página {page + 1} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ClienteForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={invalidate}
        cliente={editingCliente}
      />

      <ClienteDocumentos
        open={documentosOpen}
        onOpenChange={setDocumentosOpen}
        cliente={selectedClienteForDocs}
      />

      <ComunicacaoLog
        open={comunicacoesOpen}
        onOpenChange={setComunicacoesOpen}
        cliente={selectedClienteForCom}
      />

      <WhatsAppSendDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        cliente={selectedClienteForSend}
        escritorioNome={escritorio?.nome}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente {clienteToDelete?.nome}? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteCliente.isPending}
            >
              {deleteCliente.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
