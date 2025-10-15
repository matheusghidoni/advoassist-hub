import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Building2, Bell, Lock } from "lucide-react";

export default function Configuracoes() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
        </div>

        {/* Perfil */}
        <Card className="p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Perfil do Advogado</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input id="nome" defaultValue="Advogado Demo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oab">OAB</Label>
              <Input id="oab" defaultValue="123.456/SP" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="advogado@demo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" defaultValue="(11) 98765-4321" />
            </div>
          </div>
          <div className="mt-4">
            <Button>Salvar Alterações</Button>
          </div>
        </Card>

        {/* Escritório */}
        <Card className="p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Dados do Escritório</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="escritorio">Nome do Escritório</Label>
              <Input id="escritorio" defaultValue="Demo Advocacia" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" defaultValue="12.345.678/0001-90" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" defaultValue="Av. Paulista, 1000 - São Paulo/SP" />
            </div>
          </div>
          <div className="mt-4">
            <Button>Salvar Alterações</Button>
          </div>
        </Card>

        {/* Notificações */}
        <Card className="p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Notificações</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Email</p>
                <p className="text-sm text-muted-foreground">Receber alertas de prazos por email</p>
              </div>
              <Button variant="outline">Ativado</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">WhatsApp</p>
                <p className="text-sm text-muted-foreground">Receber alertas de prazos por WhatsApp</p>
              </div>
              <Button variant="outline">Configurar</Button>
            </div>
          </div>
        </Card>

        {/* Segurança */}
        <Card className="p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Segurança</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Button variant="outline">Alterar Senha</Button>
            </div>
            <div>
              <Button variant="outline">Ativar Autenticação de Dois Fatores</Button>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
