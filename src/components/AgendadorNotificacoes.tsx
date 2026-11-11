import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import { reagendarNotificacoes } from '@/lib/notificacoes';
import { useSync } from '@/sync/SyncContext';

/**
 * Componente invisível: mantém a agenda de notificações em dia e abre o alimento
 * quando o usuário toca numa notificação. Só é montado no celular (não na web).
 */
export function AgendadorNotificacoes() {
  const db = useSQLiteContext();
  const { versaoDados } = useSync();

  // Refaz a agenda quando os dados mudam (espera 1,5 s para agrupar várias alterações)
  useEffect(() => {
    const t = setTimeout(() => { reagendarNotificacoes(db).catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, [db, versaoDados]);

  // Ao voltar para o app (pode ter virado o dia), refaz também
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') reagendarNotificacoes(db).catch(() => {});
    });
    return () => sub.remove();
  }, [db]);

  // Toque na notificação: abre o alimento (ou a lista "A vencer", se forem vários)
  const resposta = Notifications.useLastNotificationResponse();
  const tratada = useRef<string | null>(null);
  useEffect(() => {
    if (!resposta || tratada.current === resposta.notification.request.identifier) return;
    tratada.current = resposta.notification.request.identifier;
    const itemId = resposta.notification.request.content.data?.itemId;
    if (typeof itemId === 'string') router.push({ pathname: '/item/[id]', params: { id: itemId } });
    else router.navigate({ pathname: '/detalhes', params: { grupo: 'vencendo' } });
  }, [resposta]);

  return null;
}
