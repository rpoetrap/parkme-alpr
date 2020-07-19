import GenericHandler from '../modules/GenericHandler';
import bind from 'bind-decorator';
import { Request } from 'express';

import User from '../models/User';
import { ErrorInterface, errorAppender } from '../helpers/string';

class UserHandler extends GenericHandler<typeof User> {
	@bind
	middlewareValidation(body: any, req: Request, error: ErrorInterface[]) {
		// Put your validation here
	}
}

const userHandler = new UserHandler({
	getList: { populateAttributes: [], shownAttributes: [] },
	getSingle: { populateAttributes: [], shownAttributes: [] },
	postData: { requiredAttributes: ['name'], mutableAttributes: [], uniqueAttributes: ['user_identifier', 'photo_id'], shownAttributes: [] },
	patchData: { requiredAttributes: [], mutableAttributes: [], uniqueAttributes: ['user_identifier', 'photo_id'], shownAttributes: [] },
	deleteData: { populateAttributes: [], shownAttributes: [] },
}, User, 'userId');

export default userHandler;