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

import { DesktopContext } from '../../extension/env/desktopContext.js';
import {
  WindowOrder,
  getActiveWindowsNewestFirst,
  getActiveWindowsOldestFirst,
  reorderActiveWindows,
  rotateWindowOrder,
} from '../../extension/io/windowOrder.js';

vi.mock('../../extension/env/desktopContext.js', () => ({
  DesktopContext: {
    getActiveWindows: vi.fn(),
  },
}));

vi.mock('../../extension/io/logger.js', () => ({
  logger: {
    debug: vi.fn(),
  },
}));

const createWindow = (id, userTime = id) => ({
  get_id: () => id,
  get_user_time: () => userTime,
});

describe('WindowOrder', () => {
  it('defines clockwise and counter-clockwise directions', () => {
    expect(WindowOrder.CLOCKWISE).toBe(1);
    expect(WindowOrder.COUNTER_CLOCKWISE).toBe(-1);
  });
});

describe('reorderActiveWindows', () => {
  it('returns the original array when there are no visible windows', () => {
    const activeWindows = [
      createWindow(1),
      createWindow(2),
    ];

    expect(reorderActiveWindows(activeWindows, [])).toBe(activeWindows);
  });

  it('returns the original array when no active windows are visible', () => {
    const activeWindows = [
      createWindow(1),
      createWindow(2),
    ];
    const visibleWindows = [
      createWindow(3),
      createWindow(4),
    ];

    expect(
      reorderActiveWindows(activeWindows, visibleWindows),
    ).toBe(activeWindows);
  });

  it('reorders visible windows according to visibleWindows order', () => {
    const a = createWindow(1);
    const b = createWindow(2);
    const c = createWindow(3);
    const d = createWindow(4);
    const activeWindows = [a, b, c, d];

    const result = reorderActiveWindows(
      activeWindows,
      [c, b],
    );

    expect(result).toEqual([a, c, b, d]);
  });

  it('preserves non-visible windows before and after the reordered section', () => {
    const a = createWindow(1);
    const b = createWindow(2);
    const c = createWindow(3);
    const d = createWindow(4);
    const e = createWindow(5);
    const activeWindows = [a, b, c, d, e];

    const result = reorderActiveWindows(
      activeWindows,
      [c, d],
    );

    expect(result).toEqual([a, b, c, d, e]);
  });

  it('ignores visible windows that are not in activeWindows', () => {
    const a = createWindow(1);
    const b = createWindow(2);
    const c = createWindow(3);
    const externalWindow = createWindow(99);

    const result = reorderActiveWindows(
      [a, b, c],
      [externalWindow, c, b],
    );

    expect(result).toEqual([a, c, b]);
  });

  it('does not modify the original activeWindows array', () => {
    const a = createWindow(1);
    const b = createWindow(2);
    const c = createWindow(3);
    const activeWindows = [a, b, c];

    const result = reorderActiveWindows(
      activeWindows,
      [c, b],
    );

    expect(activeWindows).toEqual([a, b, c]);
    expect(result).not.toBe(activeWindows);
  });
});

describe('rotateWindowOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rotates clockwise', () => {
    const windows = [
      createWindow(1),
      createWindow(2),
      createWindow(3),
    ];

    const result = rotateWindowOrder(
      windows,
      WindowOrder.CLOCKWISE,
    );

    expect(result).toEqual([windows[2], windows[0], windows[1]]);
  });

  it('rotates counter-clockwise', () => {
    const windows = [
      createWindow(1),
      createWindow(2),
      createWindow(3),
    ];

    const result = rotateWindowOrder(
      windows,
      WindowOrder.COUNTER_CLOCKWISE,
    );

    expect(result).toEqual([windows[1], windows[2], windows[0]]);
  });

  it('returns the original array when there are no windows', () => {
    const windows = [];

    expect(
      rotateWindowOrder(windows, WindowOrder.CLOCKWISE),
    ).toBe(windows);
  });

  it('returns the original array when there is only one window', () => {
    const windows = [createWindow(1)];

    expect(
      rotateWindowOrder(windows, WindowOrder.CLOCKWISE),
    ).toBe(windows);
  });

  it('does not modify the original array when rotating', () => {
    const windows = [
      createWindow(1),
      createWindow(2),
      createWindow(3),
    ];

    const result = rotateWindowOrder(
      windows,
      WindowOrder.CLOCKWISE,
    );

    expect(windows).toEqual([
      windows[0],
      windows[1],
      windows[2],
    ]);
    expect(result).not.toBe(windows);
  });

  it('keeps a fixed area in place during clockwise rotation', () => {
    const windows = [
      createWindow(1),
      createWindow(2),
      createWindow(3),
      createWindow(4),
    ];

    const result = rotateWindowOrder(
      windows,
      WindowOrder.CLOCKWISE,
      new Set([1]),
    );

    expect(result).toEqual([
      windows[3],
      windows[1],
      windows[0],
      windows[2],
    ]);
  });

  it('keeps a fixed area in place during counter-clockwise rotation', () => {
    const windows = [
      createWindow(1),
      createWindow(2),
      createWindow(3),
      createWindow(4),
    ];

    const result = rotateWindowOrder(
      windows,
      WindowOrder.COUNTER_CLOCKWISE,
      new Set([1]),
    );

    expect(result).toEqual([
      windows[2],
      windows[1],
      windows[3],
      windows[0],
    ]);
  });

  it('keeps multiple fixed areas in place', () => {
    const windows = [
      createWindow(1),
      createWindow(2),
      createWindow(3),
      createWindow(4),
      createWindow(5),
    ];

    const result = rotateWindowOrder(
      windows,
      WindowOrder.CLOCKWISE,
      new Set([1, 3]),
    );

    expect(result).toEqual([
      windows[4],
      windows[1],
      windows[0],
      windows[3],
      windows[2],
    ]);
  });

  it('returns the original array when all areas are fixed', () => {
    const windows = [
      createWindow(1),
      createWindow(2),
      createWindow(3),
    ];

    expect(
      rotateWindowOrder(
        windows,
        WindowOrder.CLOCKWISE,
        new Set([0, 1, 2]),
      ),
    ).toBe(windows);
  });

  it('returns the original array when only one area can rotate', () => {
    const windows = [
      createWindow(1),
      createWindow(2),
      createWindow(3),
    ];

    expect(
      rotateWindowOrder(
        windows,
        WindowOrder.CLOCKWISE,
        new Set([0, 1]),
      ),
    ).toBe(windows);
  });

  it('ignores fixed indexes outside the window range', () => {
    const windows = [
      createWindow(1),
      createWindow(2),
      createWindow(3),
    ];

    const result = rotateWindowOrder(
      windows,
      WindowOrder.CLOCKWISE,
      new Set([-1, 3, 10]),
    );

    expect(result).toEqual([windows[2], windows[0], windows[1]]);
  });
});

describe('getActiveWindowsOldestFirst', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns active windows in ascending user_time order', () => {
    const windows = [
      createWindow(1, 300),
      createWindow(2, 100),
      createWindow(3, 200),
    ];
    DesktopContext.getActiveWindows.mockReturnValue(windows);

    const result = getActiveWindowsOldestFirst();

    expect(result).toEqual([windows[1], windows[2], windows[0]]);
    expect(DesktopContext.getActiveWindows).toHaveBeenCalledTimes(1);
  });

  it('returns an empty array when there are no active windows', () => {
    DesktopContext.getActiveWindows.mockReturnValue([]);

    expect(getActiveWindowsOldestFirst()).toEqual([]);
  });
});

describe('getActiveWindowsNewestFirst', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns active windows in descending user_time order', () => {
    const windows = [
      createWindow(1, 100),
      createWindow(2, 300),
      createWindow(3, 200),
    ];
    DesktopContext.getActiveWindows.mockReturnValue(windows);

    const result = getActiveWindowsNewestFirst();

    expect(result).toEqual([windows[1], windows[2], windows[0]]);
    expect(DesktopContext.getActiveWindows).toHaveBeenCalledTimes(1);
  });

  it('returns an empty array when there are no active windows', () => {
    DesktopContext.getActiveWindows.mockReturnValue([]);

    expect(getActiveWindowsNewestFirst()).toEqual([]);
  });
});
