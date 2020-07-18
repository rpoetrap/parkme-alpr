import { Model } from 'objection';

class Config extends Model {
  id: number;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;

  static get tableName() {
  	return 'configs';
  }
}

export default Config;