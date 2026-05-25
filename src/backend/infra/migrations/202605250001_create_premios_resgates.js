/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('Premio', table => {
      table.increments('id').primary();
      table.string('titulo').notNullable();
      table.text('descricao');
      table.integer('quantidade_disponivel').notNullable().defaultTo(0);
      table.integer('custo_pontos').notNullable().defaultTo(0);
      table.boolean('ativo').notNullable().defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('VitrineItem', table => {
      table.increments('id').primary();
      table.integer('premio_id').unsigned().references('id').inTable('Premio').onDelete('CASCADE');
      table.integer('ordem').notNullable().defaultTo(0);
      table.boolean('ativo').notNullable().defaultTo(true);
    })
    .createTable('Resgate', table => {
      table.increments('id').primary();
      table.uuid('usuario_id').notNullable();
      table.integer('premio_id').unsigned().references('id').inTable('Premio').onDelete('SET NULL');
      table.integer('quantidade').notNullable().defaultTo(1);
      table.integer('custo_total').notNullable().defaultTo(0);
      table.enum('status', ['pendente', 'confirmado', 'cancelado', 'falha']).notNullable().defaultTo('pendente');
      table.text('motivo');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('Resgate')
    .dropTableIfExists('VitrineItem')
    .dropTableIfExists('Premio');
};
