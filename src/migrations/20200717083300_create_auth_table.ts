import * as Knex from 'knex';


export async function up(knex: Knex): Promise<void> {
	return knex.schema.createTable('auth', table => {
		table.increments('id');
		table.string('username').unique();
		table.string('password');
		table.integer('user_id').unsigned().unique().references('users.id');
		table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
		table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
	});
}


export async function down(knex: Knex): Promise<void> {
	return knex.schema.dropTable('auth');
}

