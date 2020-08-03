import * as Knex from 'knex';


export async function up(knex: Knex): Promise<void> {
	return knex.schema.createTable('gates', table => {
		table.increments('id');
		table.string('session_id').unique().nullable();
		table.string('code').unique().nullable();
		table.string('name');
		table.enum('type', ['in', 'out']).notNullable();
		table.string('description');
		table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
		table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
	});
}


export async function down(knex: Knex): Promise<void> {
	return knex.schema.dropTable('gates');
}

