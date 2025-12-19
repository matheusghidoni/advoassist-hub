import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LAST_CHECK_KEY = 'lastDeadlineCheck';

export const useDeadlineCheck = () => {
  const hasChecked = useRef(false);

  useEffect(() => {
    const checkDeadlines = async () => {
      // Prevent multiple checks in the same session
      if (hasChecked.current) return;

      // Check if we already checked today
      const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
      const today = new Date().toISOString().split('T')[0];
      
      if (lastCheck === today) {
        console.log('Deadline check already done today');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      hasChecked.current = true;

      try {
        console.log('Checking deadlines automatically...');
        
        const { data, error } = await supabase.functions.invoke('check-deadline-notifications');
        
        if (error) {
          console.error('Error checking deadlines:', error);
          return;
        }

        console.log('Deadline check result:', data);
        
        // Save that we checked today
        localStorage.setItem(LAST_CHECK_KEY, today);

        // If notifications were created, show a toast
        if (data?.notifications_created?.length > 0) {
          toast.info('🔔 Você tem prazos próximos!', {
            description: `${data.notifications_created.length} notificação(ões) de prazo criada(s).`,
            duration: 5000,
          });
        }

        // Also fetch unread notifications count to show if there are pending ones
        const { data: unreadNotifications, error: notifError } = await supabase
          .from('notificacoes')
          .select('id')
          .eq('user_id', user.id)
          .eq('lida', false);

        if (!notifError && unreadNotifications && unreadNotifications.length > 0) {
          // If there are unread notifications (not just from today), notify user
          const urgentNotifications = await supabase
            .from('notificacoes')
            .select('id, titulo, tipo')
            .eq('user_id', user.id)
            .eq('lida', false)
            .eq('tipo', 'urgente')
            .limit(1);

          if (urgentNotifications.data && urgentNotifications.data.length > 0) {
            toast.warning('⚠️ Atenção! Prazo urgente!', {
              description: urgentNotifications.data[0].titulo,
              duration: 8000,
            });
          }
        }
      } catch (err) {
        console.error('Error in deadline check:', err);
      }
    };

    checkDeadlines();
  }, []);
};
