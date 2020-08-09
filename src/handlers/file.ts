import GenericHandler from '../modules/GenericHandler';
import bind from 'bind-decorator';
import { Request } from 'express';

import File from '../models/File';
import { ErrorInterface, errorAppender } from '../helpers/string';

class FileHandler extends GenericHandler<typeof File> {
	@bind
	middlewareValidation(body: any, req: Request, error: ErrorInterface[]) {
		// Put your validation here
	}
}

const fileHandler = new FileHandler({
	getList: { populateAttributes: [], shownAttributes: [] },
	getSingle: { populateAttributes: [], shownAttributes: [] },
	postData: { requiredAttributes: [], mutableAttributes: [], uniqueAttributes: [], shownAttributes: [] },
	patchData: { requiredAttributes: [], mutableAttributes: [], uniqueAttributes: [], shownAttributes: [] },
	deleteData: { populateAttributes: [], shownAttributes: [] },
	postUpload: { uploadPath: 'uploads', requiredAttributes: [], mutableAttributes: [], uniqueAttributes: [], shownAttributes: [] },
}, File, 'fileId', true);

export default fileHandler;