import * as Knex from 'knex';


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('files', table => {
    table.increments('id');
    table.string('filename');
    table.string('filetype');
    table.string('mime');
    table.string('filesize');
    table.string('path');
    table.string('url');
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.integer('created_by').unsigned().nullable().references('users.id');
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('files');
}

