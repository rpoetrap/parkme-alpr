import GenericHandler from '../modules/GenericHandler';
import bind from 'bind-decorator';
import { Request, Response } from 'express';
import moment, { Moment, unitOfTime } from 'moment';

import History from '../models/History';
import { ErrorInterface, errorAppender } from '../helpers/string';

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
				const startTime = moment().startOf(mode);;
				const endTime = moment().endOf(mode);;
				
				const statsList: { date: string, in: number, out: number, earnings: number}[] = [];
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
					const foundStats = statsList.find(item => item.date == moment(history.created_at).format(timeFormat));
					if (foundStats) {
						switch (history.action) {
							case 'in':
								foundStats.in++;
								break;
							case 'out':
								foundStats.out++;
								foundStats.earnings += history.cost * history.totalTime;
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
}

const historyHandler = new HistoryHandler({
	getList: { populateAttributes: [], shownAttributes: [] },
	getSingle: { populateAttributes: [], shownAttributes: [] },
	postData: { requiredAttributes: [], mutableAttributes: [], uniqueAttributes: [], shownAttributes: [] },
	patchData: { requiredAttributes: [], mutableAttributes: [], uniqueAttributes: [], shownAttributes: [] },
	deleteData: { populateAttributes: [], shownAttributes: [] },
}, History, 'historyId');

export default historyHandler;