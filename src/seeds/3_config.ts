import * as Knex from 'knex';

export async function seed(knex: Knex): Promise<void> {
	await knex('configs').del();

	const data = [
		{
			id: 1,
			label: 'Hanya ID terdaftar',
			key: 'registeredOnly',
			value: 'true'
		}
	];

	await knex('configs').insert(data);
}
