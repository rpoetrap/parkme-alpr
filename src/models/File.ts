import { Model } from 'objection';

class File extends Model {
  id: number;
  filename: string;
  filetype: string;
  mime: string;
  filesize: number;
  path: string;
  url: string;
  created_at: string;
  updated_at: string;

  static get tableName() {
  	return 'files';
  }
}

export default File;