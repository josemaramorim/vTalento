exports.up = function(knex) {
  return knex.schema.alterTable('GamConfigImportacao', function(table) {
    table.string('parcela_valor').nullable();
    table.string('parcela_qtd').nullable();
    table.string('parcela_data_inicio').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('GamConfigImportacao', function(table) {
    table.dropColumn('parcela_valor');
    table.dropColumn('parcela_qtd');
    table.dropColumn('parcela_data_inicio');
  });
};
