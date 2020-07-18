import { Model } from 'objection';

class Smartcard extends Model {
	id: number;
	serial: string;
	owner?: number;
	role_id: number;
	is_blocked: boolean;
	created_at: string;
	updated_at: string;
	created_by: number;
	updated_by: number;

	static get tableName() {
		return 'smartcards';
	}
}

export default Smartcard;