exports.up = function(knex) {
  return knex.schema.alterTable('GamUsuario', table => {
    table.string('identificador_extra').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('GamUsuario', table => {
    table.dropColumn('identificador_extra');
  });
};
