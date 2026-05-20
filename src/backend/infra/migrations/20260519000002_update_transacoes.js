/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('GamTransacao', table => {
    table.decimal('valor_original_rs', 14, 2);
    table.enum('status', ['PENDENTE', 'COMPENSADO', 'CANCELADO', 'RESGATADO']).defaultTo('COMPENSADO');
    table.timestamp('data_vencimento');
    table.string('empreendimento');
    table.string('unidade');
    table.string('contato_cliente');
    table.string('origem_id');
    table.timestamp('data_compensacao');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('GamTransacao', table => {
    table.dropColumn('valor_original_rs');
    table.dropColumn('status');
    table.dropColumn('data_vencimento');
    table.dropColumn('empreendimento');
    table.dropColumn('unidade');
    table.dropColumn('contato_cliente');
    table.dropColumn('origem_id');
    table.dropColumn('data_compensacao');
  });
};
