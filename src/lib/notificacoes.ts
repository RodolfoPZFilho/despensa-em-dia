import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import { gravarMeta, lerMeta } from '@/db/itens';
import { deISODia, diasParaVencer, paraISODia } from '@/lib/datas';

/**
 * Notificações LOCAIS de vencimento (agendadas no próprio aparelho, funcionam offline).
 *
 * Cada alimento tem um prazo de aviso conforme o tipo (lib/armazenamento: carne 1 dia, iogurte 2,
 * arroz 30...). O app agenda, no horário escolhido pelo usuário:
 *   - um aviso no dia em que o alimento entra no prazo ("vence em 2 dias");
 *   - outro no dia do vencimento ("vence hoje").
 * Alimentos do mesmo dia são agrupados numa única notificação.
 * A agenda inteira é refeita sempre que os dados mudam (cadastro, edição, sincronização).
 */

/** No navegador não há notificações agendadas. */
export const notificacoesDisponiveis = Platform.OS !== 'web';

const CANAL = 'validade';
const MAX_DIAS_AGENDADOS = 60; // o iOS aceita no máximo 64 notificações agendadas

export interface ConfigNotificacoes {
  ativas: boolean;
  hora: number;
  minuto: number;
}

export async function lerConfigNotificacoes(db: SQLiteDatabase): Promise<ConfigNotificacoes> {
  const [ativas, horario] = await Promise.all([lerMeta(db, 'notif_ativas'), lerMeta(db, 'notif_horario')]);
  const [h, m] = (horario ?? '09:00').split(':').map(Number);
  return { ativas: ativas === '1', hora: h ?? 9, minuto: m ?? 0 };
}

export async function salvarConfigNotificacoes(db: SQLiteDatabase, c: ConfigNotificacoes) {
  await gravarMeta(db, 'notif_ativas', c.ativas ? '1' : '0');
  await gravarMeta(db, 'notif_horario', `${String(c.hora).padStart(2, '0')}:${String(c.minuto).padStart(2, '0')}`);
}

let configurado = false;
async function configurar() {
  if (configurado || !notificacoesDisponiveis) return;
  configurado = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Validade dos alimentos',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

/** Pede permissão ao sistema. Retorna true se o usuário permitiu. */
export async function pedirPermissaoNotificacoes(): Promise<boolean> {
  if (!notificacoesDisponiveis) return false;
  await configurar();
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  if (!atual.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

function quando(dias: number) {
  if (dias <= 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  return `vence em ${dias} dias`;
}

/** Refaz toda a agenda de avisos. Retorna a data/hora do próximo aviso (ou null). */
export async function reagendarNotificacoes(db: SQLiteDatabase): Promise<Date | null> {
  if (!notificacoesDisponiveis) return null;
  await configurar();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const cfg = await lerConfigNotificacoes(db);
  if (!cfg.ativas || !(await Notifications.getPermissionsAsync()).granted) return null;

  const agora = new Date();
  const hoje = paraISODia(agora);
  const naHora = (iso: string) => {
    const d = deISODia(iso);
    d.setHours(cfg.hora, cfg.minuto, 0, 0);
    return d;
  };
  const somar = (iso: string, n: number) => {
    const d = deISODia(iso);
    d.setDate(d.getDate() + n);
    return paraISODia(d);
  };

  const itens = await db.getAllAsync<{ id: string; nome: string; validade: string; dias_aviso: number }>(
    `SELECT id, nome, validade, dias_aviso FROM itens WHERE excluido = 0 AND status = 'ativo' AND validade >= ? ORDER BY validade, nome`,
    [hoje],
  );

  // dia (AAAA-MM-DD) -> alimentos a lembrar naquele dia
  const porDia = new Map<string, { id: string; nome: string; validade: string }[]>();
  const adicionar = (dia: string, item: { id: string; nome: string; validade: string }) => {
    if (dia > item.validade || naHora(dia) <= agora) return; // já passou do horário ou do vencimento
    const lista = porDia.get(dia) ?? [];
    if (!lista.some((i) => i.id === item.id)) lista.push(item);
    porDia.set(dia, lista);
  };

  for (const item of itens) {
    let aviso = somar(item.validade, -item.dias_aviso);
    if (aviso < hoje) aviso = hoje;
    // entrou no prazo hoje, mas o horário de hoje já passou: avisa amanhã (se ainda não venceu)
    if (naHora(aviso) <= agora) aviso = somar(aviso, 1);
    adicionar(aviso, item);
    adicionar(item.validade, item); // lembrete no dia do vencimento
  }

  const dias = [...porDia.keys()].sort().slice(0, MAX_DIAS_AGENDADOS);
  for (const dia of dias) {
    const lista = porDia.get(dia)!;
    const linhas = lista.map((i) => `${i.nome}: ${quando(diasParaVencer(i.validade, deISODia(dia)))}`);
    const titulo = lista.length === 1 ? `🥫 ${lista[0].nome} ${quando(diasParaVencer(lista[0].validade, deISODia(dia)))}` : `🥫 ${lista.length} alimentos perto de vencer`;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: lista.length === 1 ? 'Toque para ver e usar antes que estrague.' : linhas.slice(0, 5).join('\n') + (lista.length > 5 ? `\n+${lista.length - 5} outros` : ''),
        data: lista.length === 1 ? { itemId: lista[0].id } : {},
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: naHora(dia), channelId: CANAL },
    });
  }
  return dias.length ? naHora(dias[0]) : null;
}

/** Notificação de teste em 5 segundos (para conferir permissões e para a apresentação). */
export async function enviarNotificacaoTeste() {
  await configurar();
  await Notifications.scheduleNotificationAsync({
    content: { title: '🥫 Despensa em Dia', body: 'As notificações estão funcionando. Você será avisado antes de cada alimento vencer.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CANAL },
  });
}
