/**
 * Migration: Adiciona 'PREMIO' como valor válido para o campo origem em GamTransacao
 * 
 * Contexto: O PremioService precisa inserir transações de débito com origem='PREMIO'
 * ao processar resgates de prêmios. O constraint original só permitia MANUAL e IMPORTACAO.
 * 
 * SQLite não suporta ALTER COLUMN, por isso recriamos a tabela com o constraint atualizado.
 * Origem: specs/09-VITRINE-DE-PREMIOS.md (Seção 7 - Fluxo de Resgate)
 */
exports.up = async function(knex) {
  const isPostgres = knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql';
  
  if (isPostgres) {
    // No PostgreSQL, podemos apenas alterar o constraint CHECK diretamente de forma não destrutiva
    await knex.raw(`
      ALTER TABLE "GamTransacao" DROP CONSTRAINT IF EXISTS "gamtransacao_origem_check";
    `);
    await knex.raw(`
      ALTER TABLE "GamTransacao" ADD CONSTRAINT "gamtransacao_origem_check" CHECK (origem IN ('MANUAL', 'IMPORTACAO', 'PREMIO'));
    `);
  } else {
    // SQLite não suporta ALTER TABLE para modificar CHECK constraints
    // Estratégia: recriar a tabela com o novo constraint via raw SQL
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS "GamTransacao_new" (
        "id" char(36) NOT NULL,
        "empresa_id" char(36),
        "usuario_id" char(36),
        "admin_id" char(36),
        "valor" float NOT NULL,
        "tipo" TEXT NOT NULL CHECK("tipo" IN ('CREDITO', 'DEBITO', 'ESTORNO')),
        "origem" TEXT NOT NULL DEFAULT 'MANUAL' CHECK("origem" IN ('MANUAL', 'IMPORTACAO', 'PREMIO')),
        "justificativa" TEXT NOT NULL,
        "created_at" datetime DEFAULT CURRENT_TIMESTAMP,
        "valor_original_rs" float,
        "status" TEXT DEFAULT 'COMPENSADO' CHECK("status" IN ('PENDENTE', 'COMPENSADO', 'CANCELADO', 'RESGATADO')),
        "data_vencimento" datetime,
        "empreendimento" varchar(255),
        "unidade" varchar(255),
        "contato_cliente" varchar(255),
        "origem_id" varchar(255),
        "data_compensacao" datetime,
        PRIMARY KEY ("id")
      )
    `);

    // Copia todos os dados da tabela original para a nova
    await knex.raw(`
      INSERT INTO "GamTransacao_new" SELECT * FROM "GamTransacao"
    `);

    // Remove a tabela original
    await knex.raw(`DROP TABLE "GamTransacao"`);

    // Renomeia a nova tabela
    await knex.raw(`ALTER TABLE "GamTransacao_new" RENAME TO "GamTransacao"`);
  }
};

exports.down = async function(knex) {
  const isPostgres = knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql';
  
  if (isPostgres) {
    await knex.raw(`
      ALTER TABLE "GamTransacao" DROP CONSTRAINT IF EXISTS "gamtransacao_origem_check";
    `);
    await knex.raw(`
      ALTER TABLE "GamTransacao" ADD CONSTRAINT "gamtransacao_origem_check" CHECK (origem IN ('MANUAL', 'IMPORTACAO'));
    `);
  } else {
    // Reverte: remove 'PREMIO' do constraint (volta a aceitar apenas MANUAL e IMPORTACAO)
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS "GamTransacao_new" (
        "id" char(36) NOT NULL,
        "empresa_id" char(36),
        "usuario_id" char(36),
        "admin_id" char(36),
        "valor" float NOT NULL,
        "tipo" TEXT NOT NULL CHECK("tipo" IN ('CREDITO', 'DEBITO', 'ESTORNO')),
        "origem" TEXT NOT NULL DEFAULT 'MANUAL' CHECK("origem" IN ('MANUAL', 'IMPORTACAO')),
        "justificativa" TEXT NOT NULL,
        "created_at" datetime DEFAULT CURRENT_TIMESTAMP,
        "valor_original_rs" float,
        "status" TEXT DEFAULT 'COMPENSADO' CHECK("status" IN ('PENDENTE', 'COMPENSADO', 'CANCELADO', 'RESGATADO')),
        "data_vencimento" datetime,
        "empreendimento" varchar(255),
        "unidade" varchar(255),
        "contato_cliente" varchar(255),
        "origem_id" varchar(255),
        "data_compensacao" datetime,
        PRIMARY KEY ("id")
      )
    `);

    await knex.raw(`INSERT INTO "GamTransacao_new" SELECT * FROM "GamTransacao" WHERE "origem" != 'PREMIO'`);
    await knex.raw(`DROP TABLE "GamTransacao"`);
    await knex.raw(`ALTER TABLE "GamTransacao_new" RENAME TO "GamTransacao"`);
  }
};
