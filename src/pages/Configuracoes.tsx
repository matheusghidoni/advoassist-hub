import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Building2, Bell, Lock, BellRing } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function Configuracoes() {
  const { user } = useAuth();
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [loading, setLoading] = useState(false);
  const [loadingOffice, setLoadingOffice] = useState(false);
  const [fullName, setFullName] = useState("");
  const [oab, setOab] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [emailPrazos, setEmailPrazos] = useState(true);
  const [emailHonorarios, setEmailHonorarios] = useState(true);
  const [emailProcessos, setEmailProcessos] = useState(true);
  const [notificationPrefsId, setNotificationPrefsId] = useState<string | null>(null);

  const handleEnablePushNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success("Notificações push ativadas!");
    } else {
      toast.error("Permissão para notificações negada");
    }
  };

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

      // Load notification preferences
      const { data: notifData, error: notifError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (notifError && notifError.code !== 'PGRST116') {
        console.error('Erro ao carregar preferências de notificação:', notifError);
      }

      if (notifData) {
        setNotificationPrefsId(notifData.id);
        setEmailPrazos(notifData.email_prazos);
        setEmailHonorarios(notifData.email_honorarios);
        setEmailProcessos(notifData.email_processos);
      } else {
        // Create default notification preferences if they don't exist
        const { data: newPrefs, error: createError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user?.id,
            email_prazos: true,
            email_honorarios: true,
            email_processos: true
          })
          .select()
          .single();

        if (createError) {
          console.error('Erro ao criar preferências de notificação:', createError);
        } else if (newPrefs) {
          setNotificationPrefsId(newPrefs.id);
        }
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

  const handleUpdateNotificationPreference = async (field: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ [field]: value })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Preferência de notificação atualizada!');
    } catch (error) {
      console.error('Erro ao atualizar preferência:', error);
      toast.error('Erro ao atualizar preferência de notificação');
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

        {/* Notificações Push */}
        <Card className="p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Notificações Push</h2>
          </div>
          <div className="space-y-4">
            {isSupported ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Receba notificações diretamente no seu navegador, mesmo quando o sistema estiver minimizado.
                </p>
                {permission === "granted" ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <Bell className="h-4 w-4" />
                    <span className="text-sm font-medium">Notificações push ativadas</span>
                  </div>
                ) : permission === "denied" ? (
                  <div className="text-sm text-destructive">
                    <p>Permissão negada. Para ativar, altere as configurações do navegador.</p>
                  </div>
                ) : (
                  <Button onClick={handleEnablePushNotifications} variant="outline">
                    <BellRing className="mr-2 h-4 w-4" />
                    Ativar Notificações Push
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Seu navegador não suporta notificações push.
              </p>
            )}
          </div>
        </Card>

        {/* Notificações por Email */}
        <Card className="p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Notificações por Email</h2>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-prazos" className="text-base font-medium">
                  Prazos
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receber notificações sobre prazos vencidos e próximos do vencimento
                </p>
              </div>
              <Switch
                id="email-prazos"
                checked={emailPrazos}
                onCheckedChange={(checked) => {
                  setEmailPrazos(checked);
                  handleUpdateNotificationPreference('email_prazos', checked);
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-honorarios" className="text-base font-medium">
                  Honorários
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receber notificações sobre honorários vencidos e pagamentos pendentes
                </p>
              </div>
              <Switch
                id="email-honorarios"
                checked={emailHonorarios}
                onCheckedChange={(checked) => {
                  setEmailHonorarios(checked);
                  handleUpdateNotificationPreference('email_honorarios', checked);
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-processos" className="text-base font-medium">
                  Processos
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receber notificações sobre atualizações em processos
                </p>
              </div>
              <Switch
                id="email-processos"
                checked={emailProcessos}
                onCheckedChange={(checked) => {
                  setEmailProcessos(checked);
                  handleUpdateNotificationPreference('email_processos', checked);
                }}
              />
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
