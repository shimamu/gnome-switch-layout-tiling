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
import { PATTERN } from './layoutPatterns.js';


export const MAX_SPLIT_AREA_COUNT = 3;
export const MIN_EDITABLE_SPLIT_AREA_COUNT = 2;

export const isNoLayout = (layout) => !layout || layout.pattern === PATTERN.NONE;

export function addLayoutMap(layoutMaps, newLayoutMap) {
  return fn.deepFreeze([...layoutMaps, newLayoutMap]);
}

export const layoutMapOf = (layoutMaps, layoutMapIndex) => layoutMaps[layoutMapIndex];

export const layoutOf = (layoutMap, splitAreaCount) => layoutMap[splitAreaCount];

export const patternOf = (layout) => layout?.pattern ?? PATTERN.NONE;

export const splitRatioOf = (layout, index, defaultRatio = 0.5) =>
  layout?.splitRatios?.[index] ?? defaultRatio;

export function removeLayoutMap(layoutMaps, index) {
  return fn.deepFreeze(layoutMaps.filter((_, i) => i !== index));
}

export function swapLayoutMapOrder(layoutMaps, index1, index2) {
  // fn.update() performs a deep copy, but only the array structure changes here.
  const copy = [...layoutMaps];
  [copy[index1], copy[index2]] = [copy[index2], copy[index1]];

  return fn.deepFreeze(copy);
}

export function updateLayoutMaps(layoutMaps, index, newLayoutMap) {
  // fn.update() performs a deep copy, but only the array structure changes here.
  const copy = [...layoutMaps];
  copy[index] = newLayoutMap;

  return fn.deepFreeze(copy);
}

export const updateLayoutMap = (layoutMap, splitAreaCount, newLayout) =>
  fn.update(layoutMap, splitAreaCount, newLayout);

export const countEnabledLayouts = (layoutMap) => {
  return Object.values(layoutMap)
    .filter(layout => !isNoLayout(layout))
    .length;
};
