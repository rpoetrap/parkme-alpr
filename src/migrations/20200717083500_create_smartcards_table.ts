import * as Knex from 'knex';


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('smartcards', table => {
    table.increments('id');
    table.string('serial').unique();
    table.integer('owner').unsigned().unique().nullable().references('users.id');
    table.integer('role_id').unsigned().references('roles.id');
    table.boolean('is_blocked').notNullable().defaultTo(false);
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    table.integer('created_by').unsigned().nullable().references('users.id');
    table.integer('updated_by').unsigned().nullable().references('users.id');
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('smartcards');
}

