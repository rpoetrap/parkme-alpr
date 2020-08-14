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
		const history = this;
		if (history.smartcard) {
			history.smartcard = JSON.stringify(history.smartcard);
		}
		if (history.gate) {
			history.gate = JSON.stringify(history.gate);
		}
		if (history.vehicle) {
			history.vehicle = JSON.stringify(history.vehicle);
		}
	}

	$beforeUpdate() {
		const history = this;
		if (history.smartcard) {
			history.smartcard = JSON.stringify(history.smartcard);
		}
		if (history.gate) {
			history.gate = JSON.stringify(history.gate);
		}
		if (history.vehicle) {
			history.vehicle = JSON.stringify(history.vehicle);
		}
	}

	$afterFind() {
		const history = this;
		if (history.smartcard) {
			history.smartcard = JSON.parse(history.smartcard);
		}
		if (history.gate) {
			history.gate = JSON.parse(history.gate);
		}
		if (history.vehicle) {
			history.vehicle = JSON.parse(history.vehicle);
		}
	}
}

export default History;