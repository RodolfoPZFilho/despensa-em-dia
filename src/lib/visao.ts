import type { SQLiteDatabase } from 'expo-sqlite';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import { CATEGORIAS } from '@/db/itens';

/* ------------------------------------------------------------------ */
/* OCR: foto da embalagem -> texto (Edge Function "ocr-validade")     */
/* ------------------------------------------------------------------ */

/**
 * Reduz a foto (o serviço de OCR aceita até 1 MB) e recorta a faixa central,
 * onde o usuário enquadrou a data. Menos fundo = menos texto que atrapalha.
 */
async function prepararImagem(uri: string, largura: number, altura: number) {
  const ctx = ImageManipulator.manipulate(uri);
  if (largura > 0 && altura > 0) {
    const w = Math.round(largura * 0.9), h = Math.round(altura * 0.5);
    ctx.crop({ originX: Math.round((largura - w) / 2), originY: Math.round((altura - h) / 2), width: w, height: h });
  }
  ctx.resize({ width: 1200 });
  const img = await ctx.renderAsync();
  const r = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return (r.base64 ?? '').replace(/^data:image\/\w+;base64,/, '');
}

/** Envia a foto para a Edge Function do Supabase, que chama o serviço de OCR e devolve o texto lido. */
export async function lerTextoDaFoto(foto: { uri: string; width: number; height: number }): Promise<string> {
  if (!supabase) throw new Error('A leitura da validade usa o Supabase. Configure o .env e entre na sua conta.');
  const base64 = await prepararImagem(foto.uri, foto.width, foto.height);
  const { data, error } = await supabase.functions.invoke<{ texto?: string; erro?: string }>('ocr-validade', {
    body: { imagem: base64 },
  });
  if (error) {
    // Tenta mostrar a mensagem que a função devolveu
    const detalhe = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(detalhe?.erro ?? error.message);
  }
  if (data?.erro) throw new Error(data.erro);
  return data?.texto ?? '';
}

/* ------------------------------------------------------------------ */
/* Código de barras -> produto                                         */
/* ------------------------------------------------------------------ */

export interface ProdutoEncontrado {
  codigo: string;
  nome: string;
  categoria: string;
  unidade?: string;
  local?: string;
  origem: 'despensa' | 'openfoodfacts';
}

/** Converte as categorias do Open Food Facts para as categorias do app. */
function mapearCategoria(tags: string[] = []): string {
  const t = tags.join(' ');
  const regras: [RegExp, (typeof CATEGORIAS)[number]][] = [
    [/frozen|congelad/, 'Congelados'],
    [/dair|milk|chees|yogurt|leite|queij|iogurte|butter|manteiga/, 'Laticínios'],
    [/meat|fish|seafood|poultr|chicken|sausage|carne|frango|peixe|embutid/, 'Carnes'],
    [/fruit|vegetabl|fresh|fruta|verdura|legume/, 'Hortifrúti'],
    [/bread|biscuit|cake|pastr|bakery|paes|pao|bolo/, 'Padaria'],
    [/cereal|legume|pasta|rice|bean|grain|flour|arroz|feijao|macarrao|farinha/, 'Grãos'],
    [/beverage|drink|juice|water|soda|coffee|tea|bebida|suco|refrigerante|cafe/, 'Bebidas'],
  ];
  return regras.find(([re]) => re.test(t))?.[1] ?? 'Outros';
}

/**
 * Procura o produto pelo código de barras:
 *  1. primeiro na própria despensa (SQLite) — funciona offline e "aprende" com cadastros anteriores,
 *     inclusive os que vieram de outro aparelho pela sincronização;
 *  2. depois na base aberta Open Food Facts.
 */
export async function buscarProdutoPorCodigo(db: SQLiteDatabase, codigo: string): Promise<ProdutoEncontrado | null> {
  const local = await db.getFirstAsync<{ nome: string; categoria: string; unidade: string; local: string }>(
    `SELECT nome, categoria, unidade, local FROM itens WHERE codigo_barras = ? AND excluido = 0 ORDER BY atualizado_em DESC LIMIT 1`,
    [codigo],
  );
  if (local) return { codigo, ...local, origem: 'despensa' };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const campos = 'product_name,product_name_pt,brands,categories_tags';
    const resp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codigo)}.json?fields=${campos}`, {
      signal: ctrl.signal,
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const p = json?.product;
    if (json?.status !== 1 || !p) return null;
    let nome: string = (p.product_name_pt || p.product_name || '').trim();
    if (!nome) return null;
    const marca = String(p.brands ?? '').split(',')[0].trim();
    if (marca && !nome.toLowerCase().includes(marca.toLowerCase())) nome = `${nome} ${marca}`;
    return { codigo, nome: nome.slice(0, 120), categoria: mapearCategoria(p.categories_tags), origem: 'openfoodfacts' };
  } catch {
    return null; // sem internet ou base fora do ar: o usuário digita o nome
  } finally {
    clearTimeout(timer);
  }
}
