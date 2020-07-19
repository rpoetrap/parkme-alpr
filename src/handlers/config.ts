import GenericHandler from '../modules/GenericHandler';
import bind from 'bind-decorator';
import { Request } from 'express';

import Config from '../models/Config';
import { ErrorInterface, errorAppender } from '../helpers/string';

class ConfigHandler extends GenericHandler<typeof Config> {
	@bind
	middlewareValidation(body: any, req: Request, error: ErrorInterface[]) {
		// Put your validation here
	}
}

const configHandler = new ConfigHandler({
	getList: { populateAttributes: [], shownAttributes: [] },
	getSingle: { populateAttributes: [], shownAttributes: [] },
	postData: { requiredAttributes: [], mutableAttributes: [], uniqueAttributes: ['key'], shownAttributes: [] },
	patchData: { requiredAttributes: ['label', 'value'], mutableAttributes: ['label', 'value'], uniqueAttributes: ['key'], shownAttributes: [] },
	deleteData: { populateAttributes: [], shownAttributes: [] },
}, Config, 'configId');

export default configHandler;