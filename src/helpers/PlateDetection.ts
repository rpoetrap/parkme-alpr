import path from 'path';
import { minBy, maxBy, mean } from 'lodash';
import cv, {
	Mat,
	Rect,
	COLOR_BGR2HSV,
	THRESH_BINARY,
	THRESH_OTSU,
	RETR_EXTERNAL,
	CHAIN_APPROX_SIMPLE,
	Point2,
	Size,
	Vec3,
	CV_8S,
	CV_8U
} from 'opencv4nodejs';
import Jimp from 'jimp';

import { darknet } from '../configs/darknet';
import { max, divide, multiply, round, ones } from 'mathjs';

/**
 * Contain Automatic License Plate Recognition process
 */
export default class PlateDetection {
	private imagePath: string;
	private imageBuffer: Buffer;
	private foundPlate: Mat[] = [];

	/**
   * PlateDetection constructor
   * @param image image file directory
   */
	constructor(image: string | Buffer) {
		if (image instanceof Buffer) this.imageBuffer = image;
		else this.imagePath = path.resolve(image);
	}

	/**
   * Detect license plate and return segmented characters with OpenCV Mat format
   */
	async detect() {
		try {
			await this.localization();
			if (this.foundPlate.length == 0) throw new Error('No plate detected');
			console.log('detected');
			const result = await this.segmentation(this.foundPlate[0]);
			return result;
		} catch {
			return [];
		}
	}

	/**
   * License Plate Localization
   */
	private async localization() {
		const imageRead = this.imageBuffer ? Jimp.read(this.imageBuffer) : Jimp.read(this.imagePath);
		const image = await imageRead.then(image => {
			const res = [
				image.getHeight(),
				image.getWidth(),
			];
			const targetSize = 720;
			const scale = targetSize / max(res);
			return image.scale(scale);
		});
		const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
		const rgbImage = await cv.imdecodeAsync(buffer);
		// const rgbImage = await cv.imreadAsync(this.imagePath); // Load Image
		cv.imwriteAsync('./tmp/plate.jpg', rgbImage);
		const detectedPlates = darknet.detect(rgbImage);

		for (const plate of detectedPlates) {
			const { box: { h: height, w: width } } = plate;
			let { box: { x, y } } = plate;
			x = x - (width / 2);
			y = y - (height / 2);
			const rect = new Rect(x, y, width, height);
			// rgbImage.drawRectangle(rect, new Vec3(0, 0, 255));
			this.foundPlate.push(rgbImage.getRegion(rect));
		}

		for (const [idx] of Object.entries(this.foundPlate)) {
			cv.imwriteAsync(`./tmp/plate-${idx}.jpg`, this.foundPlate[idx]);
		}
		return this.foundPlate;
	}

	/**
   * Convert BGR image to binary image
   * @param image OpenCV image matrix
   * @param blur Apply blur filter
   */
	private async convertToBinary(image: Mat, thresh = 180, blur = true) {
		const hsvImage = (await image.cvtColorAsync(COLOR_BGR2HSV)).splitChannels();
		const grayImage = hsvImage[2];
		const blurImage = blur ? await grayImage.bilateralFilterAsync(11, 17, 17) : grayImage;
		const binary = await blurImage.thresholdAsync(thresh, 255, THRESH_BINARY + THRESH_OTSU);
		return binary;
	}

	/**
   * Get filtered contours of license plate characters
   * @param image OpenCV image matrix
   * @param filter Filter contour ratio and height
   */
	private async getContours(image: Mat, filter = true) {
		const binary = await this.convertToBinary(image);

		const contours = await binary.copy().findContoursAsync(RETR_EXTERNAL, CHAIN_APPROX_SIMPLE);
		const meanHeight = mean(contours.map(contour => contour.boundingRect().height)) / image.rows;

		const filteredContours = !filter ? contours : contours
			.filter(contour => {
				const { width, height } = contour.boundingRect();
				const ratio = height / width;
				return (ratio > 1 && ratio <= 3.5 && (height / image.rows) >= meanHeight);
			});

		return filteredContours.sort((a, b) => a.boundingRect().x - b.boundingRect().x);
	}

	/**
   * Calculates a perspective transform
   * @param image OpenCV image matrix
   */
	private async perspectiveTransform(image: Mat) {
		const resultImage = await image.copyAsync();
		const filteredContours = await this.getContours(resultImage);
		const first = minBy(filteredContours, contour => contour.boundingRect().x)!.boundingRect();
		const last = maxBy(filteredContours, contour => contour.boundingRect().x)!.boundingRect();

		const tl = new Point2(first.x, first.y);
		const tr = new Point2((last.x + last.width), last.y);
		const br = new Point2((last.x + last.width), (last.y + last.height));
		const bl = new Point2(first.x, (first.y + first.height));

		const widthA = Math.sqrt(((br.x - bl.x) ** 2) + ((br.y - bl.y) ** 2));
		const widthB = Math.sqrt(((tr.x - tl.x) ** 2) + ((tr.y - tl.y) ** 2));
		const maxWidth = maxBy([widthA, widthB])!;

		const heightA = Math.sqrt(((tr.x - br.x) ** 2) + ((tr.y - br.y) ** 2));
		const heightB = Math.sqrt(((tl.x - bl.x) ** 2) + ((tl.y - bl.y) ** 2));
		const maxHeight = maxBy([heightA, heightB])!;

		const srcPoints = [tl, tr, br, bl,];

		const dstPoints = [
			new Point2(0, 0),
			new Point2((maxWidth - 1), 0),
			new Point2((maxWidth - 1), (maxHeight - 1)),
			new Point2(0, (maxHeight - 1)),
		];

		const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
		const warped = await resultImage.warpPerspectiveAsync(M, new Size(maxWidth, maxHeight));

		return warped;
	}

	/**
   * Character Segmentation
   */
	async segmentation(resultImage: Mat) {
		const warped = await this.perspectiveTransform(resultImage);

		const kernel = new Mat([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]], CV_8S);
		const sharpened = await warped.filter2DAsync(-1, kernel);

		const binaryWarped = await this.convertToBinary(warped, 50, false);
		const kernelMorph = new Mat(ones([1, 2]) as number[][], CV_8S);
		const morphed = await binaryWarped
			.morphologyExAsync(kernelMorph, cv.MORPH_CLOSE);
		cv.imwriteAsync('./tmp/sharpened.jpg', morphed);
		const filteredContours = await this.getContours(warped, false);

		const regions: Mat[] = [];
		for (const contour of filteredContours) {
			const { width, height, x, y } = contour.boundingRect();
			regions.push(morphed.getRegion(contour.boundingRect()));
			// Draw bounding box
			sharpened.drawRectangle(new Point2(x, y), new Point2(x + width, y + height), new Vec3(0, 0, 255), 1);
		}

		const resizedRegion: Mat[] = [];
		for (const region of regions) {
			resizedRegion.push(await this.resizeImage(region));
		}
		for (const [idx, detected] of regions.entries()) {
			const filledImage = await this.resizeImage(detected);
			cv.imwriteAsync(`./tmp/char-${idx}.jpg`, filledImage);
		}
		return resizedRegion;
	}

	/**
   * Resize segmented character to square image
   * @param image Character image based on OpenCV Mat
   */
	private async resizeImage(image: Mat) {
		let rows: number;
		let cols: number;
		const targetSize = 28;
		const padding = 6;

		const dims = image.sizes;
		[rows, cols] = multiply(divide(dims, max(dims)), (targetSize - padding)) as number[];
		const resizedImage = await image.copy().resizeAsync(round(rows), round(cols));
		[rows, cols] = resizedImage.sizes;

		let filledImage = new Mat(targetSize, targetSize, CV_8U, 0);
		const canvas = filledImage.getDataAsArray();
		const currentImage = resizedImage.getDataAsArray();

		const startRow = round((targetSize / 2) - (rows / 2));
		const startCol = round((targetSize / 2) - (cols / 2));

		for (let row = startRow; row < (startRow + rows); row++) {
			for (let col = startCol; col < (startCol + cols); col++) {
				canvas[row][col] = currentImage[row - startRow][col - startCol];
			}
		}
		filledImage = new Mat(canvas, CV_8U);

		return filledImage;
	}
}