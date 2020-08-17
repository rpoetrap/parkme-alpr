import { Model } from 'objection';

class History extends Model {
	id: number;
	smartcard: any;
	action: string;
	cost?: number;
	totalTime?: number;
	gate?: any;
	vehicle: any;
	created_at: string;
	created_by: any;

	static get tableName() {
		return 'histories';
	}

	$beforeInsert() {
		if (this.smartcard) {
			this.smartcard = JSON.stringify(this.smartcard);
		}
		if (this.gate) {
			this.gate = JSON.stringify(this.gate);
		}
		if (this.vehicle) {
			this.vehicle = JSON.stringify(this.vehicle);
		}
	}

	$beforeUpdate() {
		if (this.smartcard) {
			this.smartcard = JSON.stringify(this.smartcard);
		}
		if (this.gate) {
			this.gate = JSON.stringify(this.gate);
		}
		if (this.vehicle) {
			this.vehicle = JSON.stringify(this.vehicle);
		}
	}

	$afterFind() {
		if (this.smartcard) {
			this.smartcard = JSON.parse(this.smartcard);
		}
		if (this.gate) {
			this.gate = JSON.parse(this.gate);
		}
		if (this.vehicle) {
			this.vehicle = JSON.parse(this.vehicle);
		}
	}
}

export default History;