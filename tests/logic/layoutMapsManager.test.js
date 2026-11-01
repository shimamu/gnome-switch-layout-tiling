/*
 * Switch Layout Tiling
 *
 * Copyright (C) 2026  shimamu
 *
 * https://github.com/shimamu/switch-layout-tiling
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  loadLayoutMapsRaw,
  saveLayoutMapsRaw,
  loggerInfo,
  loggerError,
} = vi.hoisted(() => ({
  loadLayoutMapsRaw: vi.fn(),
  saveLayoutMapsRaw: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('../../extension/io/settings.js', () => ({
  loadLayoutMapsRaw,
  saveLayoutMapsRaw,
}));

vi.mock('../../extension/io/logger.js', () => ({
  logger: {
    info: loggerInfo,
    error: loggerError,
  },
}));

import {
  LayoutMapsManager,
  getInitialLayoutMaps,
  createNewLayoutMap,
} from '../../extension/logic/layoutMapsManager.js';

import { PATTERN, SPLIT } from '../../extension/logic/layoutPatterns.js';

const createLayoutMap = (pattern = PATTERN.FULL) => ({
  1: { pattern },
});

describe('getInitialLayoutMaps', () => {
  it('returns the initial layout maps', () => {
    const layoutMaps = getInitialLayoutMaps();

    expect(layoutMaps).toHaveLength(5);
    expect(layoutMaps[0][1]).toEqual({ pattern: PATTERN.FULL });
    expect(Object.isFrozen(layoutMaps)).toBe(true);
    expect(Object.isFrozen(layoutMaps[0])).toBe(true);
    expect(Object.isFrozen(layoutMaps[0][1])).toBe(true);
  });
});

describe('createNewLayoutMap', () => {
  it('returns the default layout map template', () => {
    const layoutMap = createNewLayoutMap();

    expect(layoutMap).toEqual({
      1: { pattern: PATTERN.FULL },
      2: { pattern: PATTERN.VERTICAL, splitRatios: SPLIT.HALF },
      3: {
        pattern: PATTERN.VERTICAL_HORIZONTAL_RIGHT,
        splitRatios: SPLIT.HALF_THEN_HALF,
      },
    });
    expect(Object.isFrozen(layoutMap)).toBe(true);
    expect(Object.isFrozen(layoutMap[1])).toBe(true);
  });
});

describe('LayoutMapsManager', () => {
  let manager;
  let settings;

  beforeEach(() => {
    vi.clearAllMocks();
    settings = {};
    manager = new LayoutMapsManager(settings);
  });

  describe('load', () => {
    it('loads layout maps from settings', () => {
      const layoutMaps = [createLayoutMap()];

      loadLayoutMapsRaw.mockReturnValue(layoutMaps);

      const result = manager.load();

      expect(result).toBe(layoutMaps);
      expect(manager.getLayoutMaps()).toBe(layoutMaps);
      expect(loadLayoutMapsRaw).toHaveBeenCalledWith(settings);
      expect(loggerInfo).toHaveBeenCalledWith('layoutMaps loaded');
    });

    it('uses initial layout maps when settings are empty', () => {
      loadLayoutMapsRaw.mockReturnValue([]);

      const result = manager.load();

      expect(result).toBe(getInitialLayoutMaps());
      expect(manager.getLayoutMaps()).toBe(result);
      expect(loggerInfo).toHaveBeenCalledWith(
        'layoutMaps is empty, using default layoutMaps',
      );
    });

    it('uses initial layout maps when settings return a non-array value', () => {
      loadLayoutMapsRaw.mockReturnValue(null);

      const result = manager.load();

      expect(result).toBe(getInitialLayoutMaps());
      expect(manager.getLayoutMaps()).toBe(result);
    });

    it('uses initial layout maps when loading throws', () => {
      loadLayoutMapsRaw.mockImplementation(() => {
        throw new Error('load failed');
      });

      const result = manager.load();

      expect(result).toBe(getInitialLayoutMaps());
      expect(manager.getLayoutMaps()).toBe(result);
      expect(loggerError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load layoutMaps from settings:'),
      );
    });
  });

  describe('save', () => {
    it('saves the current layout maps to settings', () => {
      const layoutMaps = [createLayoutMap()];
      loadLayoutMapsRaw.mockReturnValue(layoutMaps);
      manager.load();

      manager.save();

      expect(saveLayoutMapsRaw).toHaveBeenCalledWith(settings, layoutMaps);
    });

    it('logs an error when saving throws', () => {
      const layoutMaps = [createLayoutMap()];
      loadLayoutMapsRaw.mockReturnValue(layoutMaps);
      manager.load();

      saveLayoutMapsRaw.mockImplementation(() => {
        throw new Error('save failed');
      });

      expect(() => manager.save()).not.toThrow();
      expect(loggerError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save layoutMaps:'),
      );
    });
  });

  describe('getLayoutMaps', () => {
    it('returns the current layout maps', () => {
      const layoutMaps = [createLayoutMap()];
      loadLayoutMapsRaw.mockReturnValue(layoutMaps);
      manager.load();

      expect(manager.getLayoutMaps()).toBe(layoutMaps);
    });
  });

  describe('getLayoutMap', () => {
    it('returns the layout map at the specified index', () => {
      const layoutMaps = [
        createLayoutMap(PATTERN.FULL),
        createLayoutMap(PATTERN.VERTICAL),
      ];
      loadLayoutMapsRaw.mockReturnValue(layoutMaps);
      manager.load();

      expect(manager.getLayoutMap(1)).toBe(layoutMaps[1]);
    });
  });

  describe('addNewLayoutMap', () => {
    it('adds a new layout map and returns the template', () => {
      const layoutMaps = [createLayoutMap()];
      loadLayoutMapsRaw.mockReturnValue(layoutMaps);
      manager.load();

      const newLayoutMap = manager.addNewLayoutMap();

      expect(newLayoutMap).toBe(createNewLayoutMap());
      expect(manager.getLayoutMaps()).toHaveLength(2);
      expect(manager.getLayoutMaps()[1]).toBe(newLayoutMap);
    });

    it('does not add a layout map when the manager is full', () => {
      const layoutMaps = Array.from(
        { length: LayoutMapsManager.MAX_LAYOUT_COUNT },
        () => createLayoutMap(),
      );
      loadLayoutMapsRaw.mockReturnValue(layoutMaps);
      manager.load();

      const result = manager.addNewLayoutMap();

      expect(result).toBeUndefined();
      expect(manager.getLayoutMaps()).toHaveLength(
        LayoutMapsManager.MAX_LAYOUT_COUNT,
      );
    });
  });

  describe('updateLayoutMap', () => {
    it('updates the layout map at the specified index', () => {
      const layoutMaps = [
        createLayoutMap(PATTERN.FULL),
        createLayoutMap(PATTERN.VERTICAL),
      ];
      const newLayoutMap = createLayoutMap(PATTERN.HORIZONTAL);
      loadLayoutMapsRaw.mockReturnValue(layoutMaps);
      manager.load();

      manager.updateLayoutMap(1, newLayoutMap);

      expect(manager.getLayoutMap(1)).toEqual(newLayoutMap);
      expect(manager.getLayoutMap(0)).toEqual(layoutMaps[0]);
    });
  });

  describe('swap', () => {
    it('swaps layout maps at valid indices', () => {
      const first = createLayoutMap(PATTERN.VERTICAL);
      const second = createLayoutMap(PATTERN.HORIZONTAL);
      const layoutMaps = [first, second];
      loadLayoutMapsRaw.mockReturnValue(layoutMaps);
      manager.load();

      expect(manager.swap(0, 1)).toBe(true);
      expect(manager.getLayoutMaps()[0]).toEqual(second);
      expect(manager.getLayoutMaps()[1]).toEqual(first);
    });

    it('returns false when the target index is out of range', () => {
      const layoutMaps = [createLayoutMap()];
      loadLayoutMapsRaw.mockReturnValue(layoutMaps);
      manager.load();

      expect(manager.swap(0, -1)).toBe(false);
      expect(manager.swap(0, 1)).toBe(false);
      expect(manager.getLayoutMaps()).toBe(layoutMaps);
    });
  });

  describe('remove', () => {
    it('removes the layout map at the specified index', () => {
      const first = createLayoutMap(PATTERN.VERTICAL);
      const second = createLayoutMap(PATTERN.HORIZONTAL);
      loadLayoutMapsRaw.mockReturnValue([first, second]);
      manager.load();

      manager.remove(0);

      expect(manager.getLayoutMaps()).toHaveLength(1);
      expect(manager.getLayoutMaps()[0]).toEqual(second);
    });
  });

  describe('isOutOfRange', () => {
    beforeEach(() => {
      loadLayoutMapsRaw.mockReturnValue([
        createLayoutMap(),
        createLayoutMap(),
      ]);
      manager.load();
    });

    it('returns true for a negative index', () => {
      expect(manager.isOutOfRange(-1)).toBe(true);
    });

    it('returns true when the index equals the length', () => {
      expect(manager.isOutOfRange(2)).toBe(true);
    });

    it('returns false for valid indices', () => {
      expect(manager.isOutOfRange(0)).toBe(false);
      expect(manager.isOutOfRange(1)).toBe(false);
    });
  });

  describe('isFull', () => {
    it('returns false below the maximum layout count', () => {
      loadLayoutMapsRaw.mockReturnValue([createLayoutMap()]);
      manager.load();

      expect(manager.isFull()).toBe(false);
    });

    it('returns true at the maximum layout count', () => {
      loadLayoutMapsRaw.mockReturnValue(
        Array.from(
          { length: LayoutMapsManager.MAX_LAYOUT_COUNT },
          () => createLayoutMap(),
        ),
      );
      manager.load();

      expect(manager.isFull()).toBe(true);
    });
  });
});
