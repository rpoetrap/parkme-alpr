import { Model } from 'objection';

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
}

export default User;