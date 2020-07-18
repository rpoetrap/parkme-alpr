import { Darknet } from 'darknet';
import path from 'path';

// Load darknet model
const darknetConfig = './model.cfg';
const darknetWeights = './model.weights';

export const darknet = new Darknet({
	weights: path.join(__dirname, darknetWeights),
	config: path.join(__dirname, darknetConfig),
	names: ['plate']
});