import { head, isUndefined } from 'lodash';
import path from 'path';
import fs from 'fs';
import cv from 'opencv4nodejs';
import { mean, sum } from 'mathjs';
import cliProgress from 'cli-progress';

import Backpropagation, { Dataset, normalizeData } from './helpers/Backpropagation';
import { toleransiError, learningRate } from './configs/backpropagation';

interface CharPercentage {
	[key: string]: number;
}

try {
	(async () => {
		let outputs: string[] = [];
		const trainingData: Dataset[] = [];

		const datasetPath = path.resolve('characters');
		if (fs.existsSync(datasetPath)) {
			outputs = fs.readdirSync(datasetPath).filter(item => !RegExp('(^|\\/)\\.[^\\/\\.]+', 'g').test(item));
		}

		for (const char of outputs) {
			const charPath = path.join(datasetPath, char);
			if (fs.existsSync(charPath)) {
				const files = fs.readdirSync(charPath).filter(item => !RegExp('(^|\\/)\\.[^\\/\\.]+', 'g').test(item));

				for (const fileName of files) {
					const filePath = path.join(charPath, fileName);
					trainingData.push({
						filePath,
						output: char
					});
				}
			}
		}

		const selectedData = head(trainingData)!;
		const inputData = normalizeData(await cv.imreadAsync(selectedData.filePath));

		let error = 1;
		let epoch = 1;
		let lowest = 1;
		const backpro = new Backpropagation(inputData.length, [50, 50], outputs);

		console.log('start');
		while (!(error <= toleransiError)) {
			const dataset = trainingData.slice().sort(() => Math.random() - 0.5);
			const tempError = [];
			console.log('Initializing dataset');
			const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
			bar.start(dataset.length, 0);
			for (const [idx, data] of dataset.entries()) {
				const inputData = normalizeData(await cv.imreadAsync(data.filePath));
				error = backpro.train(inputData, data.output, learningRate);
				tempError.push(error);
				bar.update(idx + 1);
			}
			error = mean(tempError);
			bar.stop();
			console.log(`Epoch ${epoch}: ${error}`);
			if (error < lowest) {
				lowest = error;
				backpro.save();
			}
			epoch++;
		}

		const correct: CharPercentage = {};
		const incorrect: CharPercentage = {};

		for (const char of Object.keys(correct)) {
			console.log(`${char}\t ${correct[char] / (correct[char] + incorrect[char]) * 100}`);
		}
		for (const data of trainingData) {
			const inputData = normalizeData(await cv.imreadAsync(data.filePath));
			const { output } = backpro.feedforward(inputData);
			const result = (output.toArray() as number[][]).map(item => item[0]);

			const charResult = outputs[result.indexOf(Math.max(...result))];
			if (isUndefined(correct[data.output])) correct[data.output] = 0;
			if (isUndefined(incorrect[data.output])) incorrect[data.output] = 0;
			if (data.output == charResult) correct[data.output]++;
			else incorrect[data.output]++;
		}

		const correctTotal = sum(Object.values(correct as CharPercentage));
		const incorrectTotal = sum(Object.values(incorrect as CharPercentage));
		console.log(`Correct: ${correctTotal}\t ${correctTotal / trainingData.length * 100}`);
		console.log(`Incorrect: ${incorrectTotal}\t ${incorrectTotal / trainingData.length * 100}`);
		console.log('Stop');
	})();
} catch (e) {
	console.log(e);
}