import { Model } from 'objection';

class Vehicle extends Model {
  id: number;
  plate: string;
  created_at: string;
  updated_at: string;

  static get tableName() {
  	return 'vehicles';
  }
}

export default Vehicle;