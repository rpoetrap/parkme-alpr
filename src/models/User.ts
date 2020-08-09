import { Model } from 'objection';
import File from './File';

class User extends Model {
	id: number;
	name: string;
	phone?: string;
	user_identifier?: string;
	is_admin?: boolean;
	photo_id?: string;
	created_at: string;
	updated_at: string;

	static get tableName() {
		return 'users';
	}

	static get relationMappings() {
		return {
			photo: {
				relation: Model.HasOneRelation,
				modelClass: File,
				join: {
					from: `${this.tableName}.photo_id`,
					to: `${File.tableName}.id`
				}
			},
		};
	}
}

export default User;