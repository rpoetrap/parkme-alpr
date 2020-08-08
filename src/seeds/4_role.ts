import * as Knex from 'knex';

export async function seed(knex: Knex): Promise<void> {
	await knex('roles').del();

	const data = [
		{
			id: 1,
			name: 'Petugas Keamanan',
			description: '-',
			free_vehicle: true,
			free_charge: true
		},
		{
			id: 2,
			name: 'Pengguna',
			description: 'Staff, Dosen, dan Mahasiswa',
			free_vehicle: false,
			free_charge: true
		}
	];

	await knex('roles').insert(data);
}
