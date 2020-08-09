import { Model } from 'objection';
import Smartcard from './Smartcard';
import Vehicle from './Vehicle';

class CardTrx extends Model {
	id: number;
	card_id: number;
	vehicle_id: number;
	created_at: string;
	updated_at: string;

	static get tableName() {
		return 'card_trx';
	}

	static get relationMappings() {
		return {
			card: {
				relation: Model.HasOneRelation,
				modelClass: Smartcard,
				join: {
					from: `${this.tableName}.card_id`,
					to: `${Smartcard.tableName}.id`
				}
			},
			vehicle: {
				relation: Model.HasOneRelation,
				modelClass: Vehicle,
				join: {
					from: `${this.tableName}.vehicle_id`,
					to: `${Vehicle.tableName}.id`
				}
			},
		};
	}
}

export default CardTrx;