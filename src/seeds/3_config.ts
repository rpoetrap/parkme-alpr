import * as Knex from 'knex';

export async function seed(knex: Knex): Promise<void> {
	await knex('configs').del();

	const data = [
		{
			id: 1,
			label: 'Hanya Kartu Terdaftar',
			key: 'registeredOnly',
			value: 'true'
		},
		{
			id: 2,
			label: 'Logo',
			key: 'logo',
			value: null
		},
		{
			id: 3,
			label: 'Harga',
			key: 'cost',
			value: '1000'
		}
	];

	await knex('configs').insert(data);
}
