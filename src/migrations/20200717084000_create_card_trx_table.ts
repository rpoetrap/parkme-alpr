import * as Knex from 'knex';


export async function up(knex: Knex): Promise<void> {
	return knex.schema.createTable('card_trx', table => {
		table.increments('id');
		table.integer('card_id').unsigned().references('smartcards.id');
		table.integer('vehicle_id').unsigned().references('vehicles.id');
		table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
		table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
	});
}


export async function down(knex: Knex): Promise<void> {
	return knex.schema.dropTable('card_trx');
}

