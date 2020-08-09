import GenericHandler from '../modules/GenericHandler';
import bind from 'bind-decorator';
import { Request, Response } from 'express';
import moment from 'moment';
import multer from 'multer';

import CardTrx from '../models/CardTrx';
import Config from '../models/Config';
import Smartcard from '../models/Smartcard';
import Vehicle from '../models/Vehicle';
import Role from '../models/Role';
import History from '../models/History';
import { ErrorInterface, errorAppender } from '../helpers/string';
import PlateDetection from '../helpers/PlateDetection';
import Backpropagation, { normalizeData } from '../helpers/Backpropagation';
import { charList, hiddenLayer } from '../configs/backpropagation';

class CardTrxHandler extends GenericHandler<typeof CardTrx> {
	@bind
	middlewareValidation(body: any, req: Request, error: ErrorInterface[]) {
		// Put your validation here
	}

	postParking() {
		return (async (req: Request, res: Response) => {
			const apiVersion = res.locals.apiVersion;
			const upload = multer({
				storage: multer.memoryStorage(),
				fileFilter: (req, file, cb) => {
					if (file.mimetype.split('/')[0] != 'image') {
						return cb(new Error('Error while uploading: ' + file.originalname + ', file type not allowed!'));
					}

					return cb(null, true);
				}
			}).single('vehicle_plate');

			return upload(req, res, async (err: any) => {
				try {
					const file = req.file;
					const gateData: any = req.user;
					const { card_serial } = req.body;
					const { type } = gateData;

					/**
					 * Check required attributes
					 */
					const requiredErrors: ErrorInterface[] = [];
					errorAppender(requiredErrors, !card_serial, { location: 'card_serial' });
					if (err) errorAppender(requiredErrors, err, { location: 'vehicle_plate', message: 'Error while uploading files. ' + err.message });
					else errorAppender(requiredErrors, !file, { location: 'vehicle_plate' });
					errorAppender(requiredErrors, !type, { location: 'session_id', locationType: 'gate' });
					if (requiredErrors.length) {
						return res.status(400).json({
							apiVersion,
							error: {
								code: 400,
								message: 'Error during input validation.',
								errors: requiredErrors,
							}
						});
					}

					const detection = new PlateDetection(file.buffer);
					const detected = await detection.detect();

					// Normalize
					const detectedChars = detected.map(item => {
						const result = normalizeData(item);
						return result;
					});

					if (detectedChars.length == 0) {
						return res.status(404).json({
							apiVersion,
							error: {
								code: 404,
								message: 'Vehicle plate not detected.',
							}
						});
					}

					const backpro = new Backpropagation(detectedChars[0].length, hiddenLayer, charList);
					backpro.load();
					const vehiclePlate: string[] = [];
					for (const data of detectedChars) {
						const { output } = backpro.feedforward(data);
						const result = (output.toArray() as number[][]).map(item => item[0]);

						const charResult = charList[result.indexOf(Math.max(...result))];
						vehiclePlate.push(charResult);
					}
					const vehicle_plate = vehiclePlate.join('');

					let registeredOnly = false;
					let cost = 0;
					const config = await Config.query().select('key', 'value');
					config.map(item => {
						switch (item.key) {
						case 'registeredOnly':
							registeredOnly = item.value === 'true';
							break;
						case 'cost':
							cost = parseInt(item.value);
							break;
						}
					});

					/**
					 * Check card and vehicle existence
					 */
					let foundVehicle = await Vehicle.query().findOne('plate', vehicle_plate);
					if (!foundVehicle) {
						const createdVehicle = await Vehicle.query().insert({ plate: vehicle_plate });
						foundVehicle = createdVehicle;
					}

					let foundCard = await Smartcard.query().withGraphJoined('[role, user]').findOne('serial', card_serial);
					if (!foundCard) {
						if (registeredOnly) {
							return res.status(401).json({
								apiVersion,
								error: {
									code: 401,
									message: 'Card not registered.',
								}
							});
						}

						// Check user card role
						const foundRole = await Role.query().findOne('id', 2);
						if (!foundRole) {
							return res.status(400).json({
								apiVersion,
								error: {
									code: 400,
									message: 'Could not register new card.',
								}
							});
						}

						const createdCard = await Smartcard.query().insert({ serial: card_serial, role_id: 2 });
						foundCard = await Smartcard.query().withGraphJoined('[role, user]').findById(createdCard.id);
					}

					if (foundCard.is_blocked) {
						return res.status(403).json({
							apiVersion,
							error: {
								code: 403,
								message: 'Card is blocked.',
							}
						});
					}

					/**
					 * Validate used card and parked vehicle
					 */
					let result: CardTrx;
					const foundParkedVehicle = await this.model.query().findOne('vehicle_id', foundVehicle.id);
					if (type == 'in') {
						if (foundParkedVehicle) {
							return res.status(400).json({
								apiVersion,
								error: {
									code: 400,
									message: 'Vehicle already parked here.',
								}
							});
						}

						const foundUsedCard = await this.model.query().findOne('card_id', foundCard.id);
						if (foundUsedCard) {
							if (!(foundCard as any).role.free_vehicle) {
								return res.status(403).json({
									apiVersion,
									error: {
										code: 403,
										message: 'Card already used.',
									}
								});
							}
						}

						result = await this.model.query().insert({ card_id: foundCard.id, vehicle_id: foundVehicle.id });
						await History.query().insert({
							smartcard: JSON.stringify(foundCard),
							action: type,
							gate: JSON.stringify(gateData),
							vehicle: JSON.stringify(foundVehicle),
							created_by: (foundCard as any).user
						});
					} else {
						if (!foundParkedVehicle) {
							return res.status(404).json({
								apiVersion,
								error: {
									code: 404,
									message: 'Vehicle not found.',
								}
							});
						}

						if (foundParkedVehicle.card_id != foundCard.id) {
							if (!(foundCard as any).role.free_vehicle) {
								return res.status(403).json({
									apiVersion,
									error: {
										code: 403,
										message: 'Card not matched.',
									}
								});
							}
						}

						if (!(foundCard as any).role.free_charge) cost = 0;
						await this.model.query().deleteById(foundParkedVehicle.id);
						await History.query().insert({
							smartcard: JSON.stringify(foundCard),
							action: type,
							gate: JSON.stringify(gateData),
							vehicle: JSON.stringify(foundVehicle),
							created_by: (foundCard as any).user,
							totalTime: moment().diff(moment(foundParkedVehicle.created_at)),
							cost,
						});
						result = foundParkedVehicle;
					}

					return res.status(200).json({
						apiVersion,
						data: {
							kind: this.model.tableName,
							...result
						}
					});
				} catch (e) {
					console.error(`Error occured when trying to post parking to ${this.model.tableName}: ${e.message}`);
					return res.status(500).json({
						apiVersion,
						error: {
							code: 500,
							message: `Could not post parking to ${this.model.tableName}`
						}
					});
				}
			});
		});
	}
}

const cardTrxHandler = new CardTrxHandler({
	getList: { populateAttributes: ['card.user', 'vehicle'], shownAttributes: [] },
	getSingle: { populateAttributes: ['card.user', 'vehicle'], shownAttributes: [] },
	postData: { requiredAttributes: [], mutableAttributes: [], uniqueAttributes: [], shownAttributes: [] },
	patchData: { requiredAttributes: [], mutableAttributes: [], uniqueAttributes: [], shownAttributes: [] },
	deleteData: { populateAttributes: [], shownAttributes: [] },
}, CardTrx, 'cardTrxId');

export default cardTrxHandler;