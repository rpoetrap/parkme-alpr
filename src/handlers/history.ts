import GenericHandler from '../modules/GenericHandler';
import bind from 'bind-decorator';
import { Request } from 'express';

import History from '../models/History';
import { ErrorInterface, errorAppender } from '../helpers/string';

class HistoryHandler extends GenericHandler<typeof History> {
	@bind
	middlewareValidation(body: any, req: Request, error: ErrorInterface[]) {
		// Put your validation here
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