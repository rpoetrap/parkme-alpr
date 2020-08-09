import * as Knex from 'knex';


export async function up(knex: Knex): Promise<void> {
	return knex.schema.createTable('users', table => {
		table.increments('id');
		table.string('name');
		table.string('phone').nullable();
		table.string('user_identifier').unique().nullable();
		table.boolean('is_admin').notNullable().defaultTo(false);
		table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
		table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
	});
}


export async function down(knex: Knex): Promise<void> {
	return knex.schema.dropTable('users');
}

