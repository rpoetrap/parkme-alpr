import GenericHandler from '../modules/GenericHandler';
import bind from 'bind-decorator';
import { Request } from 'express';

import Smartcard from '../models/Smartcard';
import { ErrorInterface, errorAppender } from '../helpers/string';

class SmartcardHandler extends GenericHandler<typeof Smartcard> {
	@bind
	middlewareValidation(body: any, req: Request, error: ErrorInterface[]) {
		// Put your validation here
	}
}

const smartcardHandler = new SmartcardHandler({
	getList: { populateAttributes: ['user', 'role'], shownAttributes: [] },
	getSingle: { populateAttributes: ['user', 'role'], shownAttributes: [] },
	postData: { requiredAttributes: [], mutableAttributes: [], uniqueAttributes: [], shownAttributes: [] },
	patchData: { requiredAttributes: [], mutableAttributes: [], uniqueAttributes: [], shownAttributes: [] },
	deleteData: { populateAttributes: [], shownAttributes: [] },
}, Smartcard, 'smartcardId');

export default smartcardHandler;