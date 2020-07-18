import { Model } from 'objection';

class History extends Model {
	id: number;
	smartcard: any;
	action: string;
	gate?: any;
	vehicle: any;
	created_at: string;
	created_by: any;

	static get tableName() {
		return 'histories';
	}
}

export default History;