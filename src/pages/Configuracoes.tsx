import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Building2, Bell, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Configuracoes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingOffice, setLoadingOffice] = useState(false);
  const [fullName, setFullName] = useState("");
  const [oab, setOab] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || '');
        setOab(data.oab || '');
        setPhone(data.phone || '');
        setSpecialization(data.specialization || '');
        setOfficeName(data.office_name || '');
        setCnpj(data.cnpj || '');
        setOfficeAddress(data.office_address || '');
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast.error('Erro ao carregar dados do perfil');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          oab: oab,
          phone: phone,
          specialization: specialization,
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
      
      // Recarregar a página para atualizar o avatar
      window.location.reload();
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingOffice(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          office_name: officeName,
          cnpj: cnpj,
          office_address: officeAddress,
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('Dados do escritório atualizados com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar escritório:', error);
      toast.error('Erro ao atualizar dados do escritório');
    } finally {
      setLoadingOffice(false);
    }
  };

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
          <form onSubmit={handleUpdateProfile}>
            <div className="mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Perfil do Advogado</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input 
                  id="nome" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oab">OAB</Label>
                <Input 
                  id="oab" 
                  value={oab}
                  onChange={(e) => setOab(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={user?.email || ''} 
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input 
                  id="telefone" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="especialidade">Especialização</Label>
                <Input 
                  id="especialidade" 
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="Ex: Direito Civil, Trabalhista, etc."
                />
              </div>
            </div>
            <div className="mt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Escritório */}
        <Card className="p-6 shadow-card">
          <form onSubmit={handleUpdateOffice}>
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Dados do Escritório</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="escritorio">Nome do Escritório</Label>
                <Input 
                  id="escritorio" 
                  value={officeName}
                  onChange={(e) => setOfficeName(e.target.value)}
                  placeholder="Nome do escritório"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input 
                  id="cnpj" 
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input 
                  id="endereco" 
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  placeholder="Endereço completo do escritório"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button type="submit" disabled={loadingOffice}>
                {loadingOffice ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
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
