import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreVertical, FileText, Phone, Mail } from "lucide-react";

export default function Clientes() {
  const clientes = [
    { 
      id: 1, 
      nome: "João Silva", 
      cpf: "123.456.789-00", 
      email: "joao.silva@email.com",
      telefone: "(11) 98765-4321",
      processos: 3,
      status: "ativo"
    },
    { 
      id: 2, 
      nome: "Maria Santos", 
      cpf: "987.654.321-00", 
      email: "maria.santos@email.com",
      telefone: "(11) 91234-5678",
      processos: 2,
      status: "ativo"
    },
    { 
      id: 3, 
      nome: "Pedro Costa", 
      cpf: "456.789.123-00", 
      email: "pedro.costa@email.com",
      telefone: "(11) 99876-5432",
      processos: 1,
      status: "ativo"
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">Gerencie seus clientes e seus dados</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="p-4 shadow-card">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF, email..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">Filtros</Button>
          </div>
        </Card>

        {/* Clients List */}
        <div className="grid gap-4">
          {clientes.map((cliente) => (
            <Card key={cliente.id} className="p-6 shadow-card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  {/* Avatar */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
                    {cliente.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  
                  {/* Info */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">{cliente.nome}</h3>
                        <Badge variant="secondary">{cliente.status}</Badge>
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
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        {cliente.processos} processo(s)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
