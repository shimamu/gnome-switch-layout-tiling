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
  LayoutConverter,
  PATTERN,
  SPLIT,
  patternsForSplitAreaCount,
} from '../../extension/logic/layoutPatterns.js';

describe('layoutPatterns', () => {
  describe('SPLIT', () => {
    it('defines the default split ratios', () => {
      expect(SPLIT.HALF).toEqual([0.5]);
      expect(SPLIT.HALF_THEN_HALF).toEqual([0.5, 0.5]);
      expect(SPLIT.THREE_EQUAL).toEqual([0.33, 0.33]);
    });
  });

  describe('patternsForSplitAreaCount', () => {
    it('returns patterns that produce one rectangle', () => {
      expect(patternsForSplitAreaCount(1)).toEqual([
        PATTERN.FULL,
      ]);
    });

    it('returns patterns that produce two rectangles', () => {
      expect(patternsForSplitAreaCount(2)).toEqual([
        PATTERN.VERTICAL,
        PATTERN.HORIZONTAL,
      ]);
    });

    it('returns patterns that produce three rectangles', () => {
      expect(patternsForSplitAreaCount(3)).toEqual([
        PATTERN.VERTICAL_HORIZONTAL_RIGHT,
        PATTERN.VERTICAL_HORIZONTAL_LEFT,
        PATTERN.VERTICAL_VERTICAL,
        PATTERN.HORIZONTAL_VERTICAL_BOTTOM,
        PATTERN.HORIZONTAL_VERTICAL_TOP,
        PATTERN.HORIZONTAL_HORIZONTAL,
      ]);
    });

    it('returns an empty array when no patterns match', () => {
      expect(patternsForSplitAreaCount(0)).toEqual([]);
      expect(patternsForSplitAreaCount(4)).toEqual([]);
    });
  });

  describe('LayoutConverter.splitLineCountOf', () => {
    it('returns the number of split lines for a split area count', () => {
      expect(LayoutConverter.splitLineCountOf(1)).toBe(0);
      expect(LayoutConverter.splitLineCountOf(2)).toBe(1);
      expect(LayoutConverter.splitLineCountOf(3)).toBe(2);
    });
  });

  describe('LayoutConverter.toRectRatios', () => {
    const converter = new LayoutConverter();

    it('returns undefined when the layout is undefined', () => {
      expect(converter.toRectRatios(undefined)).toBeUndefined();
    });

    it('returns undefined when the layout is null', () => {
      expect(converter.toRectRatios(null)).toBeUndefined();
    });

    it('returns undefined when the pattern is missing', () => {
      expect(converter.toRectRatios({ splitRatios: [0.5] }))
        .toBeUndefined();
    });

    it('returns undefined for an unknown pattern', () => {
      expect(converter.toRectRatios({
        pattern: 'unknown',
        splitRatios: [0.5],
      })).toBeUndefined();
    });

    it('converts the FULL pattern', () => {
      expect(converter.toRectRatios({
        pattern: PATTERN.FULL,
        splitRatios: [],
      })).toEqual([
        { x: 0, y: 0, width: 1, height: 1 },
      ]);
    });

    it('converts the VERTICAL pattern using the default split ratio', () => {
      expect(converter.toRectRatios({
        pattern: PATTERN.VERTICAL,
      })).toEqual([
        { x: 0, y: 0, width: 0.5, height: 1 },
        { x: 0.5, y: 0, width: 0.5, height: 1 },
      ]);
    });

    it('converts the VERTICAL pattern using a custom split ratio', () => {
      expect(converter.toRectRatios({
        pattern: PATTERN.VERTICAL,
        splitRatios: [0.3],
      })).toEqual([
        { x: 0, y: 0, width: 0.3, height: 1 },
        { x: 0.3, y: 0, width: 0.7, height: 1 },
      ]);
    });

    it('converts the HORIZONTAL pattern using the default split ratio', () => {
      expect(converter.toRectRatios({
        pattern: PATTERN.HORIZONTAL,
      })).toEqual([
        { x: 0, y: 0, width: 1, height: 0.5 },
        { x: 0, y: 0.5, width: 1, height: 0.5 },
      ]);
    });

    it('converts the VERTICAL_VERTICAL pattern using default split ratios', () => {
      expect(converter.toRectRatios({
        pattern: PATTERN.VERTICAL_VERTICAL,
      })).toEqual([
        { x: 0, y: 0, width: 0.33, height: 1 },
        { x: 0.33, y: 0, width: 0.33, height: 1 },
        { x: 0.66, y: 0, width: 0.34, height: 1 },
      ]);
    });

    it('converts the VERTICAL_HORIZONTAL_RIGHT pattern', () => {
      expect(converter.toRectRatios({
        pattern: PATTERN.VERTICAL_HORIZONTAL_RIGHT,
        splitRatios: [0.4, 0.6],
      })).toEqual([
        { x: 0, y: 0, width: 0.4, height: 1 },
        { x: 0.4, y: 0, width: 0.6, height: 0.6 },
        { x: 0.4, y: 0.6, width: 0.6, height: 0.4 },
      ]);
    });

    it('converts the VERTICAL_HORIZONTAL_LEFT pattern', () => {
      expect(converter.toRectRatios({
        pattern: PATTERN.VERTICAL_HORIZONTAL_LEFT,
        splitRatios: [0.4, 0.6],
      })).toEqual([
        { x: 0, y: 0, width: 0.4, height: 0.6 },
        { x: 0.4, y: 0, width: 0.6, height: 1 },
        { x: 0, y: 0.6, width: 0.4, height: 0.4 },
      ]);
    });

    it('converts the HORIZONTAL_HORIZONTAL pattern using default split ratios', () => {
      expect(converter.toRectRatios({
        pattern: PATTERN.HORIZONTAL_HORIZONTAL,
      })).toEqual([
        { x: 0, y: 0, width: 1, height: 0.33 },
        { x: 0, y: 0.33, width: 1, height: 0.33 },
        { x: 0, y: 0.66, width: 1, height: 0.34 },
      ]);
    });

    it('converts the HORIZONTAL_VERTICAL_BOTTOM pattern', () => {
      expect(converter.toRectRatios({
        pattern: PATTERN.HORIZONTAL_VERTICAL_BOTTOM,
        splitRatios: [0.4, 0.7],
      })).toEqual([
        { x: 0, y: 0, width: 1, height: 0.4 },
        { x: 0.7, y: 0.4, width: 0.3, height: 0.6 },
        { x: 0, y: 0.4, width: 0.7, height: 0.6 },
      ]);
    });

    it('converts the HORIZONTAL_VERTICAL_TOP pattern', () => {
      expect(converter.toRectRatios({
        pattern: PATTERN.HORIZONTAL_VERTICAL_TOP,
        splitRatios: [0.4, 0.7],
      })).toEqual([
        { x: 0, y: 0, width: 0.7, height: 0.4 },
        { x: 0.7, y: 0, width: 0.3, height: 0.4 },
        { x: 0, y: 0.4, width: 1, height: 0.6 },
      ]);
    });

    it('returns undefined for PATTERN.NONE', () => {
      expect(converter.toRectRatios({
        pattern: PATTERN.NONE,
        splitRatios: [],
      })).toBeUndefined();
    });
  });

  describe('LayoutConverter.toRectPixel', () => {
    const converter = new LayoutConverter();

    it('converts normalized rectangle ratios to pixel coordinates', () => {
      expect(
        converter.toRectPixel(
          { x: 0.25, y: 0.5, width: 0.5, height: 0.25 },
          { x: 100, y: 200, width: 800, height: 600 },
        ),
      ).toEqual({
        x: 300,
        y: 500,
        width: 400,
        height: 150,
      });
    });

    it('rounds pixel coordinates and dimensions to integers', () => {
      expect(
        converter.toRectPixel(
          { x: 0.333, y: 0.333, width: 0.333, height: 0.333 },
          { x: 0, y: 0, width: 100, height: 100 },
        ),
      ).toEqual({
        x: 33,
        y: 33,
        width: 33,
        height: 33,
      });
    });

    it('clamps negative ratios to zero', () => {
      expect(
        converter.toRectPixel(
          { x: -0.2, y: -0.1, width: -0.5, height: -0.3 },
          { x: 10, y: 20, width: 100, height: 200 },
        ),
      ).toEqual({
        x: 10,
        y: 20,
        width: 0,
        height: 0,
      });
    });

    it('clamps ratios greater than one to one', () => {
      expect(
        converter.toRectPixel(
          { x: 1.2, y: 1.5, width: 1.3, height: 1.4 },
          { x: 10, y: 20, width: 100, height: 200 },
        ),
      ).toEqual({
        x: 110,
        y: 220,
        width: 0,
        height: 0,
      });
    });

    it('handles an area with a non-zero origin', () => {
      expect(
        converter.toRectPixel(
          { x: 0, y: 0, width: 1, height: 1 },
          { x: 1920, y: 100, width: 1280, height: 720 },
        ),
      ).toEqual({
        x: 1920,
        y: 100,
        width: 1280,
        height: 720,
      });
    });

    it('handles a zero-sized area', () => {
      expect(
        converter.toRectPixel(
          { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
          { x: 10, y: 20, width: 0, height: 0 },
        ),
      ).toEqual({
        x: 10,
        y: 20,
        width: 0,
        height: 0,
      });
    });
  });
});

