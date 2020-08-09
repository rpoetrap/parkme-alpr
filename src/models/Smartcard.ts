import { Model } from 'objection';
import User from './User';
import Role from './Role';

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

	static get relationMappings() {
		return {
			user: {
				relation: Model.HasOneRelation,
				modelClass: User,
				join: {
					from: `${this.tableName}.owner`,
					to: `${User.tableName}.id`
				}
			},
			role: {
				relation: Model.HasOneRelation,
				modelClass: Role,
				join: {
					from: `${this.tableName}.role_id`,
					to: `${Role.tableName}.id`
				}
			}
		};
	}
}

export default Smartcard;