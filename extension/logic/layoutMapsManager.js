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
import { addLayoutMap, layoutMapOf, removeLayoutMap, swapLayoutMapOrder,
  updateLayoutMaps } from './layoutOperations.js';
import { logger } from '../io/logger.js';
import { loadLayoutMapsRaw, saveLayoutMapsRaw } from '../io/settings.js';
import { PATTERN, SPLIT } from './layoutPatterns.js';


const INITIAL_LAYOUT_MAPS = fn.deepFreeze([
  {
    1: { pattern: PATTERN.FULL },
    2: { pattern: PATTERN.VERTICAL, splitRatios: SPLIT.HALF },
    3: { pattern: PATTERN.VERTICAL_HORIZONTAL_RIGHT, splitRatios: SPLIT.HALF_THEN_HALF },
  },
  {
    1: { pattern: PATTERN.FULL },
    2: { pattern: PATTERN.HORIZONTAL, splitRatios: SPLIT.HALF },
    3: { pattern: PATTERN.HORIZONTAL_VERTICAL_BOTTOM, splitRatios: SPLIT.HALF_THEN_HALF },
  },
  {
    1: { pattern: PATTERN.FULL },
    2: { pattern: PATTERN.VERTICAL, splitRatios: SPLIT.HALF },
    3: { pattern: PATTERN.VERTICAL_HORIZONTAL_LEFT, splitRatios: SPLIT.HALF_THEN_HALF },
  },
  {
    1: { pattern: PATTERN.FULL },
    2: { pattern: PATTERN.HORIZONTAL, splitRatios: SPLIT.HALF },
    3: { pattern: PATTERN.HORIZONTAL_VERTICAL_TOP, splitRatios: SPLIT.HALF_THEN_HALF },
  },
  {
    1: { pattern: PATTERN.FULL },
    2: { pattern: PATTERN.VERTICAL, splitRatios: SPLIT.HALF },
    3: { pattern: PATTERN.NONE },
  },
]);

const NEW_LAYOUT_MAP_TEMPLATE = fn.deepFreeze({
  1: { pattern: PATTERN.FULL },
  2: { pattern: PATTERN.VERTICAL, splitRatios: SPLIT.HALF },
  3: { pattern: PATTERN.VERTICAL_HORIZONTAL_RIGHT, splitRatios: SPLIT.HALF_THEN_HALF },
});

export function getInitialLayoutMaps() {
  return INITIAL_LAYOUT_MAPS;
}

export function createNewLayoutMap() {
  return NEW_LAYOUT_MAP_TEMPLATE;
}


export class LayoutMapsManager {
  static MAX_LAYOUT_COUNT = 50;

  constructor(settings) {
    this._settings = settings;
    this._layoutMaps = null;
  }

  load() {
    try {
      const layoutMaps = loadLayoutMapsRaw(this._settings);

      if (Array.isArray(layoutMaps) && layoutMaps.length > 0) {
        logger.info('layoutMaps loaded');
        this._layoutMaps = layoutMaps;
        return layoutMaps;
      }
      logger.info('layoutMaps is empty, using default layoutMaps');
    } catch (error) {
      logger.error(`Failed to load layoutMaps from settings: ${error}`);
    }

    this._layoutMaps = getInitialLayoutMaps();

    return this._layoutMaps;
  }

  save() {
    try {
      saveLayoutMapsRaw(this._settings, this._layoutMaps);
    } catch (error) {
      logger.error(`Failed to save layoutMaps: ${error}`);
    }
  }

  getLayoutMaps() {
    return this._layoutMaps;
  }

  getLayoutMap(index) {
    return layoutMapOf(this._layoutMaps, index);
  }

  addNewLayoutMap() {
    if (this.isFull()) {
      return;
    }

    const layoutMap = createNewLayoutMap();
    this._layoutMaps = addLayoutMap(this._layoutMaps, layoutMap);
    return layoutMap;
  }

  updateLayoutMap(index, newLayoutMap) {
    this._layoutMaps = updateLayoutMaps(this._layoutMaps, index, newLayoutMap);
  }

  swap(sourceIndex, targetIndex) {
    if (this.isOutOfRange(targetIndex))
      return false;

    this._layoutMaps = swapLayoutMapOrder(this._layoutMaps, sourceIndex, targetIndex);

    return true;
  }

  remove(index) {
    this._layoutMaps = removeLayoutMap(this._layoutMaps, index);
  }

  isOutOfRange(index) {
    return index < 0 || index >= this._layoutMaps.length;
  }

  isFull() {
    return this._layoutMaps.length >= LayoutMapsManager.MAX_LAYOUT_COUNT;
  }
}
