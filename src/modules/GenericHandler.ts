import { Request, Response } from 'express';
import { Model, ColumnRefOrOrderByDescriptor, ReferenceBuilder } from 'objection';
import { pick, isEmpty, isNil } from 'lodash';
import moment from 'moment';
import bind from 'bind-decorator';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

import { stringToInteger, splitOperator, ErrorInterface, errorAppender } from '../helpers/string';

interface GenericConfig {
	filterByUser?: boolean;
	shownAttributes?: string[];
}

interface FetchingConfig extends GenericConfig {
	populateAttributes?: string[];
}

interface MutatingConfig extends GenericConfig {
	mutableAttributes?: string[];
	uniqueAttributes?: string[];
	requiredAttributes?: string[];
}

interface PostUploadConfig extends MutatingConfig {
	maxFile?: number;
	maxSize?: number;
	mimetype?: string[];
	fileExtension?: string[];
	uploadPath: string;
}


interface HandlerConfig {
	getList: FetchingConfig,
	getSingle: FetchingConfig,
	postData: MutatingConfig,
	patchData: MutatingConfig,
	deleteData: FetchingConfig,
	postUpload?: PostUploadConfig,
}

class GenericModel extends Model {
	id: number | string;
}

class GenericHandler<M extends typeof GenericModel> {
	protected model: M;
	protected idParam: string;
	private config: HandlerConfig;
	protected isFile: boolean;

	constructor(config: HandlerConfig, model: M, idParam: string, isFile = false) {
		this.config = config;
		this.model = model;
		this.idParam = idParam;
		this.isFile = isFile;
	}

	getList(overrideConfig?: FetchingConfig) {
		return (async (req: Request, res: Response) => {
			const apiVersion = res.locals.apiVersion;
			try {
				const config = overrideConfig ? overrideConfig : this.config.getList;
				const shownAttributes = config.shownAttributes || [];
				const filterByUser = config.filterByUser || false;
				const populateAttributes = config.populateAttributes || [];

				const columnInfo = Object.keys(await this.model.query().columnInfo());
				const userData: any = req.user;

				let query = this.model.query();

				/**
				 * Filtering data owned by specific user
				 */
				if (filterByUser) {
					if (columnInfo.includes['owner']) {
						query = query.where({ owner: userData.id });
					} else if (columnInfo.includes['created_by']) {
						query = query.where({ created_by: userData.id });
					}
				}

				/**
				 * Populating attribute
				 */
				if (populateAttributes.length) {
					query = query.withGraphJoined(`[${populateAttributes.join(', ')}]`);
				}

				/**
				 * Selecting specific attribute
				 */
				if (shownAttributes.length) {
					query = query.select(shownAttributes);
				}

				const { pageIndex: pageIndexQuery, itemsPerPage: itemsPerPageQuery } = req.query;
				let { filters, sorts } = req.query;
				filters = filters || '';
				sorts = sorts || '';

				/**
				 * Filtering
				 */
				const orFilter = filters ? (<string>filters).split(',') : [];
				query = query.where(builder => {
					for (const orString of orFilter) {
						const andFilter = orString ? (<string>orString).split(';') : [];
						builder.orWhere(builder => {
							for (const andString of andFilter) {
								const { key, operator, value } = splitOperator(<string>andString);
								builder = key.split('.') ? builder.where(key, operator, value) : builder.where(this.model.ref(key), operator, value);
							}
						});
					}
				});

				/**
				 * Sorting
				 */
				const sortArray = sorts ? (<string>sorts).split(';') : [];
				const sortObjects = sortArray.map(item => {
					let column: string | ReferenceBuilder = item;
					let order = 'asc';
					if (column.startsWith('-')) {
						column = column.slice(1);
						order = 'desc';
					}
					column = column.includes('.') ? this.model.ref(column) : column;
					return { column, order } as ColumnRefOrOrderByDescriptor;
				});
				if (sortObjects.length) {
					query = query.orderBy(sortObjects);
				}

				/**
				 * Pagination
				 */
				const pageIndex = stringToInteger(pageIndexQuery) > 0 ? stringToInteger(pageIndexQuery) : 1;
				const itemsPerPage = stringToInteger(itemsPerPageQuery) > 0 ? stringToInteger(itemsPerPageQuery) : 10;
				const { results, total } = await query.page((pageIndex - 1), itemsPerPage);
				const totalPages = Math.ceil(total / itemsPerPage);

				return res.status(200).json({
					apiVersion,
					data: {
						kind: this.model.tableName,
						filters,
						sorts,
						currentItemCount: results.length,
						itemsPerPage,
						totalItems: total,
						pageIndex,
						totalPages,
						items: results
					}
				});
			} catch (e) {
				console.error(`Error occured when trying to fetch ${this.model.tableName} list: ${e.message}`);
				return res.status(500).json({
					apiVersion,
					error: {
						code: 500,
						message: `Could not fetch ${this.model.tableName} list`
					}
				});
			}
		});
	}

	getSingle(overrideConfig?: FetchingConfig) {
		return (async (req: Request, res: Response) => {
			const apiVersion = res.locals.apiVersion;
			try {
				const config = overrideConfig ? overrideConfig : this.config.getSingle;
				const shownAttributes = config.shownAttributes || [];
				const filterByUser = config.filterByUser || false;
				const populateAttributes = config.populateAttributes || [];

				const columnInfo = Object.keys(await this.model.query().columnInfo());
				const id = req.params[this.idParam];
				const userData: any = req.user;

				let query = this.model.query().findById(id);

				/**
				 * Check existing resource
				 */
				let existingQuery = this.model.query().findById(id);
				if (filterByUser) {
					if (columnInfo.includes('created_by')) {
						existingQuery = existingQuery.where({ created_by: userData.id });
					} else if (columnInfo.includes['created_by']) {
						query = query.where({ created_by: userData.id });
					}
				}
				const existingResource = await existingQuery.select('id');
				if (!existingResource) {
					return res.status(404).json({
						apiVersion,
						error: {
							code: 404,
							message: `Could not find the associated resource for ${this.model.tableName}`
						}
					});
				}

				/**
				 * Populating attribute
				 */
				if (populateAttributes.length) {
					query = query.withGraphJoined(`[${populateAttributes.join(', ')}]`);
				}

				/**
				 * Selecting specific attribute
				 */
				if (shownAttributes.length) {
					query = query.select(shownAttributes);
				}

				const result = await query;

				return res.status(200).json({
					apiVersion,
					data: {
						kind: this.model.tableName,
						...result
					}
				});
			} catch (e) {
				console.error(`Error occured when trying to fetch ${this.model.tableName} detail: ${e.message}`);
				return res.status(500).json({
					apiVersion,
					error: {
						code: 500,
						message: `Could not fetch ${this.model.tableName} detail`
					}
				});
			}
		});
	}

	postData(overrideConfig?: MutatingConfig) {
		return (async (req: Request, res: Response) => {
			const apiVersion = res.locals.apiVersion;
			try {
				const config = overrideConfig ? overrideConfig : this.config.postData;
				const shownAttributes = config.shownAttributes || [];
				const requiredAttributes = config.requiredAttributes || [];
				const mutableAttributes = config.mutableAttributes || [];
				const uniqueAttributes = config.uniqueAttributes || [];

				const columnInfo = Object.keys(await this.model.query().columnInfo());
				const userData: any = req.user;

				/**
				 * Filter post data field by mutableAttributes and columnInfo
				 */
				const postData = mutableAttributes.length ?
					pick(req.body, columnInfo.filter(item => mutableAttributes.includes(item))) :
					pick(req.body, columnInfo);

				/**
				 * Check required attributes
				 */
				const requiredErrors: ErrorInterface[] = [];
				if (requiredAttributes.length) {
					for (const attribute of requiredAttributes) {
						errorAppender(requiredErrors, isEmpty(postData[attribute]), { location: attribute });
					}
				}
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

				/**
				 * Input validation
				 */
				const customErrors: ErrorInterface[] = [];
				this.middlewareValidation(postData, req, customErrors);
				if (customErrors.length) {
					return res.status(400).json({
						apiVersion,
						error: {
							code: 400,
							message: 'Error during input validation.',
							errors: customErrors,
						}
					});
				}

				/**
				 * Check unique attributes
				 */
				const uniqueErrors: ErrorInterface[] = [];
				const uniqueQuery = this.model.query().select(['id']);
				for (const attribute of uniqueAttributes.filter(item => Object.keys(postData).includes(item))) {
					const existedData = await uniqueQuery.where(attribute, postData[attribute]);
					errorAppender(uniqueErrors, existedData.length > 0, { location: attribute, message: `Input ${attribute} is already existed` });
				}
				if (uniqueErrors.length) {
					return res.status(400).json({
						apiVersion,
						error: {
							code: 400,
							message: 'Error during input validation.',
							errors: uniqueErrors,
						}
					});
				}

				/**
				 * Send additional data
				 */
				let input = postData;
				if (columnInfo.includes('created_by')) input = {
					...input,
					created_by: userData.id
				};

				const result = await this.model.query().insert(input);
				let query = this.model.query().findById(result.id);
				if (shownAttributes.length) query = query.select(shownAttributes);
				const createdResource = await query;

				return res.status(200).json({
					apiVersion,
					data: {
						kind: this.model.tableName,
						...createdResource
					}
				});
			} catch (e) {
				console.error(`Error occured when trying to insert data to ${this.model.tableName}: ${e.message}`);
				return res.status(500).json({
					apiVersion,
					error: {
						code: 500,
						message: `Could not insert data to ${this.model.tableName}`
					}
				});
			}
		});
	}

	patchData(overrideConfig?: MutatingConfig) {
		return (async (req: Request, res: Response) => {
			const apiVersion = res.locals.apiVersion;
			try {
				const config = overrideConfig ? overrideConfig : this.config.patchData;
				const shownAttributes = config.shownAttributes || [];
				const requiredAttributes = config.requiredAttributes || [];
				const mutableAttributes = config.mutableAttributes || [];
				const uniqueAttributes = config.uniqueAttributes || [];
				const filterByUser = config.filterByUser || false;

				const columnInfo = Object.keys(await this.model.query().columnInfo());
				const id = req.params[this.idParam];
				const userData: any = req.user;

				/**
				 * Filter post data field by mutableAttributes and columnInfo
				 */
				const postData = mutableAttributes.length ?
					pick(req.body, columnInfo.filter(item => mutableAttributes.includes(item))) :
					pick(req.body, columnInfo);

				/**
				 * Check required attributes
				 */
				const requiredErrors: ErrorInterface[] = [];
				if (requiredAttributes.length) {
					for (const attribute of requiredAttributes) {
						errorAppender(requiredErrors, isEmpty(postData[attribute]), { location: attribute });
					}
				}
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

				/**
				 * Input validation
				 */
				const customErrors: ErrorInterface[] = [];
				this.middlewareValidation(postData, req, customErrors);
				if (customErrors.length) {
					return res.status(400).json({
						apiVersion,
						error: {
							code: 400,
							message: 'Error during input validation.',
							errors: customErrors,
						}
					});
				}

				/**
				 * Check existing resource
				 */
				let existingQuery = this.model.query().findById(id);
				if (filterByUser && columnInfo.includes('created_by')) {
					existingQuery = existingQuery.where({ created_by: userData.id });
				}
				const existingResource = await existingQuery.select('id');
				if (!existingResource) {
					return res.status(404).json({
						apiVersion,
						error: {
							code: 404,
							message: `Could not find the associated resource for ${this.model.tableName}`
						}
					});
				}

				/**
				 * Check unique attributes
				 */
				const uniqueErrors: ErrorInterface[] = [];
				const uniqueQuery = this.model.query().select(['id']);
				for (const attribute of uniqueAttributes.filter(item => Object.keys(postData).includes(item))) {
					const existedData = await uniqueQuery.where(attribute, postData[attribute]).andWhereNot({ id });
					errorAppender(uniqueErrors, existedData.length > 0, { location: attribute, message: `Input ${attribute} is already existed` });
				}
				if (uniqueErrors.length) {
					return res.status(400).json({
						apiVersion,
						error: {
							code: 400,
							message: 'Error during input validation.',
							errors: uniqueErrors,
						}
					});
				}

				/**
				 * Send additional data
				 */
				let input = postData;
				if (columnInfo.includes('updated_at')) input = {
					...input,
					updated_at: moment().format('YYYY-MM-DD HH:mm:ss')
				};
				if (columnInfo.includes('updated_by')) input = {
					...input,
					updated_by: userData.id
				};

				await this.model.query().findById(id).patch(input);
				let query = this.model.query().findById(id);
				if (shownAttributes.length) query = query.select(shownAttributes);
				const updatedResource = await query;

				return res.status(200).json({
					apiVersion,
					data: {
						kind: this.model.tableName,
						...updatedResource
					}
				});
			} catch (e) {
				console.error(`Error occured when trying to edit ${this.model.tableName} data: ${e.message}`);
				return res.status(500).json({
					apiVersion,
					error: {
						code: 500,
						message: `Could not edit ${this.model.tableName} data`
					}
				});
			}
		});
	}

	deleteData(overrideConfig?: FetchingConfig) {
		return (async (req: Request, res: Response) => {
			const apiVersion = res.locals.apiVersion;
			try {
				const config = overrideConfig ? overrideConfig : this.config.deleteData;
				const shownAttributes = config.shownAttributes || [];
				const filterByUser = config.filterByUser || false;
				const populateAttributes = config.populateAttributes || [];

				const columnInfo = Object.keys(await this.model.query().columnInfo());
				const id = req.params[this.idParam];
				const userData: any = req.user;

				/**
				 * Check existing resource
				 */
				let existingQuery = this.model.query().findById(id);
				if (filterByUser && columnInfo.includes('created_by')) {
					existingQuery = existingQuery.where({ created_by: userData.id });
				}
				const existingResource = await existingQuery.select('id');
				if (!existingResource) {
					return res.status(404).json({
						apiVersion,
						error: {
							code: 404,
							message: `Could not find the associated resource for ${this.model.tableName}`
						}
					});
				}

				let deleteQuery = this.model.query().findById(id);

				/**
				 * Populating attribute
				 */
				if (populateAttributes.length) {
					deleteQuery = deleteQuery.withGraphJoined(`[${populateAttributes.join(', ')}]`);
				}

				/**
				 * Selecting specific attribute
				 */
				if (shownAttributes.length) {
					deleteQuery = deleteQuery.select(shownAttributes);
				}

				const deletedResource = await deleteQuery;
				await this.model.query().deleteById(id);

				return res.status(200).json({
					apiVersion,
					data: {
						kind: this.model.tableName,
						...deletedResource
					}
				});
			} catch (e) {
				console.error(`Error occured when trying to delete ${this.model.tableName} data: ${e.message}`);
				return res.status(500).json({
					apiVersion,
					error: {
						code: 500,
						message: `Could not delete ${this.model.tableName} data`
					}
				});
			}
		});
	}

	postUploadFile(overridingConfiguration?: PostUploadConfig) {
		if (!this.isFile) return undefined;
		return async (req: Request, res: Response) => {
			const apiVersion = res.locals.apiVersion;
			try {
				const input = req.body;
				const config = overridingConfiguration ? overridingConfiguration : this.config.postUpload;
				const storage = multer.diskStorage({
					destination: config.uploadPath,
					filename: (req, file, callback) => {
						callback(null, moment().unix() + '-' + uuidv4() + path.extname(file.originalname).toLowerCase());
					}
				});
				const upload = multer({
					storage: storage,
					limits: {
						files: config.maxFile || 5,
						fileSize: config.maxSize
					},
					fileFilter: (req, file, cb) => {
						if (config.mimetype) {
							if (!config.mimetype.includes(file.mimetype)) {
								return cb(new Error('Error while uploading: ' + file.originalname + ', file type not allowed!'));
							}
						}
						if (config.fileExtension) {
							if (!config.fileExtension.includes(path.extname(file.originalname).substr(1).toLowerCase())) {
								return cb(new Error('Error while uploading: ' + file.originalname + ', file extension not allowed!'));
							}
						}
						return cb(null, true);
					}
				}).array('files');

				return upload(req, res, async (err) => {
					let {
						shownAttributes,
						mutableAttributes,
						uniqueAttributes,
						requiredAttributes
					} = config;

					uniqueAttributes = uniqueAttributes ? uniqueAttributes : [];
					mutableAttributes = mutableAttributes ? mutableAttributes : [];
					shownAttributes = shownAttributes ? shownAttributes : [];
					requiredAttributes = requiredAttributes ? requiredAttributes : [];

					const missingErrors: ErrorInterface[] = [];

					requiredAttributes.forEach((val) => {
						if (isNil(req.body[val])) {
							errorAppender(missingErrors, true, { location: val });
						}
					});

					if (missingErrors.length) {
						return res.status(400).json({
							error: {
								code: 400,
								message: 'Error during input validation.',
								errors: missingErrors,
							}
						});
					}

					const uniqueQuery = this.model.query().select(['id']);
					const columnInfo = await this.model.query().columnInfo();

					const attributes = Object.keys(columnInfo).map(val => val);

					const trimmedInput = pick(input, attributes);

					// Unique attributes that is supposed to unique but exist in the DB.
					const existingUniqueAttributes: (string | undefined)[] = [];

					for (let i = 0; i < uniqueAttributes.length; i++) {
						const val = uniqueAttributes[i];
						const existingResource = await uniqueQuery.andWhere(val, '=', trimmedInput[val]);

						if (existingResource.length) {
							existingUniqueAttributes.push(val);
						}
					}

					const errors: ErrorInterface[] = [];
					if (err) errorAppender(errors, err, { location: 'files', message: 'Error while uploading files. ' + err.message });
					existingUniqueAttributes.forEach((val) => {
						errorAppender(errors, true, { location: val, message: `Input ${val} is already existed` });
					});

					if (errors.length) {
						return res.status(400).json({
							error: {
								code: 400,
								message: 'Error during input validation.',
								errors,
							}
						});
					}

					const allowedInput = mutableAttributes && mutableAttributes.length ?
						pick(trimmedInput, mutableAttributes) :
						trimmedInput;

					let createdResults = [];
					const files: any = req.files;

					errorAppender(errors, (!files || !files.length), { location: 'files', message: 'Files should not be empty!' });
					if (errors.length) {
						return res.status(400).json({
							error: {
								code: 400,
								message: 'Error during input validation.',
								errors,
							}
						});
					}

					for (const item of files) {
						const filedata: any = {
							filename: item.originalname,
							mime: item.mimetype,
							path: process.cwd() + '/' + item.path,
							url: item.path,
							extension: path.extname(item.originalname).substr(1).toLowerCase(),
							filesize: item.size
						}
						const result = await this.model.query().insert({ ...filedata, ...allowedInput });
						createdResults.push(shownAttributes && shownAttributes.length ?
							await this.model.query().findById(result.id).select(shownAttributes) :
							await this.model.query().findById(result.id)
						);
					}

					return res.json({
						apiVersion,
						data: {
							kind: this.model.tableName,
							items: createdResults
						}
					});

				})
			} catch (e) {
				console.error(`Error occured when trying to upload ${this.model.tableName} with: ${e.message}`);
				return res.status(500).json({
					apiVersion,
					error: {
						code: 500,
						message: `Could not upload ${this.model.tableName}`
					}
				});
			}
		}
	}

	@bind
	protected middlewareValidation(body: any, req: Request, error: ErrorInterface[]) {
		// Put your validation here
	}
}

export default GenericHandler;