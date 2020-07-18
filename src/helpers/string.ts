import { isEmpty } from 'lodash';
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