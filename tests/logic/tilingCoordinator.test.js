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

const mocks = vi.hoisted(() => ({
  activeWindows: [],
  splitAreaCount: 2,
  layoutMap: { 1: {}, 2: {} },
  currentTime: 1000,
  getActiveLayoutMap: vi.fn(),
  getSplitAreaCount: vi.fn(),
  applyLayoutMap: vi.fn(),
  loggerInfo: vi.fn(),
  loggerDebug: vi.fn(),
}));

vi.mock('gi://GLib', () => ({
  default: {
    PRIORITY_DEFAULT: 0,
    SOURCE_REMOVE: false,
    timeout_add: vi.fn(),
  },
}));

vi.mock('../../extension/env/desktopContext.js', () => ({
  DesktopContext: {
    getActiveWindows: () => mocks.activeWindows,
  },
}));

vi.mock('../../extension/io/windowOrder.js', () => ({
  WindowOrder: class {
    static CLOCKWISE = 1;
    static COUNTER_CLOCKWISE = -1;

    constructor() {
      this.CLOCKWISE = 1;
      this.COUNTER_CLOCKWISE = -1;
    }

    getActiveWindowsNewestFirst() {
      return mocks.activeWindows;
    }

    reorderActiveWindows(activeWindows, visibleWindows) {
      return [
        ...visibleWindows,
        ...activeWindows.filter(
          targetWindow => !visibleWindows.includes(targetWindow),
        ),
      ];
    }

    rotateWindowOrder(windows) {
      return windows;
    }

    logWindowOrder() {}
  },
}));

import { TilingCoordinator } from '../../extension/logic/tilingCoordinator.js';

function createWindow(id) {
  return {
    id,

    activate(timestamp) {
      mocks.activeWindows = [
        this,
        ...mocks.activeWindows.filter(
          targetWindow => targetWindow !== this,
        ),
      ];

      this.lastActivationTimestamp = timestamp;
    },

    get_user_time() {
      return this.lastActivationTimestamp ?? 0;
    },
  };
}

function createLogger() {
  return {
    info: mocks.loggerInfo,
    debug: mocks.loggerDebug,
  };
}

function createCoordinator({
  windows = [],
  layoutMap = mocks.layoutMap,
  splitAreaCount = mocks.splitAreaCount,
} = {}) {
  mocks.activeWindows = [...windows];
  mocks.getActiveLayoutMap.mockReturnValue(layoutMap);
  mocks.getSplitAreaCount.mockReturnValue(splitAreaCount);

  const windowPlacer = {
    getSplitAreaCount: mocks.getSplitAreaCount,
    applyLayoutMap: mocks.applyLayoutMap,
  };

  const coordinator = new TilingCoordinator({
    dataSource: {
      getActiveLayoutMap: mocks.getActiveLayoutMap,
    },
    windowPlacer,
    logger: createLogger(),
  });

  return { coordinator, windowPlacer };
}

beforeEach(() => {
  mocks.activeWindows = [];
  mocks.splitAreaCount = 2;
  mocks.layoutMap = { 1: {}, 2: {} };
  mocks.currentTime = 1000;

  mocks.getActiveLayoutMap.mockReset();
  mocks.getSplitAreaCount.mockReset();
  mocks.applyLayoutMap.mockReset();

  mocks.loggerInfo.mockReset();
  mocks.loggerDebug.mockReset();

  global.get_current_time = vi.fn(() => ++mocks.currentTime);
});

describe('tileWindows', () => {
  it('applies the layout in visible-window order even when active-window order differs', () => {
    const windows = [
      createWindow(1),
      createWindow(2),
      createWindow(3),
    ];
    const layoutMap = { 1: {}, 2: {} };

    const { coordinator } = createCoordinator({
      windows,
      layoutMap,
      splitAreaCount: 2,
    });

    coordinator.tileWindows();

    mocks.activeWindows = [
      windows[1],
      windows[0],
      windows[2],
    ];

    coordinator.tileWindows();

    expect(mocks.applyLayoutMap).toHaveBeenLastCalledWith(
      windows,
      layoutMap,
    );
  });

  it('applies the layout when there are no windows', () => {
    const { coordinator } = createCoordinator();

    coordinator.tileWindows();

    expect(mocks.applyLayoutMap).toHaveBeenCalledWith([], mocks.layoutMap);
  });
});
