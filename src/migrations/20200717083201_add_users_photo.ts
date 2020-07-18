import * as Knex from 'knex';


export async function up(knex: Knex): Promise<void> {
	return knex.schema.alterTable('users', table => {
		table.integer('photo_id').unsigned().unique().nullable().references('files.id');
	});
}


export async function down(knex: Knex): Promise<void> {
	return knex.schema.alterTable('users', table => {
		table.dropForeign(['photo_id']).dropColumn('photo_id');
	});
}

