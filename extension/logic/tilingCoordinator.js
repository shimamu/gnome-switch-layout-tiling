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
import { WindowOrder } from '../io/windowOrder.js';
import { pipe } from '../logic/functional.js';


const SCROLL_DEBOUNCE_MS = 200;


export class TilingCoordinator {
  constructor({
    dataSource = {},
    windowPlacer,
    logger,
  }) {
    this._dataSource = dataSource;
    this._windowPlacer = windowPlacer;
    this._visibleWindows = [];
    this._logger = logger;

    this._windowOrder = new WindowOrder(this._logger);
    this._lastTileScrollTimestamp = 0;
    this._timeoutId = null;
  }

  destroy() {
    this._clearTimeout();
  }

  tileWindows() {
    this._logger.info('Tile windows');

    const windowsInDisplayOrder = this._withUpdatedVisibleWindows(
      () => this._getWindowsInDisplayOrder(),
    );

    this._activateWindowsNewestFirst(windowsInDisplayOrder);

    this._tileWindows(windowsInDisplayOrder);
  }

  tileWindowsLater(interval_ms) {
    this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval_ms, () => {
      this._timeoutId = null;
      this.tileWindows();
      return GLib.SOURCE_REMOVE;
    });
  }

  rotateWindowsClockwise(fixedAreaIndexes) {
    this._rotateAndRetile(this._windowOrder.CLOCKWISE, fixedAreaIndexes);
  }

  rotateWindowsCounterClockwise(fixedAreaIndexes) {
    this._rotateAndRetile(this._windowOrder.COUNTER_CLOCKWISE, fixedAreaIndexes);
  }

  _rotateAndRetile(direction, fixedAreaIndexes) {
    if (this._shouldIgnoreTileScroll())
      return;

    const windowsInDisplayOrder = this._withUpdatedVisibleWindows(
      () => this._getWindowsInDisplayOrder(),
    );

    const rotatedWindows = this._withUpdatedVisibleWindows(
      () => this._windowOrder.rotateWindowOrder(windowsInDisplayOrder, direction, fixedAreaIndexes),
    );

    this._activateWindowsNewestFirst(rotatedWindows);

    this._tileWindowsWithTimestamp(rotatedWindows);
  }

  _getWindowsInDisplayOrder() {
    this._logger.info('Get windows in display order');
    this._windowOrder.logWindowOrder('Before reorder (Visible windows)', this._visibleWindows);

    const activeWindows = this._windowOrder.getActiveWindowsNewestFirst();
    this._windowOrder.logWindowOrder('Before reorder (Active windows)', activeWindows);

    const reorderedWindows = this._windowOrder.reorderActiveWindows(
      activeWindows,
      this._visibleWindows,
    );
    this._windowOrder.logWindowOrder('After reorder (Reordered windows)', reorderedWindows);

    return reorderedWindows;
  }

  _activateWindowsNewestFirst(windows) {
    const now = global.get_current_time();

    windows.slice().reverse().forEach((targetWindow, index) => {
      targetWindow.activate(now + index + 1);
    });
  }

  _tileWindows(windows) {
    const layoutMap = this._dataSource.getActiveLayoutMap();

    this._windowPlacer.applyLayoutMap(windows, layoutMap);
  }

  _tileWindowsWithTimestamp(windows) {
    this._tileWindows(windows);
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

  _clearTimeout() {
    if (this._timeoutId === null)
      return;

    GLib.Source.remove(this._timeoutId);
    this._timeoutId = null;
  }
}
