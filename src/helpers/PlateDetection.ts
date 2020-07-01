import path from 'path';
import {
  minBy,
  maxBy,
  mean
} from 'lodash';
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
  Contour,
  Vec3,
  CV_8S
} from 'opencv4nodejs';

import { darknet } from '../configs/darknet';

/**
 * Contain Automatic License Plate Recognition process
 */
export default class PlateDetection {
  private imagePath!: string;
  private foundPlate: Mat[] = [];

  /**
   * PlateDetection constructor
   * @param imagePath image file directory
   */
  constructor(imagePath: string) {
    this.imagePath = path.resolve(imagePath);
  }

  async detect() {
    await this.localization();
    await this.segmentation();
  }

  /**
   * License Plate Localization
   */
  async localization() {
    const detectedPlates = darknet.detect(path.resolve(this.imagePath));
    const rgbImage = await cv.imreadAsync(this.imagePath); // Load Image

    for (const plate of detectedPlates) {
      let { box: { x, y, h: height, w: width } } = plate;
      x = x - (width / 2);
      y = y - (height / 2);
      const rect = new Rect(x, y, width, height);
      // rgbImage.drawRectangle(rect, new Vec3(0, 0, 255));
      this.foundPlate.push(rgbImage.getRegion(rect));
    }

    return this.foundPlate;
  }

  /**
   * Convert BGR image to binary image
   * @param image OpenCV image matrix
   * @param blur Apply blur filter
   */
  async convertToBinary(image: Mat, blur = true) {
    const hsvImage = (await image.cvtColorAsync(COLOR_BGR2HSV)).splitChannels();
    const grayImage = hsvImage[2];
    const blurImage = blur ? await grayImage.bilateralFilterAsync(11, 17, 17) : grayImage;
    const binary = await blurImage.thresholdAsync(180, 255, THRESH_BINARY + THRESH_OTSU);
    return binary;
  }

  /**
   * Get filtered contours of license plate characters
   * @param image OpenCV image matrix
   * @param filter Filter contour ratio and height
   */
  async getContours(image: Mat, filter = true) {
    const binary = await this.convertToBinary(image);

    const contours = await binary.copy().findContoursAsync(RETR_EXTERNAL, CHAIN_APPROX_SIMPLE);
    const meanHeight = mean(contours.map(contour => contour.boundingRect().height)) / image.rows;

    let filteredContours = !filter ? contours : contours
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
  async perspectiveTransform(image: Mat) {
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
  async segmentation() {
    const resultImage = this.foundPlate[0];
    const warped = await this.perspectiveTransform(resultImage);

    const kernel = new Mat([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]], CV_8S)
    const sharpened = await warped.filter2DAsync(-1, kernel);

    const binaryWarped = await this.convertToBinary(sharpened, false);
    const filteredContours = await this.getContours(warped, false);

    const regions: Mat[] = [];
    for (const contour of filteredContours) {
      const { width, height, x, y } = contour.boundingRect();
      regions.push(binaryWarped.getRegion(contour.boundingRect()));
      // Draw bounding box
      sharpened.drawRectangle(new Point2(x, y), new Point2(x + width, y + height), new Vec3(0, 0, 255), 1);
    }
    await cv.imwriteAsync('./tmp/result2.jpg', regions[0]);
  }
}