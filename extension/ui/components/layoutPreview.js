/*
 * Switch Layout Tiling
 *
 * Copyright (C) 2026  shimamu
 *
 * https://github.com/shimamu/switch-layout-tiling
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import St from 'gi://St';
import { isNoLayout } from '../../logic/layoutOperations.js';
import { LayoutConverter } from '../../logic/layoutPatterns.js';


const HEX_RADIX = 16;
const COLOR_MAX = 255;

const hexToUnitFloat = (hexPair) => parseInt(hexPair, HEX_RADIX) / COLOR_MAX;

const setColorFromHexIO = (drawingContext, colorHex, alpha = 1.0) => {
  const r = hexToUnitFloat(colorHex.slice(1, 3));
  const g = hexToUnitFloat(colorHex.slice(3, 5));
  const b = hexToUnitFloat(colorHex.slice(5, 7));
  drawingContext.setSourceRGBA(r, g, b, alpha);
};

const drawFillRectIO = (drawingContext, rectPixel, colorHex) => {
  setColorFromHexIO(drawingContext, colorHex);
  drawingContext.rectangle(rectPixel.x, rectPixel.y, rectPixel.width, rectPixel.height);
  drawingContext.fill();
};

const drawStrokeRectIO = (drawingContext, rectPixel, colorHex, options = {}) => {
  const { lineWidth = 1.0 } = options;
  setColorFromHexIO(drawingContext, colorHex);
  drawingContext.setLineWidth(lineWidth);
  drawingContext.rectangle(rectPixel.x, rectPixel.y, rectPixel.width, rectPixel.height);
  drawingContext.stroke();
};

const drawDashedRectIO = (drawingContext, rectPixel, colorHex, options = {}) => {
  const {
    lineWidth = 1.0,
    dashLength = 2.0,
    dashGap = 2.0,
    dashOffset = 0,
  } = options;

  drawingContext.setDash([dashLength, dashGap], dashOffset);
  drawStrokeRectIO(drawingContext, rectPixel, colorHex, { lineWidth });
  drawingContext.setDash([], 0); // Reset dash pattern
};

const drawTextIO = (
  drawingContext,
  text,
  rectPixel,
  colorHex,
  fontSize,
) => {
  setColorFromHexIO(drawingContext, colorHex);

  drawingContext.selectFontFace(
    'Sans',
    0,
    0
  );
  drawingContext.setFontSize(fontSize);

  const textExtents = drawingContext.textExtents(text);
  const x = rectPixel.x
    + (rectPixel.width - textExtents.width) / 2
    - textExtents.xBearing;
  const y = rectPixel.y
    + (rectPixel.height - textExtents.height) / 2
    - textExtents.yBearing;

  drawingContext.moveTo(x, y);
  drawingContext.showText(text);
};


export class LayoutPreview {
  static #BASE_WIDTH = 16;
  static #BASE_HEIGHT = 9;
  static #SCALE = 3;
  static #WIDTH = LayoutPreview.#BASE_WIDTH * LayoutPreview.#SCALE;
  static #HEIGHT = LayoutPreview.#BASE_HEIGHT * LayoutPreview.#SCALE;

  static #WINDOW_COLOR = '#ffffff';
  static #SPLIT_COLOR = '#36363a';
  static #NONE_COLOR = '#888888';
  static #TEXT_COLOR = '#36363a';

  static #FONT_SIZE = 8;

  constructor(layout) {
    this._layout = layout;

    this._drawingArea = null;

    this._createComponents();
  }

  render(layout) {
    this._layout = layout;
    this._drawingArea.queue_repaint();
  }

  get actor() {
    return this._drawingArea;
  }

  _createComponents() {
    this._drawingArea = new St.DrawingArea({
      width: LayoutPreview.#WIDTH,
      height: LayoutPreview.#HEIGHT,
    });

    this._drawingArea.connect('repaint', () => this._onRepaint());
  }

  _onRepaint() {
    const drawingContext = this._drawingArea.get_context();
    const previewRectPixel = {
      x: 0,
      y: 0,
      width: this._drawingArea.width,
      height: this._drawingArea.height,
    };

    this._drawPreview(drawingContext, previewRectPixel, this._layout);
  }

  _drawPreview(drawingContext, previewRectPixel, layout) {
    if (isNoLayout(layout)) {
      this._drawBlank(drawingContext, previewRectPixel);
    } else {
      this._drawSplitAreas(drawingContext, previewRectPixel, layout);
    }
  }

  _drawBlank(drawingContext, previewRectPixel) {
    drawDashedRectIO(drawingContext, previewRectPixel, LayoutPreview.#NONE_COLOR);
  }

  _drawSplitAreas(drawingContext, previewRectPixel, layout) {
    this._drawBackground(drawingContext, previewRectPixel);

    const layoutConverter = new LayoutConverter();
    layoutConverter.toRectRatios(layout)
      .map(rectRatio => layoutConverter.toRectPixel(rectRatio, previewRectPixel))
      .forEach((rectPixel, index) => {
        this._drawSplitArea(drawingContext, rectPixel, index);
      });
  }

  _drawBackground(drawingContext, previewRectPixel) {
    drawFillRectIO(drawingContext, previewRectPixel, LayoutPreview.#WINDOW_COLOR);
  }

  _drawSplitArea(drawingContext, rectPixel, areaIndex) {
    drawStrokeRectIO(
      drawingContext,
      rectPixel,
      LayoutPreview.#SPLIT_COLOR
    );

    drawTextIO(
      drawingContext,
      String(areaIndex + 1),
      rectPixel,
      LayoutPreview.#TEXT_COLOR,
      LayoutPreview.#FONT_SIZE,
    );
  }
}
