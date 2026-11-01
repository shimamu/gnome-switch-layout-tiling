/*
 * Switch Layout Tiling
 *
 * Copyright (C) 2026  shimamu
 *
 * https://github.com/shimamu/switch-layout-tiling
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { describe, expect, it } from 'vitest';

import {
  MAX_SPLIT_AREA_COUNT,
  MIN_EDITABLE_SPLIT_AREA_COUNT,
  addLayoutMap,
  countEnabledLayouts,
  isNoLayout,
  layoutMapOf,
  layoutOf,
  patternOf,
  removeLayoutMap,
  splitRatioOf,
  swapLayoutMapOrder,
  updateLayoutMap,
  updateLayoutMaps,
} from '../../extension/logic/layoutOperations.js';

import { PATTERN } from '../../extension/logic/layoutPatterns.js';

describe('layoutOperations', () => {
  const layoutMap1 = {
    1: { pattern: PATTERN.FULL, splitRatios: [] },
    2: { pattern: PATTERN.VERTICAL, splitRatios: [0.5] },
    3: { pattern: PATTERN.VERTICAL_VERTICAL, splitRatios: [0.33, 0.33] },
  };

  const layoutMap2 = {
    1: { pattern: PATTERN.FULL, splitRatios: [] },
    2: { pattern: PATTERN.HORIZONTAL, splitRatios: [0.5] },
    3: { pattern: PATTERN.HORIZONTAL_HORIZONTAL, splitRatios: [0.33, 0.33] },
  };

  const layoutMap3 = {
    1: { pattern: PATTERN.FULL, splitRatios: [] },
    2: { pattern: PATTERN.HORIZONTAL, splitRatios: [0.4] },
    3: { pattern: PATTERN.VERTICAL_HORIZONTAL_RIGHT, splitRatios: [0.6, 0.5] },
  };

  const layoutMaps = [layoutMap1, layoutMap2, layoutMap3];

  describe('constants', () => {
    it('defines the maximum split area count', () => {
      expect(MAX_SPLIT_AREA_COUNT).toBe(3);
    });

    it('defines the minimum editable split area count', () => {
      expect(MIN_EDITABLE_SPLIT_AREA_COUNT).toBe(2);
    });
  });

  describe('isNoLayout', () => {
    it('returns true for undefined', () => {
      expect(isNoLayout(undefined)).toBe(true);
    });

    it('returns true for null', () => {
      expect(isNoLayout(null)).toBe(true);
    });

    it('returns true when the pattern is NONE', () => {
      expect(
        isNoLayout({ pattern: PATTERN.NONE, splitRatios: [] }),
      ).toBe(true);
    });

    it('returns false when the layout has a configured pattern', () => {
      expect(isNoLayout(layoutMap1[2])).toBe(false);
    });

    it('returns false for a layout with a different configured pattern', () => {
      expect(isNoLayout(layoutMap2[3])).toBe(false);
    });
  });

  describe('addLayoutMap', () => {
    it('appends a layout map to the end', () => {
      const result = addLayoutMap(layoutMaps, layoutMap3);

      expect(result).toEqual([...layoutMaps, layoutMap3]);
      expect(result).toHaveLength(4);
    });

    it('does not modify the original array', () => {
      const result = addLayoutMap(layoutMaps, layoutMap3);

      expect(layoutMaps).toHaveLength(3);
      expect(result).not.toBe(layoutMaps);
    });

    it('preserves the layout map structure', () => {
      const result = addLayoutMap(layoutMaps, layoutMap3);

      expect(result[3]).toEqual({
        1: { pattern: PATTERN.FULL, splitRatios: [] },
        2: { pattern: PATTERN.HORIZONTAL, splitRatios: [0.4] },
        3: {
          pattern: PATTERN.VERTICAL_HORIZONTAL_RIGHT,
          splitRatios: [0.6, 0.5],
        },
      });
    });
  });

  describe('layoutMapOf', () => {
    it('returns the layout map at the specified index', () => {
      expect(layoutMapOf(layoutMaps, 0)).toBe(layoutMap1);
      expect(layoutMapOf(layoutMaps, 1)).toBe(layoutMap2);
      expect(layoutMapOf(layoutMaps, 2)).toBe(layoutMap3);
    });

    it('returns undefined for an out-of-range index', () => {
      expect(layoutMapOf(layoutMaps, 3)).toBeUndefined();
    });

    it('returns undefined for a negative index', () => {
      expect(layoutMapOf(layoutMaps, -1)).toBeUndefined();
    });
  });

  describe('layoutOf', () => {
    it('returns the layout for the specified split area count', () => {
      expect(layoutOf(layoutMap1, 1)).toBe(layoutMap1[1]);
      expect(layoutOf(layoutMap1, 2)).toBe(layoutMap1[2]);
      expect(layoutOf(layoutMap1, 3)).toBe(layoutMap1[3]);
    });

    it('returns undefined for a split area count that does not exist', () => {
      expect(layoutOf(layoutMap1, 4)).toBeUndefined();
    });
  });

  describe('patternOf', () => {
    it('returns the configured pattern', () => {
      expect(patternOf(layoutMap1[2])).toBe(PATTERN.VERTICAL);
      expect(patternOf(layoutMap2[2])).toBe(PATTERN.HORIZONTAL);
    });

    it('returns NONE for undefined', () => {
      expect(patternOf(undefined)).toBe(PATTERN.NONE);
    });

    it('returns NONE when the pattern property is missing', () => {
      expect(patternOf({ splitRatios: [0.5] })).toBe(PATTERN.NONE);
    });

    it('returns NONE when the pattern property is null', () => {
      expect(patternOf({ pattern: null, splitRatios: [] })).toBe(PATTERN.NONE);
    });
  });

  describe('splitRatioOf', () => {
    it('returns the split ratio at the specified index', () => {
      expect(splitRatioOf(layoutMap1[2], 0)).toBe(0.5);
      expect(splitRatioOf(layoutMap1[3], 1)).toBe(0.33);
    });

    it('returns the default ratio when the index is out of range', () => {
      expect(splitRatioOf(layoutMap1[2], 1)).toBe(0.5);
    });

    it('returns the specified default ratio', () => {
      expect(splitRatioOf(layoutMap1[2], 1, 0.4)).toBe(0.4);
    });

    it('returns the default ratio when the layout is undefined', () => {
      expect(splitRatioOf(undefined, 0)).toBe(0.5);
    });

    it('returns the specified default ratio when the layout is undefined', () => {
      expect(splitRatioOf(undefined, 0, 0.4)).toBe(0.4);
    });

    it('returns the default ratio when splitRatios is missing', () => {
      expect(splitRatioOf({ pattern: PATTERN.VERTICAL }, 0)).toBe(0.5);
    });
  });

  describe('removeLayoutMap', () => {
    it('removes the layout map at the specified index', () => {
      expect(removeLayoutMap(layoutMaps, 1)).toEqual([
        layoutMap1,
        layoutMap3,
      ]);
    });

    it('removes the first layout map', () => {
      expect(removeLayoutMap(layoutMaps, 0)).toEqual([
        layoutMap2,
        layoutMap3,
      ]);
    });

    it('removes the last layout map', () => {
      expect(removeLayoutMap(layoutMaps, 2)).toEqual([
        layoutMap1,
        layoutMap2,
      ]);
    });

    it('does not modify the original array', () => {
      const result = removeLayoutMap(layoutMaps, 1);

      expect(layoutMaps).toHaveLength(3);
      expect(result).not.toBe(layoutMaps);
    });

    it('returns an equivalent array for an out-of-range index', () => {
      expect(removeLayoutMap(layoutMaps, 3)).toEqual(layoutMaps);
    });

    it('returns an equivalent array for a negative index', () => {
      expect(removeLayoutMap(layoutMaps, -1)).toEqual(layoutMaps);
    });
  });

  describe('swapLayoutMapOrder', () => {
    it('swaps two layout maps', () => {
      expect(swapLayoutMapOrder(layoutMaps, 0, 1)).toEqual([
        layoutMap2,
        layoutMap1,
        layoutMap3,
      ]);
    });

    it('swaps the first and last layout maps', () => {
      expect(swapLayoutMapOrder(layoutMaps, 0, 2)).toEqual([
        layoutMap3,
        layoutMap2,
        layoutMap1,
      ]);
    });

    it('does not modify the original array', () => {
      const result = swapLayoutMapOrder(layoutMaps, 0, 1);

      expect(layoutMaps).toEqual([layoutMap1, layoutMap2, layoutMap3]);
      expect(result).not.toBe(layoutMaps);
    });

    it('keeps the array order when swapping the same index', () => {
      expect(swapLayoutMapOrder(layoutMaps, 1, 1)).toEqual(layoutMaps);
    });
  });

  describe('updateLayoutMaps', () => {
    it('replaces the layout map at the specified index', () => {
      const result = updateLayoutMaps(layoutMaps, 1, layoutMap3);

      expect(result).toEqual([layoutMap1, layoutMap3, layoutMap3]);
    });

    it('can replace the first layout map', () => {
      expect(updateLayoutMaps(layoutMaps, 0, layoutMap3)).toEqual([
        layoutMap3,
        layoutMap2,
        layoutMap3,
      ]);
    });

    it('can replace the last layout map', () => {
      expect(updateLayoutMaps(layoutMaps, 2, layoutMap1)).toEqual([
        layoutMap1,
        layoutMap2,
        layoutMap1,
      ]);
    });

    it('does not modify the original array', () => {
      const result = updateLayoutMaps(layoutMaps, 1, layoutMap3);

      expect(layoutMaps).toEqual([layoutMap1, layoutMap2, layoutMap3]);
      expect(result).not.toBe(layoutMaps);
    });

    it('extends the array when assigning beyond its current length', () => {
      const result = updateLayoutMaps(layoutMaps, 3, layoutMap1);

      expect(result).toHaveLength(4);
      expect(result[3]).toBe(layoutMap1);
    });
  });

  describe('updateLayoutMap', () => {
    it('updates the layout for the specified split area count', () => {
      const newLayout = {
        pattern: PATTERN.HORIZONTAL,
        splitRatios: [0.4],
      };

      const result = updateLayoutMap(layoutMap1, 2, newLayout);

      expect(result[2]).toEqual(newLayout);
    });

    it('preserves layouts for other split area counts', () => {
      const newLayout = {
        pattern: PATTERN.HORIZONTAL,
        splitRatios: [0.4],
      };

      const result = updateLayoutMap(layoutMap1, 2, newLayout);

      expect(result[1]).toEqual(layoutMap1[1]);
      expect(result[3]).toEqual(layoutMap1[3]);
    });

    it('does not modify the original layout map', () => {
      const newLayout = {
        pattern: PATTERN.HORIZONTAL,
        splitRatios: [0.4],
      };

      updateLayoutMap(layoutMap1, 2, newLayout);

      expect(layoutMap1[2]).toEqual({
        pattern: PATTERN.VERTICAL,
        splitRatios: [0.5],
      });
    });

    it('can update the layout for split area count 1', () => {
      const newLayout = {
        pattern: PATTERN.NONE,
        splitRatios: [],
      };

      expect(updateLayoutMap(layoutMap1, 1, newLayout)[1]).toEqual(newLayout);
    });

    it('can update the layout for split area count 3', () => {
      const newLayout = {
        pattern: PATTERN.HORIZONTAL_HORIZONTAL,
        splitRatios: [0.4, 0.6],
      };

      expect(updateLayoutMap(layoutMap1, 3, newLayout)[3]).toEqual(newLayout);
    });
  });

  describe('countEnabledLayouts', () => {
    it('counts layouts whose pattern is not NONE', () => {
      expect(countEnabledLayouts(layoutMap1)).toBe(3);
    });

    it('counts only configured layouts when some patterns are NONE', () => {
      const layoutMap = {
        1: { pattern: PATTERN.FULL, splitRatios: [] },
        2: { pattern: PATTERN.NONE, splitRatios: [] },
        3: {
          pattern: PATTERN.VERTICAL_VERTICAL,
          splitRatios: [0.33, 0.33],
        },
      };

      expect(countEnabledLayouts(layoutMap)).toBe(2);
    });

    it('returns zero when all layouts are NONE', () => {
      const layoutMap = {
        1: { pattern: PATTERN.NONE, splitRatios: [] },
        2: { pattern: PATTERN.NONE, splitRatios: [] },
        3: { pattern: PATTERN.NONE, splitRatios: [] },
      };

      expect(countEnabledLayouts(layoutMap)).toBe(0);
    });

    it('returns zero for an empty layout map', () => {
      expect(countEnabledLayouts({})).toBe(0);
    });
  });
});
