/*
 * Switch Layout Tiling
 *
 * Copyright (C) 2026  shimamu
 *
 * https://github.com/shimamu/switch-layout-tiling
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import * as fn from './functional.js';


const ORIGIN = 0;
const FULL = 1;

export const SPLIT = {
  HALF: [0.5],
  HALF_THEN_HALF: [0.5, 0.5],
  THREE_EQUAL: [0.33, 0.33],
};

function N_(str) {
  return str;
}

export const PATTERN = {
  FULL: N_('full'),
  VERTICAL: N_('vertical'),
  HORIZONTAL: N_('horizontal'),
  VERTICAL_HORIZONTAL_RIGHT: N_('vertical-horizontal-right'),
  VERTICAL_HORIZONTAL_LEFT: N_('vertical-horizontal-left'),
  VERTICAL_VERTICAL: N_('vertical-vertical'),
  HORIZONTAL_VERTICAL_BOTTOM: N_('horizontal-vertical-bottom'),
  HORIZONTAL_VERTICAL_TOP: N_('horizontal-vertical-top'),
  HORIZONTAL_HORIZONTAL: N_('horizontal-horizontal'),
  NONE: N_('none'),
};


const roundRectRatios = rectRatioFactory => (...args) =>
  rectRatioFactory(...args).map(rectRatio =>
    Object.fromEntries(
      Object.entries(rectRatio).map(([key, value]) => [
        key,
        Math.round(value * 100) / 100,
      ]),
    ),
  );

const layoutRectRatioFactoryMap = {
  [PATTERN.FULL]: roundRectRatios(() => [
    { x: ORIGIN, y: ORIGIN, width: FULL, height: FULL }
  ]),

  [PATTERN.VERTICAL]: roundRectRatios((splitRatios = SPLIT.HALF) => {
    const [width1] = splitRatios;
    return [
      { x: ORIGIN, y: ORIGIN, width: width1,        height: FULL },
      { x: width1, y: ORIGIN, width: FULL - width1, height: FULL },
    ];
  }),

  [PATTERN.HORIZONTAL]: roundRectRatios((splitRatios = SPLIT.HALF) => {
    const [height1] = splitRatios;
    return [
      { x: ORIGIN, y: ORIGIN,  width: FULL, height: height1 },
      { x: ORIGIN, y: height1, width: FULL, height: FULL - height1 },
    ];
  }),

  [PATTERN.VERTICAL_HORIZONTAL_RIGHT]: roundRectRatios((splitRatios = SPLIT.HALF_THEN_HALF) => {
    const [width1, height1] = splitRatios;
    return [
      { x: ORIGIN, y: ORIGIN,  width: width1,        height: FULL },
      { x: width1, y: ORIGIN,  width: FULL - width1, height: height1 },
      { x: width1, y: height1, width: FULL - width1, height: FULL - height1 },
    ];
  }),

  [PATTERN.VERTICAL_HORIZONTAL_LEFT]: roundRectRatios((splitRatios = SPLIT.HALF_THEN_HALF) => {
    const [width1, height1] = splitRatios;
    return [
      { x: ORIGIN, y: ORIGIN,  width: width1,        height: height1 },
      { x: width1, y: ORIGIN,  width: FULL - width1, height: FULL },
      { x: ORIGIN, y: height1, width: width1,        height: FULL - height1 },
    ];
  }),

  [PATTERN.VERTICAL_VERTICAL]: roundRectRatios((splitRatios = SPLIT.THREE_EQUAL) => {
    const [width1, width2] = splitRatios;
    return [
      { x: ORIGIN,          y: ORIGIN, width: width1,                 height: FULL },
      { x: width1,          y: ORIGIN, width: width2,                 height: FULL },
      { x: width1 + width2, y: ORIGIN, width: FULL - width1 - width2, height: FULL },
    ];
  }),

  [PATTERN.HORIZONTAL_VERTICAL_BOTTOM]: roundRectRatios((splitRatios = SPLIT.HALF_THEN_HALF) => {
    const [height1, width1] = splitRatios;
    return [
      { x: ORIGIN, y: ORIGIN,  width: FULL,          height: height1 },
      { x: width1, y: height1, width: FULL - width1, height: FULL - height1 },
      { x: ORIGIN, y: height1, width: width1,        height: FULL - height1 },
    ];
  }),

  [PATTERN.HORIZONTAL_VERTICAL_TOP]: roundRectRatios((splitRatios = SPLIT.HALF_THEN_HALF) => {
    const [height1, width1] = splitRatios;
    return [
      { x: ORIGIN, y: ORIGIN,  width: width1,        height: height1 },
      { x: width1, y: ORIGIN,  width: FULL - width1, height: height1 },
      { x: ORIGIN, y: height1, width: FULL,          height: FULL - height1 },
    ];
  }),

  [PATTERN.HORIZONTAL_HORIZONTAL]: roundRectRatios((splitRatios = SPLIT.THREE_EQUAL) => {
    const [height1, height2] = splitRatios;
    return [
      { x: ORIGIN, y: ORIGIN,            width: FULL, height: height1 },
      { x: ORIGIN, y: height1,           width: FULL, height: height2 },
      { x: ORIGIN, y: height1 + height2, width: FULL, height: FULL - height1 - height2 },
    ];
  }),
};

const rectRatioCountOf = rectRatioFactory => {
  const rectRatios = rectRatioFactory();
  return Array.isArray(rectRatios) ? rectRatios.length : 0;
};

export const patternsForSplitAreaCount = splitAreaCount =>
  Object.entries(layoutRectRatioFactoryMap)
    .filter(([_, rectRatioFactory]) => rectRatioCountOf(rectRatioFactory) === splitAreaCount)
    .map(([pattern]) => pattern);

const clamp01 = fn.clamp(0, 1);


export class LayoutConverter {
  static NO_RECTS = 0;

  static splitLineCountOf(splitAreaCount) {
    return splitAreaCount - 1;
  }

  constructor() {
    this._rectRatioFactoryMap = layoutRectRatioFactoryMap;
  }

  toRectRatios(layout) {
    if (!layout)
      return undefined;

    const { pattern, splitRatios } = layout;
    if (!pattern)
      return undefined;

    const rectRatioFactory = this._rectRatioFactoryMap[pattern];
    if (!rectRatioFactory)
      return undefined;

    return rectRatioFactory(splitRatios);
  }

  toRectPixel(rectRatio, areaPixel) {
    const x = Math.round(areaPixel.x + clamp01(rectRatio.x) * areaPixel.width);
    const y = Math.round(areaPixel.y + clamp01(rectRatio.y) * areaPixel.height);
    const availableWidth = areaPixel.x + areaPixel.width - x;
    const availableHeight = areaPixel.y + areaPixel.height - y;
    const width = Math.min(Math.round(clamp01(rectRatio.width) * areaPixel.width), availableWidth);
    const height = Math.min(Math.round(clamp01(rectRatio.height) * areaPixel.height), availableHeight);

    return { x, y, width, height };
  }
}
