/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // 1. Criar tabela GamSaaSConfig
    .createTable('GamSaaSConfig', table => {
      table.increments('id').primary();
      table.string('chave').unique().notNullable();
      table.text('valor');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    // 2. Criar tabela GamFatura
    .createTable('GamFatura', table => {
      table.uuid('id').primary();
      table.uuid('empresa_id').references('id').inTable('GamEmpresa').onDelete('CASCADE').notNullable();
      table.decimal('valor', 14, 2).notNullable();
      table.string('status').defaultTo('PENDENTE'); // 'PENDENTE', 'PAGA', 'VENCIDA', 'CANCELADA'
      table.string('metodo_pagamento'); // 'CARTAO', 'PIX', 'BOLETO'
      table.string('provedor'); // 'STRIPE', 'ASAAS'
      table.string('provedor_fatura_id');
      table.timestamp('data_vencimento').notNullable();
      table.timestamp('data_pagamento');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    // 3. Atualizar tabela GamEmpresa com colunas extras
    .alterTable('GamEmpresa', table => {
      table.timestamp('data_expiracao');
      table.boolean('liberacao_emergencia').defaultTo(false);
      table.timestamp('emergencia_expiracao');
      table.string('provedor_pagamento'); // 'STRIPE' ou 'ASAAS'
      table.text('config_pagamento_json'); // configurações específicas do tenant
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('GamEmpresa', table => {
      table.dropColumn('data_expiracao');
      table.dropColumn('liberacao_emergencia');
      table.dropColumn('emergencia_expiracao');
      table.dropColumn('provedor_pagamento');
      table.dropColumn('config_pagamento_json');
    })
    .dropTable('GamFatura')
    .dropTable('GamSaaSConfig');
};

