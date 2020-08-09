import GenericHandler from '../modules/GenericHandler';
import bind from 'bind-decorator';
import { Request } from 'express';

import Role from '../models/Role';
import { ErrorInterface, errorAppender } from '../helpers/string';

class RoleHandler extends GenericHandler<typeof Role> {
	@bind
	middlewareValidation(body: any, req: Request, error: ErrorInterface[]) {
		// Put your validation here
	}
}

const roleHandler = new RoleHandler({
	getList: { populateAttributes: [], shownAttributes: [] },
	getSingle: { populateAttributes: [], shownAttributes: [] },
	postData: { requiredAttributes: [], mutableAttributes: [], uniqueAttributes: [], shownAttributes: [] },
	patchData: { requiredAttributes: [], mutableAttributes: [], uniqueAttributes: [], shownAttributes: [] },
	deleteData: { populateAttributes: [], shownAttributes: [] },
}, Role, 'roleId');

export default roleHandler;