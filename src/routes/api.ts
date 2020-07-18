import express, { Request, Response } from 'express';
import authHandler from '../handlers/auth';

const r = express.Router();
r.get('/auth/check', authHandler.middlewareAuthCheck());
r.post('/auth/register', authHandler.postRegister());
r.post('/auth/login', authHandler.postLogin());
r.post('/auth/logout', authHandler.postLogout());

r.get('/', (req: Request, res: Response) => {
	return res.json({
		apiVersion: res.locals.apiVersion,
		message: 'API is running'
	});
});

export default r;