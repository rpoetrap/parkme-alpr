import express, { Request, Response } from 'express';

import authHandler from '../handlers/auth';
import userHandler from '../handlers/users';
import configHandler from '../handlers/config';
import gateHandler from '../handlers/gate';
import historyHandler from '../handlers/history';
import roleHandler from '../handlers/role';
import smartcardHandler from '../handlers/smartcard';

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

/**
 * Config
 */
r.get('/configs', authHandler.middlewareAuthCheck(), configHandler.getList());
r.get('/configs/:configId', authHandler.middlewareAuthCheck(), configHandler.getSingle());
r.patch('/configs/:configId', authHandler.middlewareAuthCheck(), configHandler.patchData());

/**
 * Gate
 */
r.get('/gates', authHandler.middlewareAuthCheck(), gateHandler.getList());
r.post('/gates', authHandler.middlewareAuthCheck(), gateHandler.generateCode(), gateHandler.postData());
r.patch('/gates/register', gateHandler.validateCode(), gateHandler.patchData({ mutableAttributes: ['code', 'session_id'], requiredAttributes: ['session_id'] }));
r.get('/gates/:gateId', authHandler.middlewareAuthCheck(), gateHandler.getSingle());
r.patch('/gates/:gateId', authHandler.middlewareAuthCheck(), gateHandler.patchData());
r.delete('/gates/:gateId', authHandler.middlewareAuthCheck(), gateHandler.deleteData());

/**
 * Card Access
 */
r.get('/roles', authHandler.middlewareAuthCheck(), roleHandler.getList());
r.post('/roles', authHandler.middlewareAuthCheck(), roleHandler.postData());
r.get('/roles/:roleId', authHandler.middlewareAuthCheck(), roleHandler.getSingle());
r.patch('/roles/:roleId', authHandler.middlewareAuthCheck(), roleHandler.patchData());
r.delete('/roles/:roleId', authHandler.middlewareAuthCheck(), roleHandler.deleteData());

/**
 * Smart Card
 */
r.get('/smartcards', authHandler.middlewareAuthCheck(), smartcardHandler.getList());
r.post('/smartcards', authHandler.middlewareAuthCheck(), smartcardHandler.postData());
r.get('/smartcards/:smartcardId', authHandler.middlewareAuthCheck(), smartcardHandler.getSingle());
r.patch('/smartcards/:smartcardId', authHandler.middlewareAuthCheck(), smartcardHandler.patchData());
r.delete('/smartcards/:smartcardId', authHandler.middlewareAuthCheck(), smartcardHandler.deleteData());

/**
 * History
 */
r.get('/histories', authHandler.middlewareAuthCheck(), historyHandler.getList());
r.get('/histories/:historyId', authHandler.middlewareAuthCheck(), historyHandler.getSingle());

r.get('/', (req: Request, res: Response) => {
	return res.json({
		apiVersion: res.locals.apiVersion,
		message: 'API is running'
	});
});

export default r;