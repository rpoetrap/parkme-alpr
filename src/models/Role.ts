import { Model } from 'objection';

class Role extends Model {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;

  static get tableName() {
  	return 'roles';
  }
}

export default Role;