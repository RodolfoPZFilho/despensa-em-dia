import { cores } from './theme';

/** Converte Date -> 'AAAA-MM-DD' usando o fuso local do aparelho. */
export function paraISODia(d: Date): string {
  const a = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${a}-${m}-${dia}`;
}

/** Converte 'AAAA-MM-DD' -> Date à meia-noite local. */
export function deISODia(s: string): Date {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function formatarData(s: string): string {
  const [a, m, d] = s.split('-');
  return `${d}/${m}/${a}`;
}

/** Dias entre hoje e a validade (negativo = vencido). */
export function diasParaVencer(validade: string, hoje = new Date()): number {
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const v = deISODia(validade);
  return Math.round((v.getTime() - h.getTime()) / 86_400_000);
}

export const DIAS_ALERTA = 3;

export type SituacaoValidade = 'vencido' | 'vence_logo' | 'ok';

/** `diasAviso` = antecedência do aviso para o tipo do alimento (ver lib/armazenamento). */
export function situacao(validade: string, diasAviso = DIAS_ALERTA): SituacaoValidade {
  const d = diasParaVencer(validade);
  if (d < 0) return 'vencido';
  if (d <= diasAviso) return 'vence_logo';
  return 'ok';
}

export function textoSituacao(validade: string): string {
  const d = diasParaVencer(validade);
  if (d < -1) return `Venceu há ${-d} dias`;
  if (d === -1) return 'Venceu ontem';
  if (d === 0) return 'Vence hoje';
  if (d === 1) return 'Vence amanhã';
  return `Vence em ${d} dias`;
}

/**
 * Cor contínua (gradiente) conforme o tempo que falta, medido em "prazos de aviso" do alimento:
 *   >= 4x o prazo: verde · no prazo de aviso: laranja · vencendo/vencido: vermelho.
 * Assim carne com 3 dias já fica amarelada (aviso de 1 dia), mas arroz com 3 dias é vermelho (aviso de 30).
 */
export function corGradiente(validade: string, diasAviso = DIAS_ALERTA): string {
  const restante = diasParaVencer(validade);
  if (restante < 0) return cores.vencido;
  const t = Math.min(1, restante / (Math.max(1, diasAviso) * 4));
  const paradas: [number, [number, number, number]][] = [
    [0, [0xc0, 0x39, 0x2b]],    // vermelho
    [0.25, [0xe6, 0x7e, 0x22]], // laranja (entrou no prazo de aviso)
    [0.6, [0xd4, 0xac, 0x0d]],  // amarelo
    [1, [0x2e, 0x7d, 0x4f]],    // verde
  ];
  let i = 0;
  while (i < paradas.length - 2 && t > paradas[i + 1][0]) i++;
  const [t0, c0] = paradas[i], [t1, c1] = paradas[i + 1];
  const k = (t - t0) / (t1 - t0);
  const mix = c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

export function corSituacao(validade: string, diasAviso = DIAS_ALERTA) {
  const s = situacao(validade, diasAviso);
  if (s === 'vencido') return { cor: cores.vencido, fundo: cores.vencidoFundo };
  if (s === 'vence_logo') return { cor: cores.atencao, fundo: cores.atencaoFundo };
  return { cor: cores.ok, fundo: cores.primariaClara };
}
