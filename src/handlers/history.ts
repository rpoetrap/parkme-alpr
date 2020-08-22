import bind from 'bind-decorator';
import { Request, Response } from 'express';
import moment, { Moment, unitOfTime } from 'moment';
import { ReferenceBuilder, ColumnRefOrOrderByDescriptor } from 'objection';

import GenericHandler, { FetchingConfig } from '../modules/GenericHandler';
import History from '../models/History';
import { ErrorInterface, errorAppender, splitOperator, stringToInteger } from '../helpers/string';

class HistoryHandler extends GenericHandler<typeof History> {
	@bind
	middlewareValidation(body: any, req: Request, error: ErrorInterface[]) {
		// Put your validation here
	}

	getStats() {
		return (async (req: Request, res: Response) => {
			const apiVersion = res.locals.apiVersion;
			try {
				const { filter } = req.query;
				let query = this.model.query();

				const errors: ErrorInterface[] = [];
				errorAppender(errors, !filter || !['today', 'thisweek'].includes(filter as string), { location: 'filter', locationType: 'query' });
				if (errors.length) {
					return res.status(400).json({
						apiVersion,
						error: {
							code: 400,
							message: 'Error during input validation.',
							errors,
						}
					});
				}

				const mode: unitOfTime.StartOf = filter === 'today' ? 'day' : 'isoWeek';
				const startTime = moment().startOf(mode);
				const endTime = moment().endOf(mode);

				const statsList: { date: string, in: number, out: number, earnings: number }[] = [];
				const iterator: unitOfTime.StartOf = mode === 'day' ? 'hour' : 'day';
				const timeFormat = mode === 'day' ? 'HH:mm' : 'DD/MM/YYYY';
				for (const time = moment().startOf(mode); time.isSameOrBefore(moment().endOf(mode)); time.add('1', iterator)) {
					statsList.push({
						date: mode === 'day' ? time.format(timeFormat) : time.format(timeFormat),
						in: 0,
						out: 0,
						earnings: 0
					});
				}

				query = query.where(builder => {
					builder.where('created_at', '>=', startTime.toDate()).andWhere('created_at', '<=', endTime.toDate());
				});
				const result = await query;
				result.map(history => {
					const foundStats = statsList.find(item => item.date == moment(history.created_at).startOf(iterator).format(timeFormat));
					if (foundStats) {
						switch (history.action) {
							case 'in':
								foundStats.in++;
								break;
							case 'out':
								foundStats.out++;
								foundStats.earnings += history.cost;
								break;
						}
					}
				});

				const totalIn = statsList.map(item => item.in).reduce((total, value) => total + value);
				const totalOut = statsList.map(item => item.out).reduce((total, value) => total + value);
				const totalEarning = statsList.map(item => item.earnings).reduce((total, value) => total + value);
				return res.status(200).json({
					apiVersion,
					data: {
						kind: this.model.tableName,
						totalIn,
						totalOut,
						totalEarning,
						items: statsList
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

	getList(overrideConfig?: FetchingConfig) {
		return (async (req: Request, res: Response) => {
			const apiVersion = res.locals.apiVersion;
			try {
				const config = overrideConfig ? overrideConfig : this.config.getList;
				const shownAttributes = config.shownAttributes || [];
				const filterByUser = config.filterByUser || false;
				const populateAttributes = config.populateAttributes || [];

				const rawColumnInfo = await this.model.query().columnInfo();
				const columnInfo = Object.keys(rawColumnInfo);
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
				let { filters, sorts, search } = req.query;
				filters = filters || '';
				sorts = sorts || '';
				search = search || '';

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
								if (key.split('.').length === 1) {
									builder = builder.where(this.model.ref(key), operator, value);
								} else {
									const splittedKey = key.split('.');
									if (rawColumnInfo[splittedKey[0]]?.type === 'json') {
										builder = builder.whereRaw(`JSON_EXTRACT(${splittedKey[0]}, "$.${splittedKey.slice(1).join('.')}") ${operator} ${value}`);
									} else {
										builder = builder.where(key, operator, value);
									}
								}
							}
						});
					}
				});

				if (search) {
					const key = 'vehicle.plate';
					const value = `%${(search as string).toUpperCase()}%`;
					const splittedKey = key.split('.');
					query = query.whereRaw(`${splittedKey[0]}->"$.${splittedKey.slice(1).join('.')}" LIKE '${value}'`);
				}

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
}

const historyHandler = new HistoryHandler({
	getList: { populateAttributes: [], shownAttributes: [] },
	getSingle: { populateAttributes: [], shownAttributes: [] },
	postData: { requiredAttributes: [], mutableAttributes: [], uniqueAttributes: [], shownAttributes: [] },
	patchData: { requiredAttributes: [], mutableAttributes: [], uniqueAttributes: [], shownAttributes: [] },
	deleteData: { populateAttributes: [], shownAttributes: [] },
}, History, 'historyId');

export default historyHandler;