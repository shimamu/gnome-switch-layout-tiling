/*
 * Switch Layout Tiling
 *
 * Copyright (C) 2026  shimamu
 *
 * https://github.com/shimamu/switch-layout-tiling
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import GLib from 'gi://GLib';
import { DesktopContext } from '../env/desktopContext.js';
import { logger } from '../io/logger.js';
import { WindowOrder, getActiveWindowsNewestFirst, logWindowOrder, reorderActiveWindows, rotateWindowOrder } from '../io/windowOrder.js';
import { pipe } from '../logic/functional.js';


const SCROLL_DEBOUNCE_MS = 200;


export class TilingCoordinator {
  constructor({
    dataSource = {},
    windowPlacer,
  }) {
    this._dataSource = dataSource;
    this._windowPlacer = windowPlacer;
    this._visibleWindows = [];

    this._lastTileScrollTimestamp = 0;
  }

  tileWindows() {
    logger.info('Tile windows');

    const windowsInDisplayOrder = this._withUpdatedVisibleWindows(
      () => this._getWindowsInDisplayOrder(),
    );

    this._activateWindowsNewestFirst(windowsInDisplayOrder);

    this._tileWindows();
  }

  tileWindowsLater(interval_ms) {
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval_ms, () => {
      this.tileWindows();
      return GLib.SOURCE_REMOVE;
    });
  }

  rotateWindowsClockwise(fixedAreaIndexes) {
    this._rotateAndRetile(WindowOrder.CLOCKWISE, fixedAreaIndexes);
  }

  rotateWindowsCounterClockwise(fixedAreaIndexes) {
    this._rotateAndRetile(WindowOrder.COUNTER_CLOCKWISE, fixedAreaIndexes);
  }

  _rotateAndRetile(direction, fixedAreaIndexes) {
    if (this._shouldIgnoreTileScroll())
      return;

    const windowsInDisplayOrder = this._withUpdatedVisibleWindows(
      () => this._getWindowsInDisplayOrder(),
    );

    const rotatedWindows = this._withUpdatedVisibleWindows(
      () => rotateWindowOrder(windowsInDisplayOrder, direction, fixedAreaIndexes),
    );

    this._activateWindowsNewestFirst(rotatedWindows);

    this._tileWindowsWithTimestamp();
  }

  _getWindowsInDisplayOrder() {
    logger.info('Get windows in display order');
    logWindowOrder('Before reorder (Visible windows)', this._visibleWindows);

    const activeWindows = getActiveWindowsNewestFirst();
    logWindowOrder('Before reorder (Active windows)', activeWindows);

    const reorderedWindows = reorderActiveWindows(
      activeWindows,
      this._visibleWindows,
    );
    logWindowOrder('After reorder (Reordered windows)', reorderedWindows);

    return reorderedWindows;
  }

  _activateWindowsNewestFirst(windows) {
    const now = global.get_current_time();

    windows.slice().reverse().forEach((targetWindow, index) => {
      targetWindow.activate(now + index + 1);
    });
  }

  _tileWindows() {
    const layoutMap = this._dataSource.getActiveLayoutMap();

    this._windowPlacer.applyLayoutMap(layoutMap);
  }

  _tileWindowsWithTimestamp() {
    this._tileWindows();
    this._lastTileScrollTimestamp = global.get_current_time();
  }

  _shouldIgnoreTileScroll() {
    const isTooSoon = () =>
      this._lastTileScrollTimestamp + SCROLL_DEBOUNCE_MS > global.get_current_time();

    const isSingleWindow = () => DesktopContext.getActiveWindows().length <= 1;

    return isTooSoon() || isSingleWindow();
  }

  _withUpdatedVisibleWindows(getWindows) {
    const windows = getWindows();

    this._visibleWindows = pipe(
      this._dataSource.getActiveLayoutMap(),
      (layoutMap) => this._windowPlacer.getSplitAreaCount(layoutMap),
      (splitAreaCount) => windows.slice(0, splitAreaCount),
    );

    return windows;
  }
}
