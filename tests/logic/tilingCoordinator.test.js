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
  applyLayoutMap: vi.fn(),
  getActiveLayoutMap: vi.fn(),
  getSplitAreaCount: vi.fn(),
  loggerInfo: vi.fn(),
  loggerDebug: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
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

vi.mock('../../extension/io/logger.js', () => ({
  logger: {
    info: mocks.loggerInfo,
    debug: mocks.loggerDebug,
    warn: mocks.loggerWarn,
    error: mocks.loggerError,
  },
}));

vi.mock('../../extension/io/windowOrder.js', () => ({
  WindowOrder: {
    CLOCKWISE: 1,
    COUNTER_CLOCKWISE: -1,
  },

  getActiveWindowsNewestFirst: () => mocks.activeWindows,

  logWindowOrder: vi.fn(),

  reorderActiveWindows: (activeWindows, visibleWindows) => [
    ...visibleWindows,
    ...activeWindows.filter(
      (targetWindow) => !visibleWindows.includes(targetWindow),
    ),
  ],
}));

import { TilingCoordinator } from '../../extension/logic/tilingCoordinator.js';

function createWindow(id) {
  return {
    id,

    activate(timestamp) {
      mocks.activeWindows = [
        this,
        ...mocks.activeWindows.filter(
          (targetWindow) => targetWindow !== this,
        ),
      ];

      this.lastActivationTimestamp = timestamp;
    },

    get_user_time() {
      return this.lastActivationTimestamp ?? 0;
    },
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

    applyLayoutMap: vi.fn((map) => {
      windowPlacer.windowsAtLayoutApplication = [
        ...mocks.activeWindows,
      ];

      mocks.applyLayoutMap(map);
    }),
  };

  const coordinator = new TilingCoordinator({
    dataSource: {
      getActiveLayoutMap: mocks.getActiveLayoutMap,
    },
    windowPlacer,
  });

  return { coordinator, windowPlacer };
}

beforeEach(() => {
  mocks.activeWindows = [];
  mocks.splitAreaCount = 2;
  mocks.layoutMap = { 1: {}, 2: {} };
  mocks.currentTime = 1000;

  mocks.applyLayoutMap.mockReset();
  mocks.getActiveLayoutMap.mockReset();
  mocks.getSplitAreaCount.mockReset();

  mocks.loggerInfo.mockReset();
  mocks.loggerDebug.mockReset();
  mocks.loggerWarn.mockReset();
  mocks.loggerError.mockReset();

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

    const { coordinator, windowPlacer } = createCoordinator({
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

    expect(
      windowPlacer.windowsAtLayoutApplication.map(
        (targetWindow) => targetWindow.id,
      ),
    ).toEqual([1, 2, 3]);

    expect(windowPlacer.applyLayoutMap).toHaveBeenLastCalledWith(layoutMap);
  });

  it('applies the layout when there are no windows', () => {
    const { coordinator, windowPlacer } = createCoordinator();

    coordinator.tileWindows();

    expect(windowPlacer.applyLayoutMap).toHaveBeenCalledOnce();
    expect(windowPlacer.windowsAtLayoutApplication).toEqual([]);
  });
});
