import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreVertical, Calendar, User } from "lucide-react";

export default function Processos() {
  const processos = [
    {
      id: 1,
      numero: "1234567-12.2025.8.26.0100",
      tipo: "Civil",
      cliente: "João Silva",
      status: "active",
      fase: "Instrução",
      valor: "R$ 50.000,00",
      data: "15/01/2025"
    },
    {
      id: 2,
      numero: "7654321-45.2025.5.02.0456",
      tipo: "Trabalhista",
      cliente: "Maria Santos",
      status: "pending",
      fase: "Inicial",
      valor: "R$ 25.000,00",
      data: "10/02/2025"
    },
    {
      id: 3,
      numero: "9876543-78.2024.8.26.0002",
      tipo: "Família",
      cliente: "Pedro Costa",
      status: "completed",
      fase: "Sentença",
      valor: "R$ 10.000,00",
      data: "20/12/2024"
    },
  ];

  const getStatusVariant = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      active: { label: "Em andamento", className: "bg-status-active text-success-foreground" },
      pending: { label: "Suspenso", className: "bg-status-pending text-warning-foreground" },
      completed: { label: "Concluído", className: "bg-status-completed text-primary-foreground" },
      archived: { label: "Arquivado", className: "bg-status-archived text-muted-foreground" },
    };
    return variants[status] || variants.active;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Processos</h1>
            <p className="text-muted-foreground">Acompanhe todos os seus processos</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Processo
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="p-4 shadow-card">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, cliente, tipo..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">Filtros</Button>
          </div>
        </Card>

        {/* Process Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4 shadow-card">
            <div className="text-center">
              <p className="text-2xl font-bold text-status-active">15</p>
              <p className="text-sm text-muted-foreground">Em andamento</p>
            </div>
          </Card>
          <Card className="p-4 shadow-card">
            <div className="text-center">
              <p className="text-2xl font-bold text-status-pending">5</p>
              <p className="text-sm text-muted-foreground">Suspensos</p>
            </div>
          </Card>
          <Card className="p-4 shadow-card">
            <div className="text-center">
              <p className="text-2xl font-bold text-status-completed">8</p>
              <p className="text-sm text-muted-foreground">Concluídos</p>
            </div>
          </Card>
          <Card className="p-4 shadow-card">
            <div className="text-center">
              <p className="text-2xl font-bold text-status-archived">3</p>
              <p className="text-sm text-muted-foreground">Arquivados</p>
            </div>
          </Card>
        </div>

        {/* Process List */}
        <div className="grid gap-4">
          {processos.map((processo) => {
            const statusInfo = getStatusVariant(processo.status);
            return (
              <Card key={processo.id} className="p-6 shadow-card hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">{processo.numero}</h3>
                        <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                        <Badge variant="outline">{processo.tipo}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Fase: {processo.fase}</p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Details */}
                  <div className="grid gap-4 md:grid-cols-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Cliente: <span className="font-medium text-foreground">{processo.cliente}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Distribuído: <span className="font-medium text-foreground">{processo.data}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>Valor: <span className="font-medium text-foreground">{processo.valor}</span></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm">Ver detalhes</Button>
                    <Button variant="outline" size="sm">Documentos</Button>
                    <Button variant="outline" size="sm">Prazos</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
