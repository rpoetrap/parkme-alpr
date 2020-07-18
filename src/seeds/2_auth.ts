import * as Knex from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
	await knex('auth').del();

	const data = [
		{
			id: 1,
			username: 'admin',
			password: 'password',
			user_id: 1,
		},
		{
			id: 2,
			username: 'user',
			password: 'password',
			user_id: 2,
		}
	];

	await bcrypt.genSalt(10).then(salt => {
		const hashedPassword = data.map(async (user) => ({
			...user,
			password: await bcrypt.hash(user.password, salt)
		}));
		return Promise.all(hashedPassword);
	}).then(async (data) => {
		await knex('auth').insert(data);
	});
}
