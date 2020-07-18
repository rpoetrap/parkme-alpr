import { Request, Response } from 'express';
import { Model, ColumnRefOrOrderByDescriptor, ReferenceBuilder } from 'objection';

import { stringToInteger, splitOperator } from '../helpers/string';

interface GenericConfig {
	filterByUser?: boolean;
	shownAttributes?: string[];
}

interface FetchingConfig extends GenericConfig {
	populateAttributes?: string[];
}

interface MutatingConfig extends GenericConfig {
	mutableAttributes?: string[];
	requiredAttributes?: string[];
}

interface HandlerConfig {
	getList: FetchingConfig,
	getSingle: FetchingConfig,
	postData: MutatingConfig,
	patchData: MutatingConfig,
	deleteData: FetchingConfig
}

class GenericHandler {
	private model: typeof Model;
	private idParam: string;
	private config: HandlerConfig;

	constructor(config: HandlerConfig, model: typeof Model, idParam: string) {
		this.config = config;
		this.model = model;
		this.idParam = idParam;
	}

	getList(overrideConfig?: FetchingConfig) {
		return (async (req: Request, res: Response) => {
			const apiVersion = res.locals.apiVersion;
			try {
				const config = overrideConfig ? overrideConfig : this.config.getList;
				const shownAttributes = config.shownAttributes || [];
				const populateAttributes = config.populateAttributes || [];
				const filterByUser = config.filterByUser || false;

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

				const { pageIndex: pageIndexQuery, itemsPerPage: itemsPerPageQuery, filters, sorts } = req.query;

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
}

export default GenericHandler;