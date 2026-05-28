/**
 * Migration: Corrige o constraint de CHECK no PostgreSQL para a coluna 'origem' de 'GamTransacao'
 * 
 * Contexto: O PostgreSQL cria automaticamente constraints com a caixa exata da tabela ("GamTransacao").
 * A migration anterior tentou dropar "gamtransacao_origem_check" (tudo em minúsculo), fazendo com que
 * o constraint original "GamTransacao_origem_check" continuasse ativo e barrasse a inserção de 'PREMIO'.
 * Esta migration dropa de forma segura as duas variações e recria o constraint correto.
 */
exports.up = async function(knex) {
  const isPostgres = knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql';
  if (isPostgres) {
    await knex.raw('ALTER TABLE "GamTransacao" DROP CONSTRAINT IF EXISTS "GamTransacao_origem_check"');
    await knex.raw('ALTER TABLE "GamTransacao" DROP CONSTRAINT IF EXISTS "gamtransacao_origem_check"');
    await knex.raw('ALTER TABLE "GamTransacao" ADD CONSTRAINT "GamTransacao_origem_check" CHECK (origem IN (\'MANUAL\', \'IMPORTACAO\', \'PREMIO\'))');
  }
};

exports.down = async function(knex) {
  const isPostgres = knex.client.config.client === 'pg' || knex.client.config.client === 'postgresql';
  if (isPostgres) {
    await knex.raw('ALTER TABLE "GamTransacao" DROP CONSTRAINT IF EXISTS "GamTransacao_origem_check"');
    await knex.raw('ALTER TABLE "GamTransacao" DROP CONSTRAINT IF EXISTS "gamtransacao_origem_check"');
    await knex.raw('ALTER TABLE "GamTransacao" ADD CONSTRAINT "GamTransacao_origem_check" CHECK (origem IN (\'MANUAL\', \'IMPORTACAO\'))');
  }
};
