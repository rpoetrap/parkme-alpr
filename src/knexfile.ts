import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const connection = {
	host: process.env.DATABASE_HOST,
	database: process.env.MYSQL_DATABASE,
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD
};

module.exports = {

	development: {
		client: process.env.DB_TYPE,
		connection
	},

	staging: {
		client: process.env.DB_TYPE,
		connection,
		pool: {
			min: 2,
			max: 10
		},
		migrations: {
			tableName: 'knex_migrations'
		}
	},

	production: {
		client: process.env.DB_TYPE,
		connection,
		pool: {
			min: 2,
			max: 10
		},
		migrations: {
			tableName: 'knex_migrations'
		}
	}

};
