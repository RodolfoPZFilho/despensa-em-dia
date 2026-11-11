import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { diasDeAviso } from '@/lib/armazenamento';

export const CATEGORIAS = ['Laticínios', 'Carnes', 'Hortifrúti', 'Padaria', 'Grãos', 'Bebidas', 'Congelados', 'Outros'] as const;
export const LOCAIS = ['Geladeira', 'Freezer', 'Armário'] as const;
export const UNIDADES = ['un', 'kg', 'g', 'L', 'ml', 'pct'] as const;

export type StatusItem = 'ativo' | 'consumido' | 'descartado';
export type OrigemValidade = 'manual' | 'ocr';

export interface Item {
  id: string;
  nome: string;
  categoria: string;
  quantidade: number;
  unidade: string;
  local: string;
  validade: string;
  status: StatusItem;
  observacao: string | null;
  codigo_barras: string | null;    // visão computacional: código de barras lido pela câmera
  validade_origem: OrigemValidade; // visão computacional: 'ocr' quando a data veio da foto
  texto_ocr: string | null;        // visão computacional: texto bruto lido na embalagem
  dias_aviso: number;              // avisar N dias antes de vencer (depende do tipo de alimento; só local)
  criado_em: string;
  atualizado_em: string;
  excluido: number;
  sincronizado: number;
}

export type ItemEntrada = Pick<Item, 'nome' | 'categoria' | 'quantidade' | 'unidade' | 'local' | 'validade' | 'observacao' | 'codigo_barras' | 'validade_origem' | 'texto_ocr'>;

export type FiltroLista = 'todos' | 'vencendo' | 'vencidos';

const agora = () => new Date().toISOString();

/** Trecho SQL: item ativo que entrou no prazo de aviso do seu tipo (ex.: carne 1 dia, arroz 30). */
const SQL_PERTO = `validade >= ? AND validade <= date(?, '+' || dias_aviso || ' days')`;

export async function listarAtivos(db: SQLiteDatabase, filtro: FiltroLista, hoje: string, busca = '') {
  let where = `excluido = 0 AND status = 'ativo'`;
  const params: (string | number)[] = [];
  if (filtro === 'vencidos') {
    where += ' AND validade < ?';
    params.push(hoje);
  } else if (filtro === 'vencendo') {
    where += ` AND ${SQL_PERTO}`;
    params.push(hoje, hoje);
  }
  if (busca.trim()) {
    where += ' AND nome LIKE ?';
    params.push(`%${busca.trim()}%`);
  }
  return db.getAllAsync<Item>(`SELECT * FROM itens WHERE ${where} ORDER BY validade ASC, nome ASC`, params);
}

export function buscarItem(db: SQLiteDatabase, id: string) {
  return db.getFirstAsync<Item>('SELECT * FROM itens WHERE id = ? AND excluido = 0', [id]);
}

export async function criarItem(db: SQLiteDatabase, e: ItemEntrada) {
  const id = Crypto.randomUUID();
  const t = agora();
  await db.runAsync(
    `INSERT INTO itens (id, nome, categoria, quantidade, unidade, local, validade, status, observacao,
                        codigo_barras, validade_origem, texto_ocr, dias_aviso, criado_em, atualizado_em, excluido, sincronizado)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ativo', ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [id, e.nome.trim(), e.categoria, e.quantidade, e.unidade, e.local, e.validade, e.observacao || null,
     e.codigo_barras || null, e.validade_origem, e.texto_ocr || null, diasDeAviso(e.nome, e.categoria), t, t],
  );
  return id;
}

export async function atualizarItem(db: SQLiteDatabase, id: string, e: ItemEntrada) {
  await db.runAsync(
    `UPDATE itens SET nome = ?, categoria = ?, quantidade = ?, unidade = ?, local = ?, validade = ?, observacao = ?,
       codigo_barras = ?, validade_origem = ?, texto_ocr = ?, dias_aviso = ?, atualizado_em = ?, sincronizado = 0 WHERE id = ?`,
    [e.nome.trim(), e.categoria, e.quantidade, e.unidade, e.local, e.validade, e.observacao || null,
     e.codigo_barras || null, e.validade_origem, e.texto_ocr || null, diasDeAviso(e.nome, e.categoria), agora(), id],
  );
}

export async function mudarStatus(db: SQLiteDatabase, id: string, status: StatusItem) {
  await db.runAsync('UPDATE itens SET status = ?, atualizado_em = ?, sincronizado = 0 WHERE id = ?', [status, agora(), id]);
}

/** Exclusão lógica: o registro fica marcado para que a exclusão também chegue ao Supabase. */
export async function excluirItem(db: SQLiteDatabase, id: string) {
  await db.runAsync('UPDATE itens SET excluido = 1, atualizado_em = ?, sincronizado = 0 WHERE id = ?', [agora(), id]);
}

export interface Resumo {
  ativos: number;
  vencidos: number;
  vencendo: number;
  consumidos: number;
  descartados: number;
  comCodigo: number;    // itens cadastrados lendo o código de barras
  validadeOcr: number;  // itens cuja validade foi lida pela câmera (OCR)
  porLocal: { local: string; total: number }[];
}

export async function obterResumo(db: SQLiteDatabase, hoje: string): Promise<Resumo> {
  const r = await db.getFirstAsync<Omit<Resumo, 'porLocal'>>(
    `SELECT
       SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) AS ativos,
       SUM(CASE WHEN status = 'ativo' AND validade < ? THEN 1 ELSE 0 END) AS vencidos,
       SUM(CASE WHEN status = 'ativo' AND ${SQL_PERTO} THEN 1 ELSE 0 END) AS vencendo,
       SUM(CASE WHEN status = 'consumido' THEN 1 ELSE 0 END) AS consumidos,
       SUM(CASE WHEN status = 'descartado' THEN 1 ELSE 0 END) AS descartados,
       SUM(CASE WHEN codigo_barras IS NOT NULL THEN 1 ELSE 0 END) AS comCodigo,
       SUM(CASE WHEN validade_origem = 'ocr' THEN 1 ELSE 0 END) AS validadeOcr
     FROM itens WHERE excluido = 0`,
    [hoje, hoje, hoje],
  );
  const porLocal = await db.getAllAsync<{ local: string; total: number }>(
    `SELECT local, COUNT(*) AS total FROM itens WHERE excluido = 0 AND status = 'ativo' GROUP BY local ORDER BY total DESC`,
  );
  return {
    ativos: r?.ativos ?? 0,
    vencidos: r?.vencidos ?? 0,
    vencendo: r?.vencendo ?? 0,
    consumidos: r?.consumidos ?? 0,
    descartados: r?.descartados ?? 0,
    comCodigo: r?.comCodigo ?? 0,
    validadeOcr: r?.validadeOcr ?? 0,
    porLocal,
  };
}

export async function contarPendentes(db: SQLiteDatabase) {
  const r = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM itens WHERE sincronizado = 0');
  return r?.n ?? 0;
}

export async function lerMeta(db: SQLiteDatabase, chave: string) {
  const r = await db.getFirstAsync<{ valor: string | null }>('SELECT valor FROM meta WHERE chave = ?', [chave]);
  return r?.valor ?? null;
}

export async function gravarMeta(db: SQLiteDatabase, chave: string, valor: string | null) {
  await db.runAsync('INSERT INTO meta (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor', [chave, valor]);
}

export type GrupoDetalhe = 'vencendo' | 'vencidos' | 'consumidos' | 'descartados';

/** Lista usada na aba Detalhes: a vencer/vencidos (ativos) e o histórico de consumidos/descartados. */
export function listarGrupo(db: SQLiteDatabase, grupo: GrupoDetalhe, hoje: string) {
  switch (grupo) {
    case 'vencendo':
      return db.getAllAsync<Item>(
        `SELECT * FROM itens WHERE excluido = 0 AND status = 'ativo' AND ${SQL_PERTO} ORDER BY validade, nome`,
        [hoje, hoje],
      );
    case 'vencidos':
      return db.getAllAsync<Item>(
        `SELECT * FROM itens WHERE excluido = 0 AND status = 'ativo' AND validade < ? ORDER BY validade, nome`,
        [hoje],
      );
    case 'consumidos':
    case 'descartados':
      return db.getAllAsync<Item>(
        `SELECT * FROM itens WHERE excluido = 0 AND status = ? ORDER BY atualizado_em DESC`,
        [grupo === 'consumidos' ? 'consumido' : 'descartado'],
      );
  }
}
