import type { SQLiteDatabase } from 'expo-sqlite';
import { supabase } from '@/lib/supabase';
import { gravarMeta, lerMeta, type Item } from '@/db/itens';
import { diasDeAviso } from '@/lib/armazenamento';

/** Formato da linha na tabela public.itens do Supabase (PostgreSQL). */
interface ItemRemoto {
  id: string;
  user_id: string;
  nome: string;
  categoria: string;
  quantidade: number;
  unidade: string;
  local: string;
  validade: string;
  status: string;
  observacao: string | null;
  codigo_barras: string | null;
  validade_origem: string;
  texto_ocr: string | null;
  criado_em: string;
  atualizado_em: string;
  excluido: boolean;
}

const TAMANHO_PAGINA = 500;
const iso = (s: string) => new Date(s).toISOString();

/**
 * Sincronização "local-first":
 *  1. PULL: baixa do Supabase o que mudou desde a última sincronização.
 *     Em conflito vence a alteração mais recente (atualizado_em) — last-write-wins.
 *  2. PUSH: envia os registros locais com sincronizado = 0 (upsert por id).
 */
export async function sincronizar(db: SQLiteDatabase, userId: string) {
  if (!supabase) throw new Error('Supabase não configurado');
  const recebidos = await baixar(db, userId);
  const enviados = await enviar(db, userId);
  await gravarMeta(db, 'ultima_sync', new Date().toISOString());
  return { recebidos, enviados };
}

async function baixar(db: SQLiteDatabase, userId: string) {
  const chaveMeta = `ultimo_pull:${userId}`;
  let desde = (await lerMeta(db, chaveMeta)) ?? '1970-01-01T00:00:00.000Z';
  let total = 0;

  for (;;) {
    const { data, error } = await supabase!
      .from('itens')
      .select('*')
      .eq('user_id', userId)
      .gte('atualizado_em', desde)
      .order('atualizado_em', { ascending: true })
      .limit(TAMANHO_PAGINA);
    if (error) throw error;
    const linhas = (data ?? []) as ItemRemoto[];

    await db.withTransactionAsync(async () => {
      for (const r of linhas) {
        const remotoEm = iso(r.atualizado_em);
        const local = await db.getFirstAsync<Pick<Item, 'atualizado_em'>>('SELECT atualizado_em FROM itens WHERE id = ?', [r.id]);
        if (local && Date.parse(local.atualizado_em) >= Date.parse(remotoEm)) continue; // local é igual ou mais novo
        await db.runAsync(
          `INSERT OR REPLACE INTO itens
             (id, nome, categoria, quantidade, unidade, local, validade, status, observacao,
              codigo_barras, validade_origem, texto_ocr, dias_aviso, criado_em, atualizado_em, excluido, sincronizado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [r.id, r.nome, r.categoria, Number(r.quantidade), r.unidade, r.local, r.validade, r.status, r.observacao,
           r.codigo_barras ?? null, r.validade_origem ?? 'manual', r.texto_ocr ?? null, diasDeAviso(r.nome, r.categoria),
           iso(r.criado_em), remotoEm, r.excluido ? 1 : 0],
        );
        total++;
      }
    });

    if (linhas.length === 0) break;
    const ultimo = iso(linhas[linhas.length - 1].atualizado_em);
    await gravarMeta(db, chaveMeta, ultimo);
    if (linhas.length < TAMANHO_PAGINA || ultimo === desde) break;
    desde = ultimo;
  }
  return total;
}

async function enviar(db: SQLiteDatabase, userId: string) {
  const pendentes = await db.getAllAsync<Item>('SELECT * FROM itens WHERE sincronizado = 0');
  let total = 0;

  for (let i = 0; i < pendentes.length; i += TAMANHO_PAGINA) {
    const lote = pendentes.slice(i, i + TAMANHO_PAGINA);
    const linhas: ItemRemoto[] = lote.map((p) => ({
      id: p.id,
      user_id: userId,
      nome: p.nome,
      categoria: p.categoria,
      quantidade: p.quantidade,
      unidade: p.unidade,
      local: p.local,
      validade: p.validade,
      status: p.status,
      observacao: p.observacao,
      codigo_barras: p.codigo_barras,
      validade_origem: p.validade_origem,
      texto_ocr: p.texto_ocr,
      criado_em: p.criado_em,
      atualizado_em: p.atualizado_em,
      excluido: p.excluido === 1,
    }));
    const { error } = await supabase!.from('itens').upsert(linhas, { onConflict: 'id' });
    if (error) throw error;

    // Só marca como sincronizado se o item não foi editado de novo durante o envio.
    await db.withTransactionAsync(async () => {
      for (const p of lote) {
        await db.runAsync('UPDATE itens SET sincronizado = 1 WHERE id = ? AND atualizado_em = ?', [p.id, p.atualizado_em]);
      }
    });
    total += lote.length;
  }
  return total;
}
