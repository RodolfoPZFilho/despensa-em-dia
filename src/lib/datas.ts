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

export function situacao(validade: string): SituacaoValidade {
  const d = diasParaVencer(validade);
  if (d < 0) return 'vencido';
  if (d <= DIAS_ALERTA) return 'vence_logo';
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

export function corSituacao(validade: string) {
  const s = situacao(validade);
  if (s === 'vencido') return { cor: cores.vencido, fundo: cores.vencidoFundo };
  if (s === 'vence_logo') return { cor: cores.atencao, fundo: cores.atencaoFundo };
  return { cor: cores.ok, fundo: cores.primariaClara };
}
