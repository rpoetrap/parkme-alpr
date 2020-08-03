import { Model } from 'objection';

class Gate extends Model {
	id: number;
	session_id: string;
	code?: string;
	name: string;
	type: string;
	description: string;
	created_at: string;
	updated_at: string;

	static get tableName() {
		return 'gates';
	}
}

export default Gate;