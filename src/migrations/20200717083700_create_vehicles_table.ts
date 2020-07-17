import * as Knex from 'knex';


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('vehicles', table => {
    table.increments('id');
    table.string('plate').unique();
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('vehicles');
}

