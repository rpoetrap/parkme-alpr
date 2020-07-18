import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import expressSession from 'express-session';
import { Model } from 'objection';
import connectSessionKnex from 'connect-session-knex';
import passport from 'passport';
import dotenv from 'dotenv';
import Knex from 'knex';

dotenv.config({ path: '.env' });
import './configs/passport';

import apiRoutes from './routes/api';

// Session config
export const knex = Knex({
	client: process.env.DB_TYPE,
	connection: {
		host: process.env.DATABASE_HOST,
		database: process.env.MYSQL_DATABASE,
		user: process.env.MYSQL_USER,
		password: process.env.MYSQL_PASSWORD
	}
});
Model.knex(knex);
const knexSession = connectSessionKnex(expressSession);
const store = new knexSession({ knex });

const app = express();
const port = process.env.PORT;

try {
	app.use(cookieParser(process.env.COOKIE_SECRET));
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.json());
	app.use(expressSession({ secret: process.env.SESSION_SECRET, resave: true, saveUninitialized: true, store }));
	app.use(passport.initialize());
	app.use(passport.session());

	app.use('/api', (req: Request, res: Response, next: NextFunction) => {
		res.locals.apiVersion = '1.0';
		next();
	}, apiRoutes);

	app.use('*', (req: Request, res: Response): any => {
		return res.status(404).json({
			error: {
				code: 404,
				message: 'Could not find associated resource.'
			}
		});
	});

	app.listen(port, () => {
		console.log(`Server is listening on port ${port}`);
	});
} catch (e) {
	console.error(`Failed to start server. ${e.message}`);
}