import { last, head, findLastIndex } from 'lodash';
import { table, getBorderCharacters, TableUserConfig } from 'table';
import {
  matrix,
  random,
  subtract,
  add,
  Matrix,
  multiply,
  exp,
  map,
  mean,
  abs,
  pow,
  transpose
} from 'mathjs';

const tableConfig: TableUserConfig = {
  border: getBorderCharacters('norc')
}

export default class Backpropagation {
  private outputs: string[];
  private weights: Matrix[] = [];
  private bias: Matrix[] = [];

  /**
   * Initialize backpropagation neural network
   * @param inputNode Number of input neuron
   * @param hiddenNodes Array of hidden layers neuron number
   * @param outputs Outputs
   */
  constructor(inputNode: number, hiddenNodes: number[], outputs: string[]) {
    this.outputs = outputs;
    for (const [idx, nodes] of hiddenNodes.entries()) {
      const previousNode = idx == 0 ? inputNode : hiddenNodes[idx - 1];
      const hiddenWeights = subtract(matrix(random([nodes, previousNode], 0, 2)), 1) as Matrix;
      this.weights.push(hiddenWeights);

      const hiddenBias = matrix(random([nodes, 1]));
      this.bias.push(hiddenBias);
    }

    const outputWeights = subtract(matrix(random([this.outputs.length, last(hiddenNodes)!], 0, 2)), 1) as Matrix;
    this.weights.push(outputWeights);

    const outputBias = matrix(random([this.outputs.length, 1]));
    this.bias.push(outputBias);
  }

  /**
   * Activation function
   * @param x Number
   * @param derivative Toggle to derivative
   */
  activation(x: number, derivative = false) {
    return derivative ? x * (1 - x) : 1 / (1 + exp(-x));
  }

  /**
   * Calculate output layer and hidden layer
   * @param inputArray Input data
   */
  feedforward(inputArray: number[]) {
    const input = matrix(inputArray).resize([inputArray.length, 1]);
    const hiddens: Matrix[] = [];
    let output = matrix();

    for (const [idx, weight] of this.weights.entries()) {
      const previousLayer = idx == 0 ? input : output;
      output = multiply(weight, previousLayer);
      output = add(output.toArray(), this.bias[idx]) as Matrix;
      // Activation
      output = map(output, (x) => this.activation(x));

      if (idx != findLastIndex(this.weights)) hiddens.push(output)
    }

    return { input, hiddens, output };
  }

  /**
   * Train to adjust weight
   * @param inputArray Input data
   * @param targetArray Target
   * @param learningRate Learning rate
   */
  train(inputArray: number[], targetArray: string, learningRate: number) {
    const { input, hiddens, output } = this.feedforward(inputArray);

    const targets = matrix(this.outputs.map(output => output === targetArray ? [1] : [0]));
    const outputErrors = subtract(targets, output) as Matrix;
    let hiddenErrors: Matrix[] = [];
    let corrections: Matrix[] = [];
    let newBias: Matrix[] = [];
    let newWeight: Matrix[] = [];

    for (let i = findLastIndex(this.weights); i >= 0; i--) {
      const currentOutput = (i == findLastIndex(this.weights)) ? output : hiddens[i];
      const previousError = (i == findLastIndex(this.weights)) ? outputErrors : multiply(transpose(this.weights[i + 1]), head(corrections)!);

      if (i != findLastIndex(this.weights)) hiddenErrors = [previousError, ...hiddenErrors];

      const errorCorrection = map(previousError, (_, index) => {
        const [row, col] = index;
        const error = previousError.toArray() as number[][];
        const output = currentOutput.toArray() as number[][];

        return error[row][col] * this.activation(output[row][col]);
      });
      corrections = [errorCorrection, ...corrections];

      const oldBias = this.bias[i];
      const bias = add(oldBias, multiply(learningRate, errorCorrection)) as Matrix;
      newBias = [bias, ...newBias];

      const previousLayer = (i == 0) ? input : hiddens[i - 1];
      const oldWeight = this.weights[i];
      const weight = add(oldWeight, multiply(multiply(learningRate, errorCorrection), transpose(previousLayer))) as Matrix;
      newWeight = [weight, ...newWeight];
    }

    this.bias = newBias;
    this.weights = newWeight;

    const MSE = pow(mean(abs(outputErrors)), 2) as number;
    return MSE;

    // // PRINT TABLE
    // console.log(table([['INPUT LAYER'], ...input.toArray() as any], tableConfig));
    // for (const [id, hidden] of hiddens.entries()) {
    //   console.log(table([
    //     ['HIDDEN LAYER', 'ERROR'],
    //     ...(hidden.toArray() as any[]).map((item, idx) => {
    //       return [...item, ...(hiddenErrors[id].toArray() as any[])[idx]];
    //     })
    //   ], tableConfig));
    // }
    // console.log(table([
    //   ['OUTPUT LAYER', 'ERROR'],
    //   ...(output.toArray() as any[]).map((item, idx) => {
    //     return [...item, ...(outputErrors.toArray() as any[])[idx]];
    //   })
    // ], tableConfig));
  }
}