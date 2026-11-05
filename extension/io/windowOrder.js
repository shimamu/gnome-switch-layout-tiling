/*
 * Switch Layout Tiling
 *
 * Copyright (C) 2026  shimamu
 *
 * https://github.com/shimamu/switch-layout-tiling
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { DesktopContext } from '../env/desktopContext.js';
import { pipe } from '../logic/functional.js';


function compareByUserTimeAsc(a, b) {
  return a.get_user_time() - b.get_user_time();
}

function compareByUserTimeDesc(a, b) {
  return b.get_user_time() - a.get_user_time();
}

export class WindowOrder {
  static CLOCKWISE = 1;
  static COUNTER_CLOCKWISE = -1;

  constructor(logger) {
    this._logger = logger;
  }

  reorderActiveWindows(activeWindows, visibleWindows) {
    const orderedVisibleWindows = pipe(
      activeWindows,
      (activeWindows) => new Set(activeWindows),
      (activeWindowSet) => visibleWindows.filter(
        targetWindow => activeWindowSet.has(targetWindow),
      ),
    );

    if (orderedVisibleWindows.length === 0)
      return activeWindows;

    const firstVisibleIndex = pipe(
      visibleWindows,
      (visibleWindows) => new Set(visibleWindows),
      (visibleWindowSet) => activeWindows.findIndex(
        targetWindow => visibleWindowSet.has(targetWindow),
      ),
    );

    return [
      ...activeWindows.slice(0, firstVisibleIndex),
      ...orderedVisibleWindows,
      ...activeWindows.slice(
        firstVisibleIndex + orderedVisibleWindows.length,
      ),
    ];
  }

  rotateWindowOrder(windows, direction, fixedAreaIndexes = new Set()) {
    this._logger.debug('Rotate window order');
    this._logger.debug('  Direction:', direction);
    this._logger.debug('  Active windows count:', windows.length);
    this._logger.debug('  Fixed area indexes (0-based):', [...fixedAreaIndexes].sort((a, b) => a - b).join(', '));

    this.logWindowOrder('Before rotation', windows);

    if (windows.length <= 1)
      return windows;

    const reorderedWindows = [...windows];

    const rotatingWindows = windows.filter(
      (_, index) => !fixedAreaIndexes.has(index)
    );

    if (rotatingWindows.length <= 1)
      return windows;

    if (direction === WindowOrder.CLOCKWISE)
      rotatingWindows.unshift(rotatingWindows.pop());
    else
      rotatingWindows.push(rotatingWindows.shift());

    reorderedWindows.forEach((_, index) => {
      if (!fixedAreaIndexes.has(index))
        reorderedWindows[index] = rotatingWindows.shift();
    });

    this.logWindowOrder('After rotation', reorderedWindows);

    return reorderedWindows;
  }

  getActiveWindowsOldestFirst() {
    return [...DesktopContext.getActiveWindows()]
      .sort(compareByUserTimeAsc);
  }

  getActiveWindowsNewestFirst() {
    return [...DesktopContext.getActiveWindows()]
      .sort(compareByUserTimeDesc);
  }

  logWindowOrder(label, windows) {
    this._logger.debug(`  ${label}:`);

    windows.forEach((targetWindow, index) => {
      this._logger.debug(
        `    Window[${index}] id=${targetWindow.get_id()} userTime=${targetWindow.get_user_time()}`
      );
    });
  }
}
