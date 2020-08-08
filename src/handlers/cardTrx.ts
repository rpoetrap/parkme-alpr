import GenericHandler from '../modules/GenericHandler';
import bind from 'bind-decorator';
import { Request } from 'express';

import CardTrx from '../models/CardTrx';
import { ErrorInterface, errorAppender } from '../helpers/string';

class CardTrxHandler extends GenericHandler<typeof CardTrx> {
	@bind
	middlewareValidation(body: any, req: Request, error: ErrorInterface[]) {
		// Put your validation here
	}
}

const cardTrxHandler = new CardTrxHandler({
	getList: { populateAttributes: ['card.user', 'vehicle'], shownAttributes: [] },
	getSingle: { populateAttributes: ['card.user', 'vehicle'], shownAttributes: [] },
	postData: { requiredAttributes: [], mutableAttributes: [], uniqueAttributes: [], shownAttributes: [] },
	patchData: { requiredAttributes: [], mutableAttributes: [], uniqueAttributes: [], shownAttributes: [] },
	deleteData: { populateAttributes: [], shownAttributes: [] },
}, CardTrx, 'cardTrxId');

export default cardTrxHandler;