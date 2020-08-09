import path from 'path';
import fs from 'fs';

export const toleransiError = 0.0005;
export const learningRate = 0.001;
export const hiddenLayer = [50, 50];

// Load list of characters
const datasetPath = path.resolve('characters');
export const charList = fs.existsSync(datasetPath) ? fs.readdirSync(datasetPath).filter(item => !RegExp('(^|\\/)\\.[^\\/\\.]+', 'g').test(item)) : [];