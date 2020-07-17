import * as Knex from 'knex';

export async function seed(knex: Knex): Promise<void> {
	await knex('users').del();

	const data = [
		{
			id: 1,
			name: 'Admin',
			is_admin: true
		},
		{
			id: 2,
			name: 'User Example',
			is_admin: false
		}
	];

	await knex('users').insert(data);
};
