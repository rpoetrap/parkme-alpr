import { Request, Response, NextFunction } from 'express';
import { OutgoingMessage } from 'http';
import { isEmpty, isNil } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import passport from 'passport';

import User from '../models/User';
import Config from '../models/Config';
import { ErrorInterface, errorAppender } from '../helpers/string';
import Auth from '../models/Auth';

class GenericHandler {
	postRegister() {
		return async (req: Request, res: Response): Promise<OutgoingMessage> => {
			const apiVersion = res.locals.apiVersion;
			try {
				let { username, password, user_identifier, name } = req.body;

				username = username || '';
				password = password || '';
				user_identifier = user_identifier || '';
				name = name || '';

				const errors: ErrorInterface[] = [];
				let registeredUserOnly = false;

				errorAppender(errors, isEmpty(username), { location: 'username' });
				errorAppender(errors, isEmpty(password), { location: 'password' });
				errorAppender(errors, isEmpty(user_identifier), { location: 'user_identifier' });
				errorAppender(errors, isEmpty(name), { location: 'name' });
				if (errors.length) {
					return res.status(400).json({
						apiVersion,
						error: {
							code: 400,
							message: 'Error during input validation',
							errors
						}
					});
				}

				const foundConfig = await Config.query().findOne({ key: 'registeredOnly' }).select('value');
				if (foundConfig) {
					const { value } = foundConfig;
					if (value == 'true') registeredUserOnly = true;
				}

				const foundUser = await User.query().findOne({ user_identifier }).select('id');
				errorAppender(errors, registeredUserOnly && !foundUser, {
					message: 'This user identifier is not registered',
					location: 'user_identifier',
					locationType: 'body'
				});

				const existingUser = foundUser ? await Auth.query().findOne({ user_id: foundUser.id }).select('id') : false;
				errorAppender(errors, !isEmpty(existingUser), {
					message: 'This user identifier already registered, please login instead',
					location: 'user_identifier',
					locationType: 'body'
				});

				if (errors.length) {
					return res.status(400).json({
						apiVersion,
						error: {
							code: 400,
							message: 'Error during input validation',
							errors
						}
					});
				}

				let userId: number;
				if (foundUser) userId = foundUser.id;
				else {
					const createUser = await User.query().insert({
						name,
						user_identifier
					});
					if (createUser) userId = createUser.id;
				}

				if (!userId) {
					return res.status(400).json({
						apiVersion,
						error: {
							code: 400,
							message: 'Failed to register'
						}
					});
				}

				await Auth.query().insert({
					username,
					password,
					user_id: userId
				});

				return res.status(200).json({
					apiVersion,
					message: `Success to register ${username}`,
					data: {
						username
					}
				});
			} catch (e) {
				console.error(`Error when trying to register. ${e.message}`);
				return res.status(500).json({
					apiVersion,
					error: {
						code: 500,
						message: 'Could not register'
					}
				});
			}
		};
	}

	postLogin() {
		return async (req: Request, res: Response): Promise<OutgoingMessage> => {
			const apiVersion = res.locals.apiVersion;
			try {
				let { username, password } = req.body;

				username = username || '';
				password = password || '';

				const errors: ErrorInterface[] = [];
				errorAppender(errors, isEmpty(username), { location: 'username' });
				errorAppender(errors, isEmpty(password), { location: 'password' });
				if (errors.length) {
					return res.status(400).json({
						apiVersion,
						error: {
							code: 400,
							message: 'Error during input validation',
							errors
						}
					});
				}

				const foundAuth = await Auth.query().findOne({ username }).join('users', Auth.ref('user_id'), User.ref('id')).where({ is_admin: true });
				const isPasswordMatch = foundAuth ? await foundAuth.comparePassword(password) : false;
				if (!isPasswordMatch) {
					errorAppender(errors, true, { location: 'username', message: 'Wrong password/username' });
					errorAppender(errors, true, { location: 'password', message: 'Wrong password/username' });
					if (errors.length) {
						return res.status(400).json({
							apiVersion,
							error: {
								code: 400,
								message: 'Error during input validation',
								errors
							}
						});
					}
				}

				const tokenId = uuidv4();
				const accessToken = jwt.sign({
					username,
					tokenId
				}, process.env.ACCESS_TOKEN_SECRET, {
					expiresIn: parseInt(process.env.ACCESS_TOKEN_EXPIRATION, 10)
				});

				res.cookie(process.env.ACCESS_TOKEN_NAME, accessToken, {
					httpOnly: true,
					maxAge: parseInt(process.env.ACCESS_TOKEN_EXPIRATION, 10) * 1000,
					signed: true,
				});

				return res.status(200).json({
					apiVersion,
					data: {
						username
					}
				});
			} catch (e) {
				console.error(`Error when trying to login. ${e.message}`);
				return res.status(500).json({
					apiVersion,
					error: {
						code: 500,
						message: 'Could not login'
					}
				});
			}
		};
	}

	postLogout() {
		return (async (req: Request, res: Response) => {
			const apiVersion = res.locals.apiVersion;
			try {
				res.clearCookie(process.env.ACCESS_TOKEN_NAME);
				return res.json({
					apiVersion,
					message: 'Successfully logged out'
				});
			} catch (e) {
				console.error(`Could not log out the user: ${e.message}`);
				return res.status(500).json({
					apiVersion,
					error: {
						code: 500,
						message: 'Could not log out from current user.'
					}
				});
			}
		});
	}

	middlewareAuthCheck() {
		return [
			(req: Request, res: Response, next: NextFunction) => {
				const apiVersion = res.locals.apiVersion;
				try {
					passport.authenticate('jwt', { session: false }, (error, user) => {
						if (error) throw error;

						if (!user) {
							return res.status(401).json({
								apiVersion,
								error: {
									code: 401,
									message: 'Unauthorized user request',
									expiredToken: true
								}
							});
						}
						return next();
					})(req, res, next);
				} catch (e) {
					console.error(`Could not pass check authentication middleware: ${e.message}`);
					return res.status(500).json({
						apiVersion,
						error: {
							code: 500,
							message: 'Could not check your authentication, please try again'
						}
					});
				}
			}
		]
	}
}

export default GenericHandler;