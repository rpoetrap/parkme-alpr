import * as Knex from 'knex';


export async function up(knex: Knex): Promise<void> {
	return knex.schema.createTable('roles', table => {
		table.increments('id');
		table.string('name').unique();
		table.string('description');
		table.boolean('free_vehicle').notNullable().defaultTo(false);
		table.boolean('free_charge').notNullable().defaultTo(false);
		table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
		table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
	});
}


export async function down(knex: Knex): Promise<void> {
	return knex.schema.dropTable('roles');
}

