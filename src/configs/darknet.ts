import { Darknet } from 'darknet';
import path from 'path';

// Load darknet model
const darknetConfig = './src/configs/model.cfg';
const darknetWeights = './src/configs/model.weights';

export const darknet = new Darknet({
	weights: path.join(process.cwd(), darknetWeights),
	config: path.join(process.cwd(), darknetConfig),
	names: ['plate']
});