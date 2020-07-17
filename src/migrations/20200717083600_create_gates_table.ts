import * as Knex from 'knex';


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('gates', table => {
    table.increments('id');
    table.string('session_id').unique();
    table.string('name');
    table.string('description');
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('gates');
}

