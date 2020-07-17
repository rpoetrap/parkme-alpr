import * as Knex from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('histories', table => {
    table.increments('id');
    table.json('smartcard');
    table.string('action');
    table.json('gate').nullable();
    table.json('vehicle');
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.json('created_by').nullable();
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('histories');
}

