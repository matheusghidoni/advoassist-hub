import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Scale, Loader2 } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = () => {
    if (password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres');
      return false;
    }

    if (!/[A-Z]/.test(password)) {
      toast.error('A senha deve conter pelo menos uma letra maiúscula');
      return false;
    }

    if (!/[0-9]/.test(password)) {
      toast.error('A senha deve conter pelo menos um número');
      return false;
    }

    if (!/[!@#$%^&*]/.test(password)) {
      toast.error('A senha deve conter pelo menos um caractere especial (!@#$%^&*)');
      return false;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return false;
    }

    return true;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Senha alterada com sucesso!');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (error) {
      toast.error('Erro ao alterar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-4 rounded-2xl">
              <Scale className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">LegalFlow</h1>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-center mb-2">Nova Senha</h2>
          <p className="text-center text-muted-foreground mb-6">
            Digite sua nova senha
          </p>
          
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres, 1 maiúscula, 1 número e 1 símbolo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                'Alterar Senha'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
