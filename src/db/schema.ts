import type { SQLiteDatabase } from 'expo-sqlite';

const VERSAO_ATUAL = 1;

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

  // Próximas migrações: if (versao === 1) { ...; versao = 2; }

  await db.execAsync(`PRAGMA user_version = ${versao}`);
}
