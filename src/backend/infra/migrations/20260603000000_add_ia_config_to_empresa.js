/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('GamEmpresa', table => {
    table.string('provedor_ia').nullable();
    table.text('chave_ia_encriptada').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('GamEmpresa', table => {
    table.dropColumn('provedor_ia');
    table.dropColumn('chave_ia_encriptada');
  });
};
