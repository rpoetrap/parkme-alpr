import bind from 'bind-decorator';
import { Request, Response, NextFunction } from 'express';
import generateRandom from 'crypto-random-string';

import GenericHandler from '../modules/GenericHandler';
import Gate from '../models/Gate';
import { ErrorInterface, errorAppender } from '../helpers/string';

class GateHandler extends GenericHandler<typeof Gate> {
	@bind
	middlewareValidation(body: any, req: Request, error: ErrorInterface[]) {
		// Put your validation here
	}

	generateCode() {
		return (req: Request, res: Response, next: NextFunction) => {
			const apiVersion = res.locals.apiVersion;
			try {
				req.body['code'] = generateRandom({ length: 6, type: 'numeric' });
				next();
			} catch (e) {
				console.error(`Error occured when trying to insert data to ${Gate.tableName}: ${e.message}`);
				return res.status(500).json({
					apiVersion,
					error: {
						code: 500,
						message: `Could not insert data to ${Gate.tableName}`
					}
				});
			}
		}
	}

	validateCode() {
		return async (req: Request, res: Response, next: NextFunction) => {
			const apiVersion = res.locals.apiVersion;
			try {
				const { code } = req.body;
				if (code) {
					const foundGate = await Gate.query().findOne({ code }).select('id');
					const errors: ErrorInterface[] = [];
					errorAppender(errors, !foundGate, { location: 'code' });
					if (errors.length) {
						return res.status(400).json({
							apiVersion,
							error: {
								code: 400,
								message: 'Error during input validation.',
								errors
							}
						});
					}
					req.params['gateId'] = String(foundGate.id);
					req.body['code'] = null;
				}
				next();
			} catch (e) {
				console.error(`Error occured when trying to validate new ${Gate.tableName}: ${e.message}`);
				return res.status(500).json({
					apiVersion,
					error: {
						code: 500,
						message: `Could not validate new ${Gate.tableName}`
					}
				});
			}
		}
	}
}

const gateHandler = new GateHandler({
	getList: { populateAttributes: [], shownAttributes: [] },
	getSingle: { populateAttributes: [], shownAttributes: [] },
	postData: { requiredAttributes: [], mutableAttributes: ['code', 'name', 'description'], uniqueAttributes: ['session_id', 'code'], shownAttributes: [] },
	patchData: { requiredAttributes: [], mutableAttributes: ['name', 'description'], uniqueAttributes: ['session_id', 'code'], shownAttributes: [] },
	deleteData: { populateAttributes: [], shownAttributes: [] },
}, Gate, 'gateId');

export default gateHandler;