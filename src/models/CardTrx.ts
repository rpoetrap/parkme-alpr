import { Model } from 'objection';

class CardTrx extends Model {
	id: number;
	card_id: number;
	vehicle_id: number;
	created_at: string;
	updated_at: string;

	static get tableName() {
		return 'card_trx';
	}
}

export default CardTrx;