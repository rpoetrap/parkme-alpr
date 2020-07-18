import express, { Request, Response } from 'express';

import authHandler from '../handlers/auth';
import userHandler from '../handlers/users';

const r = express.Router();

/**
 * Auth
 */
r.get('/auth/check', authHandler.middlewareAuthCheck(), (req: Request, res: Response) => {
	return res.json({
		apiVersion: res.locals.apiVersion,
		message: 'You are authenticated'
	});
});
r.get('/auth/nonauth', authHandler.middlewareNonAuthCheck(), (req: Request, res: Response) => {
	return res.json({
		apiVersion: res.locals.apiVersion,
		message: 'You are not authenticated'
	});
});
r.post('/auth/register', authHandler.postRegister());
r.post('/auth/login', authHandler.postLogin());
r.post('/auth/logout', authHandler.postLogout());

/**
 * Users
 */
r.get('/users', authHandler.middlewareAuthCheck(), userHandler.getList());
r.post('/users', authHandler.middlewareAuthCheck(), userHandler.postData());
r.get('/users/:userId', authHandler.middlewareAuthCheck(), userHandler.getSingle());
r.patch('/users/:userId', authHandler.middlewareAuthCheck(), userHandler.patchData());
r.delete('/users/:userId', authHandler.middlewareAuthCheck(), userHandler.deleteData());

r.get('/', (req: Request, res: Response) => {
	return res.json({
		apiVersion: res.locals.apiVersion,
		message: 'API is running'
	});
});

export default r;