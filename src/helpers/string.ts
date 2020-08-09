import { isEmpty } from 'lodash';
import validator from 'validator';
const { isNumeric } = validator;

export interface ErrorInterface {
	message?: string;
	location: string;
	locationType?: string;
}

export const errorAppender = (array: ErrorInterface[], condition: boolean, data: ErrorInterface) => {
	data.locationType = isEmpty(data.locationType) ? 'body' : data.locationType;
	data.message = isEmpty(data.message) ? `Invalid ${data.location}` : data.message;
	if (condition) array.push(data);
};

export const stringToInteger = (data: any) => {
	switch (typeof data) {
	case 'string':
		return isNumeric(data) ? parseInt(data, 10) : null;
	case 'number':
		return data;
	default:
		return null;
	}
};

export const splitOperator = (data: string) => {
	const operatorList = [
		{ operator: '==', queryOperator: '=' },
		{ operator: '!=', queryOperator: '!=' },
		{ operator: '=@', queryOperator: 'like' },
		{ operator: '!@', queryOperator: 'not like' },
		{ operator: '<=', queryOperator: '<=' },
		{ operator: '>=', queryOperator: '>=' },
		{ operator: '<', queryOperator: '<' },
		{ operator: '>', queryOperator: '>' }
	];
	for (const { operator, queryOperator } of operatorList) {
		if (data.includes(operator)) {
			const splitData = data.split(operator);
			if (['=@', '!@'].includes(operator)) splitData[1] = `%${splitData[1]}%`;
			return {
				key: splitData[0],
				operator: queryOperator,
				value: splitData[1]
			};
		}
	}
};