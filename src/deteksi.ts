import { head, sample, result } from 'lodash';
import path from 'path';
import fs from 'fs';
import cv, { Mat } from 'opencv4nodejs';
import { mean } from 'mathjs';
import cliProgress from 'cli-progress';

import PlateDetection from './helpers/PlateDetection';
import Backpropagation from './helpers/Backpropagation';

interface Dataset {
	filePath: string,
	output: string
}

const normalizeData = (data: Mat) => {
	const result: number[] = [];
	data.getDataAsArray().map(rowData => {
		rowData.map(colData => {
			result.push(colData);
		});
	});

	return result;
};

try {
	(async () => {
		// const testImage = './testing/10.jpg';
		// const detection = new PlateDetection(testImage);
		// const detected = await detection.detect();

		// // Normalize
		// const detectedChars = detected.map(item => {
		//   const result: number[] = [];
		//   item.getDataAsArray().map(rowData => {
		//     rowData.map(colData => {
		//       result.push(colData);
		//     });
		//   });
		// });

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
					// const image = await cv.imreadAsync(filePath);
					trainingData.push({
						filePath,
						output: char
					});
				}
			}
		}

		const selectedData = head(trainingData)!;
		const inputData = normalizeData(await cv.imreadAsync(selectedData.filePath));

		const toleransi = 0.001;
		const learningRate = 0.06;
		let error = 1;
		let epoch = 1;
		let lowest = 1;
		// const iterasi = 1000000;

		const backpro = new Backpropagation(inputData.length, [547], outputs);
		// backpro.load();

		// console.log('start');
		// while (!(error <= toleransi)) {
		//   if (epoch == 1) {
		//     console.log('Initializing dataset');
		//     const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
		//     bar.start(trainingData.length, 0);
		//     for (let [idx, data] of trainingData.entries()) {
		//       const inputData = normalizeData(await cv.imreadAsync(data.filePath));
		//       error = backpro.train(inputData, data.output, learningRate);
		//       bar.update(idx+1);
		//     }
		//     bar.stop();
		//   }
		//   const data = sample(trainingData)!;
		//   const inputData = normalizeData(await cv.imreadAsync(data.filePath));
		//   error = backpro.train(inputData, data.output, learningRate);
		//   console.log(`Epoch ${epoch}: ${error}`);
		//   epoch++;
		// };

		// console.log('start');
		// while (!(error <= toleransi)) {
		// 	if (epoch == 1) {
		// 		let tempError: number[] = [];
		// 		for (const char of outputs) {
		// 			const data = sample(trainingData.filter(item => item.output == char))!;
		// 			const inputData = normalizeData(await cv.imreadAsync(data.filePath));
		// 			tempError.push(backpro.train(inputData, data.output, learningRate));
		// 		}
		// 		error = mean(tempError);
		// 		tempError = [];
		// 	} else {
		// 		  const data = sample(trainingData)!;
		// 		  const inputData = normalizeData(await cv.imreadAsync(data.filePath));
		// 		  error = backpro.train(inputData, data.output, learningRate);
		// 	}
		// 	console.log(`Epoch ${epoch}: ${error}`);
		// 	epoch++;
		// 	if (error < lowest) {
		// 		lowest = error;
		// 		backpro.save();
		// 	}
		// };
		const dataset = trainingData.slice().sort(() => Math.random() - 0.5);
		console.log('start');
		while (!(error <= toleransi)) {
			if (false) {
				console.log('Initializing dataset');
				const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
				bar.start(dataset.length, 0);
				for (let [idx, data] of dataset.entries()) {
					const inputData = normalizeData(await cv.imreadAsync(data.filePath));
					error = backpro.train(inputData, data.output, learningRate);
					bar.update(idx + 1);
				}
				bar.stop();
			} else {
				const data = dataset[(epoch - 1) % dataset.length];
				const inputData = normalizeData(await cv.imreadAsync(data.filePath));
				error = backpro.train(inputData, data.output, learningRate);
			}
			console.log(`Epoch ${epoch}: ${error}`);
			epoch++;
			if (error < lowest) {
				lowest = error;
				backpro.save();
			}
		};

		let correct = 0;
		let incorrect = 0;
		backpro.load();
		for (const data of trainingData) {
			const inputData = normalizeData(await cv.imreadAsync(data.filePath));
			const { output } = backpro.feedforward(inputData);
			const result = (output.toArray() as number[][]).map(item => item[0]);

			const charResult = outputs[result.indexOf(Math.max(...result))];
			if (data.output == charResult) correct++;
			else incorrect++;
			console.log(`Target: [${data.output}]\t Output: ${charResult}`);
		}

		console.log(`Correct: ${correct}\t ${correct / trainingData.length * 100}`);
		console.log(`Inorrect: ${incorrect}\t ${incorrect / trainingData.length * 100}`);
		console.log('Stop');
	})();
} catch (e) {
	console.log(e);
}