exports.up = function(knex) {
  return knex.schema.alterTable('GamConfigImportacao', function(table) {
    table.decimal('fator_conversao', 10, 2).defaultTo(100.00).comment('Relação Moeda para Talento (Ex: 100 significa R$ 100 = 1 T$)');
    table.string('formato_data_balao').defaultTo('DD/MM/YYYY').comment('Formato esperado para datas (Ex: DD/MM/YYYY ou MM/DD/YYYY)');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('GamConfigImportacao', function(table) {
    table.dropColumn('fator_conversao');
    table.dropColumn('formato_data_balao');
  });
};
