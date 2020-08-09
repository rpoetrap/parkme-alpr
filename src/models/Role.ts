import { Model } from 'objection';

class Role extends Model {
	id: number;
	name: string;
	description: string;
	free_vehicle: boolean;
	free_charge: boolean;
	created_at: string;
	updated_at: string;

	static get tableName() {
		return 'roles';
	}
}

export default Role;