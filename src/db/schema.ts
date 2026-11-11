import type { SQLiteDatabase } from 'expo-sqlite';
import { diasDeAviso } from '@/lib/armazenamento';

const VERSAO_ATUAL = 3;

/**
 * Cria/atualiza o banco local. Chamado pelo <SQLiteProvider onInit>.
 * Usa PRAGMA user_version para controlar as migrações.
 */
export async function migrarBanco(db: SQLiteDatabase) {
  const linha = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let versao = linha?.user_version ?? 0;
  if (versao >= VERSAO_ATUAL) return;

  if (versao === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS itens (
        id            TEXT PRIMARY KEY NOT NULL,
        nome          TEXT NOT NULL,
        categoria     TEXT NOT NULL,
        quantidade    REAL NOT NULL DEFAULT 1,
        unidade       TEXT NOT NULL DEFAULT 'un',
        local         TEXT NOT NULL,
        validade      TEXT NOT NULL,          -- AAAA-MM-DD
        status        TEXT NOT NULL DEFAULT 'ativo', -- ativo | consumido | descartado
        observacao    TEXT,
        criado_em     TEXT NOT NULL,          -- ISO 8601
        atualizado_em TEXT NOT NULL,          -- ISO 8601 (usado no sync)
        excluido      INTEGER NOT NULL DEFAULT 0,  -- exclusão lógica p/ sincronizar
        sincronizado  INTEGER NOT NULL DEFAULT 0   -- 0 = alteração ainda não enviada
      );

      CREATE INDEX IF NOT EXISTS idx_itens_validade ON itens (validade);
      CREATE INDEX IF NOT EXISTS idx_itens_pendentes ON itens (sincronizado);

      CREATE TABLE IF NOT EXISTS meta (
        chave TEXT PRIMARY KEY NOT NULL,
        valor TEXT
      );
    `);
    versao = 1;
  }

  // v2 (2º bimestre): resultados da visão computacional
  if (versao === 1) {
    await db.execAsync(`
      ALTER TABLE itens ADD COLUMN codigo_barras TEXT;                          -- lido pela câmera (EAN/UPC)
      ALTER TABLE itens ADD COLUMN validade_origem TEXT NOT NULL DEFAULT 'manual'; -- manual | ocr
      ALTER TABLE itens ADD COLUMN texto_ocr TEXT;                              -- texto que o OCR leu na embalagem
      CREATE INDEX IF NOT EXISTS idx_itens_codigo ON itens (codigo_barras);
    `);
    versao = 2;
  }

  // v3: prazo de aviso por tipo de alimento (dado derivado, só local) + preenchimento dos itens existentes
  if (versao === 2) {
    await db.execAsync(`ALTER TABLE itens ADD COLUMN dias_aviso INTEGER NOT NULL DEFAULT 3;`);
    const itens = await db.getAllAsync<{ id: string; nome: string; categoria: string }>('SELECT id, nome, categoria FROM itens');
    for (const i of itens) {
      await db.runAsync('UPDATE itens SET dias_aviso = ? WHERE id = ?', [diasDeAviso(i.nome, i.categoria), i.id]);
    }
    versao = 3;
  }

  // Próximas migrações: if (versao === 3) { ...; versao = 4; }

  await db.execAsync(`PRAGMA user_version = ${versao}`);
}
