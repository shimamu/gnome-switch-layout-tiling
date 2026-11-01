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
  timeoutAdd,
  getWorkArea,
  getTileMargin,
  countEnabledLayouts,
  toRectRatios,
  toRectPixel,
  getActiveWindowsNewestFirst,
  loggerInfo,
  loggerDebug,
} = vi.hoisted(() => ({
  timeoutAdd: vi.fn(),
  getWorkArea: vi.fn(),
  getTileMargin: vi.fn(),
  countEnabledLayouts: vi.fn(),
  toRectRatios: vi.fn(),
  toRectPixel: vi.fn(),
  getActiveWindowsNewestFirst: vi.fn(),
  loggerInfo: vi.fn(),
  loggerDebug: vi.fn(),
}));

vi.mock('gi://GLib', () => ({
  default: {
    PRIORITY_DEFAULT: 0,
    SOURCE_REMOVE: false,
    timeout_add: timeoutAdd,
  },
}));

vi.mock('../../extension/env/desktopContext.js', () => ({
  DesktopContext: {
    getWorkArea,
  },
}));

vi.mock('../../extension/logic/layoutOperations.js', () => ({
  countEnabledLayouts,
}));

vi.mock('../../extension/logic/layoutPatterns.js', () => ({
  PATTERN: {
    FULL: 'full',
    VERTICAL: 'vertical',
    HORIZONTAL: 'horizontal',
    VERTICAL_VERTICAL: 'vertical-vertical',
    VERTICAL_HORIZONTAL_RIGHT: 'vertical-horizontal-right',
    VERTICAL_HORIZONTAL_LEFT: 'vertical-horizontal-left',
    HORIZONTAL_HORIZONTAL: 'horizontal-horizontal',
    HORIZONTAL_VERTICAL_BOTTOM: 'horizontal-vertical-bottom',
    HORIZONTAL_VERTICAL_TOP: 'horizontal-vertical-top',
    NONE: 'none',
  },
  SPLIT: {
    HALF: [0.5],
    HALF_THEN_HALF: [0.5, 0.5],
    THREE_EQUAL: [0.33, 0.33],
  },
  LayoutConverter: class {
    toRectRatios(...args) {
      return toRectRatios(...args);
    }

    toRectPixel(...args) {
      return toRectPixel(...args);
    }
  },
}));

vi.mock('../../extension/io/logger.js', () => ({
  logger: {
    info: loggerInfo,
    debug: loggerDebug,
  },
}));

vi.mock('../../extension/io/windowOrder.js', () => ({
  getActiveWindowsNewestFirst,
}));

import { WindowPlacer } from '../../extension/io/windowPlacer.js';
import { PATTERN, SPLIT } from '../../extension/logic/layoutPatterns.js';

const WORK_AREA = {
  x: 0,
  y: 0,
  width: 1000,
  height: 800,
};

const createLayoutMap = () => ({
  1: {
    pattern: PATTERN.FULL,
  },
  2: {
    pattern: PATTERN.VERTICAL,
    splitRatios: SPLIT.HALF,
  },
  3: {
    pattern: PATTERN.VERTICAL_HORIZONTAL_RIGHT,
    splitRatios: SPLIT.HALF_THEN_HALF,
  },
});

const createWindow = ({
  id = 1,
  userTime = 100,
  allowsResize = true,
  maximized = false,
  maximizedHorizontally = false,
  maximizedVertically = false,
  legacyMaximized = false,
} = {}) => ({
  get_id: vi.fn(() => id),
  get_user_time: vi.fn(() => userTime),
  allows_resize: vi.fn(() => allowsResize),
  move_resize_frame: vi.fn(),
  get_maximized: legacyMaximized
    ? vi.fn(() => maximized ? 3 : 0)
    : undefined,
  maximized_horizontally: maximizedHorizontally,
  maximized_vertically: maximizedVertically,
  unmaximize: vi.fn(),
});

const createLayoutPreferences = (tileMargin = 10) => ({
  getTileMargin: vi.fn(() => tileMargin),
});

const createPlacer = (tileMargin = 10) =>
  new WindowPlacer(createLayoutPreferences(tileMargin));

const LEFT_HALF = {
  x: 0,
  y: 0,
  width: 0.5,
  height: 1,
};

const RIGHT_HALF = {
  x: 0.5,
  y: 0,
  width: 0.5,
  height: 1,
};

describe('WindowPlacer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getWorkArea.mockReturnValue(WORK_AREA);
    getTileMargin.mockReturnValue(10);

    countEnabledLayouts.mockImplementation(
      (layoutMap) => Object.keys(layoutMap ?? {}).length,
    );

    toRectRatios.mockReturnValue([LEFT_HALF, RIGHT_HALF]);

    toRectPixel.mockImplementation((rectRatio, area) => ({
      x: area.x + rectRatio.x * area.width,
      y: area.y + rectRatio.y * area.height,
      width: rectRatio.width * area.width,
      height: rectRatio.height * area.height,
    }));

    getActiveWindowsNewestFirst.mockReturnValue([]);

    timeoutAdd.mockImplementation((priority, delay, callback) => {
      callback();
      return 1;
    });
  });

  describe('_toRectPixelWithMargin', () => {
    it('applies full margins at the work area edges and half margins at internal edges', () => {
      const result = createPlacer()._toRectPixelWithMargin(
        {
          x: 0,
          y: 0,
          width: 500,
          height: 800,
        },
        10,
        WORK_AREA,
      );

      expect(result).toEqual({
        x: 10,
        y: 10,
        width: 485,
        height: 780,
      });
    });

    it('applies half margins to all sides of an interior rectangle', () => {
      const result = createPlacer()._toRectPixelWithMargin(
        {
          x: 500,
          y: 200,
          width: 250,
          height: 300,
        },
        10,
        WORK_AREA,
      );

      expect(result).toEqual({
        x: 505,
        y: 205,
        width: 240,
        height: 290,
      });
    });

    it('supports a work area with a non-zero origin', () => {
      const area = {
        x: 100,
        y: 50,
        width: 1200,
        height: 900,
      };

      const result = createPlacer()._toRectPixelWithMargin(
        {
          x: 100,
          y: 50,
          width: 600,
          height: 900,
        },
        10,
        area,
      );

      expect(result).toEqual({
        x: 110,
        y: 60,
        width: 585,
        height: 880,
      });
    });

    it('does not apply margins when the margin is zero', () => {
      const rectPixel = {
        x: 0,
        y: 0,
        width: 500,
        height: 800,
      };

      const result = createPlacer()._toRectPixelWithMargin(
        rectPixel,
        0,
        WORK_AREA,
      );

      expect(result).toEqual(rectPixel);
    });

    it('applies a full margin on every edge when the rectangle covers the work area', () => {
      const result = createPlacer()._toRectPixelWithMargin(
        {
          x: 0,
          y: 0,
          width: 1000,
          height: 800,
        },
        10,
        WORK_AREA,
      );

      expect(result).toEqual({
        x: 10,
        y: 10,
        width: 980,
        height: 780,
      });
    });
  });

  describe('_determineSplitAreaCount', () => {
    it('returns the window count when enough layouts are enabled', () => {
      const layoutMap = createLayoutMap();

      expect(
        createPlacer()._determineSplitAreaCount(layoutMap, 2),
      ).toBe(2);

      expect(countEnabledLayouts).toHaveBeenCalledWith(layoutMap);
    });

    it('returns the enabled layout count when there are more windows', () => {
      const layoutMap = createLayoutMap();

      expect(
        createPlacer()._determineSplitAreaCount(layoutMap, 5),
      ).toBe(3);
    });

    it('returns zero when there are no enabled layouts', () => {
      expect(
        createPlacer()._determineSplitAreaCount({}, 3),
      ).toBe(0);
    });

    it('returns zero when there are no windows', () => {
      expect(
        createPlacer()._determineSplitAreaCount(createLayoutMap(), 0),
      ).toBe(0);
    });
  });

  describe('_selectMaxSplitLayout', () => {
    it('selects the layout corresponding to the determined split area count', () => {
      const layoutMap = createLayoutMap();

      expect(
        createPlacer()._selectMaxSplitLayout(layoutMap, 2),
      ).toBe(layoutMap[2]);
    });

    it('selects the last enabled layout when the window count exceeds it', () => {
      const layoutMap = createLayoutMap();

      expect(
        createPlacer()._selectMaxSplitLayout(layoutMap, 5),
      ).toBe(layoutMap[3]);
    });

    it('returns undefined when the layout map is undefined', () => {
      expect(
        createPlacer()._selectMaxSplitLayout(undefined, 2),
      ).toBeUndefined();
    });
  });

  describe('getSplitAreaCount', () => {
    it('returns the split area count based on the active window count', () => {
      const layoutMap = createLayoutMap();

      getActiveWindowsNewestFirst.mockReturnValue([
        createWindow({ id: 1 }),
        createWindow({ id: 2 }),
      ]);

      expect(
        createPlacer().getSplitAreaCount(layoutMap),
      ).toBe(2);

      expect(getActiveWindowsNewestFirst).toHaveBeenCalledOnce();
    });

    it('returns zero when there are no active windows', () => {
      expect(
        createPlacer().getSplitAreaCount(createLayoutMap()),
      ).toBe(0);
    });
  });

  describe('_unmaximizeWindow', () => {
    it('unmaximizes a window using the legacy API when it is maximized', () => {
      const targetWindow = createWindow({
        legacyMaximized: true,
        maximized: true,
      });

      createPlacer()._unmaximizeWindow(targetWindow);

      expect(targetWindow.get_maximized).toHaveBeenCalledOnce();
      expect(targetWindow.unmaximize).toHaveBeenCalledWith(3);
    });

    it('does not unmaximize a window using the legacy API when it is not maximized', () => {
      const targetWindow = createWindow({
        legacyMaximized: true,
        maximized: false,
      });

      createPlacer()._unmaximizeWindow(targetWindow);

      expect(targetWindow.unmaximize).not.toHaveBeenCalled();
    });

    it('unmaximizes a window using the modern API when horizontally maximized', () => {
      const targetWindow = createWindow({
        maximizedHorizontally: true,
      });

      createPlacer()._unmaximizeWindow(targetWindow);

      expect(targetWindow.unmaximize).toHaveBeenCalledOnce();
      expect(targetWindow.unmaximize).toHaveBeenCalledWith();
    });

    it('unmaximizes a window using the modern API when vertically maximized', () => {
      const targetWindow = createWindow({
        maximizedVertically: true,
      });

      createPlacer()._unmaximizeWindow(targetWindow);

      expect(targetWindow.unmaximize).toHaveBeenCalledOnce();
    });

    it('does not unmaximize a window that is not maximized', () => {
      const targetWindow = createWindow();

      createPlacer()._unmaximizeWindow(targetWindow);

      expect(targetWindow.unmaximize).not.toHaveBeenCalled();
    });
  });

  describe('_waitForResizable', () => {
    it('calls the callback immediately when the window allows resizing', () => {
      const targetWindow = createWindow({ allowsResize: true });
      const callback = vi.fn();

      createPlacer()._waitForResizable(targetWindow, callback);

      expect(callback).toHaveBeenCalledOnce();
      expect(timeoutAdd).not.toHaveBeenCalled();
    });

    it('retries until the window allows resizing', () => {
      const targetWindow = createWindow();
      targetWindow.allows_resize
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const callback = vi.fn();

      createPlacer()._waitForResizable(targetWindow, callback);

      expect(targetWindow.allows_resize).toHaveBeenCalledTimes(3);
      expect(timeoutAdd).toHaveBeenCalledTimes(2);
      expect(timeoutAdd).toHaveBeenCalledWith(
        0,
        200,
        expect.any(Function),
      );
      expect(callback).toHaveBeenCalledOnce();
    });

    it('does not call the callback when the retry limit is exhausted', () => {
      const targetWindow = createWindow({ allowsResize: false });
      const callback = vi.fn();

      createPlacer()._waitForResizable(targetWindow, callback, 0);

      expect(callback).not.toHaveBeenCalled();
      expect(timeoutAdd).not.toHaveBeenCalled();
    });

    it('stops retrying after the retry limit is reached', () => {
      const targetWindow = createWindow({ allowsResize: false });
      const callback = vi.fn();

      createPlacer()._waitForResizable(targetWindow, callback, 2);

      expect(targetWindow.allows_resize).toHaveBeenCalledTimes(3);
      expect(timeoutAdd).toHaveBeenCalledTimes(2);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('_resizeWindow', () => {
    it('unmaximizes and resizes a window when resizing is allowed', () => {
      const targetWindow = createWindow({
        legacyMaximized: true,
        maximized: true,
      });
      const rectPixelWithMargin = {
        x: 10,
        y: 20,
        width: 480,
        height: 760,
      };

      createPlacer()._resizeWindow(targetWindow, rectPixelWithMargin);

      expect(targetWindow.unmaximize).toHaveBeenCalledWith(3);
      expect(targetWindow.move_resize_frame).toHaveBeenCalledWith(
        true,
        10,
        20,
        480,
        760,
      );
    });

    it('does not resize a window that never becomes resizable', () => {
      const targetWindow = createWindow({ allowsResize: false });

      createPlacer()._resizeWindow(targetWindow, {
        x: 10,
        y: 20,
        width: 480,
        height: 760,
      });

      expect(targetWindow.move_resize_frame).not.toHaveBeenCalled();
      expect(timeoutAdd).toHaveBeenCalledTimes(10);
    });
  });

  describe('_applyLayoutToWindow', () => {
    it('converts a layout ratio to pixels, applies margins, and resizes the window', () => {
      const targetWindow = createWindow();
      const layout = {
        pattern: PATTERN.VERTICAL,
        splitRatios: SPLIT.HALF,
      };
      const rectRatio = LEFT_HALF;
      const rectPixel = {
        x: 0,
        y: 0,
        width: 500,
        height: 800,
      };

      toRectRatios.mockReturnValue([rectRatio]);
      toRectPixel.mockReturnValue(rectPixel);

      createPlacer(10)._applyLayoutToWindow(targetWindow, 0, layout);

      expect(toRectRatios).toHaveBeenCalledWith(layout);
      expect(getWorkArea).toHaveBeenCalledOnce();
      expect(toRectPixel).toHaveBeenCalledWith(rectRatio, WORK_AREA);
      expect(targetWindow.move_resize_frame).toHaveBeenCalledWith(
        true,
        10,
        10,
        485,
        780,
      );
      expect(loggerDebug).toHaveBeenCalledOnce();
    });

    it('uses the rectangle corresponding to the window index', () => {
      const targetWindow = createWindow();
      const layout = {
        pattern: PATTERN.VERTICAL,
        splitRatios: SPLIT.HALF,
      };

      toRectRatios.mockReturnValue([LEFT_HALF, RIGHT_HALF]);
      toRectPixel.mockImplementation((rectRatio) => ({
        x: rectRatio.x * 1000,
        y: 0,
        width: rectRatio.width * 1000,
        height: 800,
      }));

      createPlacer(0)._applyLayoutToWindow(targetWindow, 1, layout);

      expect(toRectPixel).toHaveBeenCalledWith(RIGHT_HALF, WORK_AREA);
      expect(targetWindow.move_resize_frame).toHaveBeenCalledWith(
        true,
        500,
        0,
        500,
        800,
      );
    });

    it('wraps the rectangle index when the window index exceeds the rectangle count', () => {
      const targetWindow = createWindow();
      const layout = {
        pattern: PATTERN.VERTICAL,
        splitRatios: SPLIT.HALF,
      };

      toRectRatios.mockReturnValue([LEFT_HALF, RIGHT_HALF]);

      createPlacer(0)._applyLayoutToWindow(targetWindow, 2, layout);

      expect(toRectPixel).toHaveBeenCalledWith(LEFT_HALF, WORK_AREA);
    });
  });

  describe('_applyLayoutToWindows', () => {
    it('applies the layout to every window in order', () => {
      const placer = createPlacer();
      const windows = [
        createWindow({ id: 1 }),
        createWindow({ id: 2 }),
        createWindow({ id: 3 }),
      ];
      const layout = {
        pattern: PATTERN.VERTICAL,
        splitRatios: SPLIT.HALF,
      };
      const applyLayoutToWindowSpy = vi
        .spyOn(placer, '_applyLayoutToWindow')
        .mockImplementation(() => {});

      placer._applyLayoutToWindows(windows, layout);

      expect(applyLayoutToWindowSpy).toHaveBeenCalledTimes(3);
      expect(applyLayoutToWindowSpy).toHaveBeenNthCalledWith(
        1,
        windows[0],
        0,
        layout,
      );
      expect(applyLayoutToWindowSpy).toHaveBeenNthCalledWith(
        2,
        windows[1],
        1,
        layout,
      );
      expect(applyLayoutToWindowSpy).toHaveBeenNthCalledWith(
        3,
        windows[2],
        2,
        layout,
      );
    });
  });

  describe('applyLayoutMap', () => {
    it('does not apply a layout when there are no active windows', () => {
      const layoutMap = createLayoutMap();

      createPlacer().applyLayoutMap(layoutMap);

      expect(loggerInfo).toHaveBeenCalledWith('Apply layout map');
      expect(toRectRatios).not.toHaveBeenCalled();
      expect(getActiveWindowsNewestFirst).toHaveBeenCalledOnce();
    });

    it('does not apply a layout when no layout is available', () => {
      const windows = [
        createWindow({ id: 1 }),
        createWindow({ id: 2 }),
      ];

      getActiveWindowsNewestFirst.mockReturnValue(windows);
      countEnabledLayouts.mockReturnValue(0);

      createPlacer().applyLayoutMap({});

      expect(toRectRatios).not.toHaveBeenCalled();
      windows.forEach((targetWindow) => {
        expect(targetWindow.move_resize_frame).not.toHaveBeenCalled();
      });
    });

    it('selects the layout matching the active window count', () => {
      const layoutMap = createLayoutMap();
      const windows = [
        createWindow({ id: 1 }),
        createWindow({ id: 2 }),
      ];

      getActiveWindowsNewestFirst.mockReturnValue(windows);
      toRectRatios.mockReturnValue([LEFT_HALF, RIGHT_HALF]);

      createPlacer(0).applyLayoutMap(layoutMap);

      expect(toRectRatios).toHaveBeenCalledWith(layoutMap[2]);
      expect(windows[0].move_resize_frame).toHaveBeenCalledWith(
        true,
        0,
        0,
        500,
        800,
      );
      expect(windows[1].move_resize_frame).toHaveBeenCalledWith(
        true,
        500,
        0,
        500,
        800,
      );
    });

    it('uses the largest enabled layout when there are more windows than layouts', () => {
      const layoutMap = createLayoutMap();
      const windows = [
        createWindow({ id: 1 }),
        createWindow({ id: 2 }),
        createWindow({ id: 3 }),
        createWindow({ id: 4 }),
      ];

      getActiveWindowsNewestFirst.mockReturnValue(windows);
      toRectRatios.mockReturnValue([LEFT_HALF, RIGHT_HALF]);

      createPlacer(0).applyLayoutMap(layoutMap);

      expect(toRectRatios).toHaveBeenCalledWith(layoutMap[3]);
      expect(windows).toHaveLength(4);

      expect(windows[0].move_resize_frame).toHaveBeenCalledWith(
        true,
        0,
        0,
        500,
        800,
      );
      expect(windows[1].move_resize_frame).toHaveBeenCalledWith(
        true,
        500,
        0,
        500,
        800,
      );
      expect(windows[2].move_resize_frame).toHaveBeenCalledWith(
        true,
        0,
        0,
        500,
        800,
      );
      expect(windows[3].move_resize_frame).toHaveBeenCalledWith(
        true,
        500,
        0,
        500,
        800,
      );
    });

    it('applies the configured tile margin to each window', () => {
      const layoutMap = createLayoutMap();
      const windows = [
        createWindow({ id: 1 }),
        createWindow({ id: 2 }),
      ];

      getActiveWindowsNewestFirst.mockReturnValue(windows);
      toRectRatios.mockReturnValue([LEFT_HALF, RIGHT_HALF]);

      createPlacer(10).applyLayoutMap(layoutMap);

      expect(windows[0].move_resize_frame).toHaveBeenCalledWith(
        true,
        10,
        10,
        485,
        780,
      );
      expect(windows[1].move_resize_frame).toHaveBeenCalledWith(
        true,
        505,
        10,
        485,
        780,
      );
    });
  });
});
