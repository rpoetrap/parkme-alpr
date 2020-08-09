import { Model, ModelOptions, QueryContext } from 'objection';
import bcrypt from 'bcrypt';

class Auth extends Model {
	id: number;
	username: string;
	password: string;
	user_id: number;
	created_at: string;
	updated_at: string;

	static get tableName() {
		return 'auth';
	}

	$beforeInsert() {
		return new Promise((resolve, reject) => {
			bcrypt.genSalt(10, (err, salt) => {
				if (err) {
					reject(err);
				}
				bcrypt.hash(this.password, salt, (err, hash) => {
					if (err) {
						reject(err);
					}
					this.password = hash;
					resolve(this);
				});
			});
		});
	}

	$beforeUpdate(opt: ModelOptions, queryContext: QueryContext) {
		if (this.password !== queryContext.password) {
			return new Promise((resolve, reject) => {
				bcrypt.genSalt(10, (err, salt) => {
					if (err) {
						reject(err);
					}
					bcrypt.hash(this.password, salt, (err, hash) => {
						if (err) {
							reject(err);
						}
						this.password = hash;
						resolve(this);
					});
				});
			});
		}
	}

	async comparePassword(candidatePassword: string) {
		try {
			const match = await bcrypt.compare(candidatePassword, this.password);
			return match;
		} catch {
			return false;
		}
	}

}

export default Auth;