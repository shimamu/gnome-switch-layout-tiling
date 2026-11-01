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
import { countEnabledLayouts } from '../logic/layoutOperations.js';
import { pipe } from '../logic/functional.js';
import { LayoutConverter } from '../logic/layoutPatterns.js';
import { logger } from './logger.js';
import { getActiveWindowsNewestFirst } from './windowOrder.js';


const RESIZE_RETRY_LIMIT = 10;
const RESIZE_RETRY_DELAY_MS = 200;


export class WindowPlacer {
  constructor(layoutPreferences) {
    this._layoutPreferences = layoutPreferences;
    this._converter = new LayoutConverter();
  }

  applyLayoutMap(layoutMap) {
    logger.info('Apply layout map');

    const activeWindows = getActiveWindowsNewestFirst();
    const activeWindowCount = activeWindows.length;
    if (activeWindowCount === 0)
      return;

    const layout = this._selectMaxSplitLayout(layoutMap, activeWindowCount);
    if (!layout)
      return;

    this._applyLayoutToWindows(activeWindows, layout);
  }

  getSplitAreaCount(layoutMap) {
    const activeWindows = getActiveWindowsNewestFirst();
    const activeWindowCount = activeWindows.length;

    return this._determineSplitAreaCount(layoutMap, activeWindowCount);
  }

  _selectMaxSplitLayout(layoutMap, windowCount) {
    return layoutMap?.[this._determineSplitAreaCount(layoutMap, windowCount)];
  }

  _determineSplitAreaCount(layoutMap, windowCount) {
    return Math.min(windowCount, countEnabledLayouts(layoutMap));
  }

  _applyLayoutToWindows(windows, layout) {
    windows.forEach((targetWindow, index) => {
      this._applyLayoutToWindow(targetWindow, index, layout);
    });
  }

  _applyLayoutToWindow(targetWindow, index, layout) {
    const rectRatio = pipe(
      layout,
      (layout) => this._converter.toRectRatios(layout),
      (rectRatios) => rectRatios[index % rectRatios.length],
    );

    const workArea = DesktopContext.getWorkArea();
    const margin = this._layoutPreferences.getTileMargin();

    const rectPixelWithMargin = pipe(
      rectRatio,
      (rectRatio) => this._converter.toRectPixel(rectRatio, workArea),
      (rectPixel) => this._toRectPixelWithMargin(rectPixel, margin, workArea),
    );

    this._resizeWindow(targetWindow, rectPixelWithMargin);

    this._logLayout(targetWindow, index, rectRatio, rectPixelWithMargin);
  }

  _toRectPixelWithMargin(rectPixel, margin, area) {
    const halfMargin = margin / 2;

    const leftMargin = (area.x == rectPixel.x) ? margin : halfMargin;
    const rightMargin = (area.x + area.width == rectPixel.x + rectPixel.width) ? margin : halfMargin;
    const topMargin = (area.y == rectPixel.y) ? margin : halfMargin;
    const bottomMargin = (area.y + area.height == rectPixel.y + rectPixel.height) ? margin : halfMargin;

    return {
      x: leftMargin + rectPixel.x,
      y: topMargin + rectPixel.y,
      width:  rectPixel.width  - leftMargin - rightMargin,
      height: rectPixel.height - topMargin - bottomMargin,
    };
  }

  _resizeWindow(targetWindow, rectPixelWithMargin) {
    this._unmaximizeWindow(targetWindow);
    this._waitForResizable(targetWindow, () => {
      const { x, y, width, height } = rectPixelWithMargin;
      targetWindow.move_resize_frame(true, x, y, width, height);
    });
  }

  _waitForResizable(targetWindow, callback, retries = RESIZE_RETRY_LIMIT) {
    if (targetWindow.allows_resize()) {
      callback();
      return;
    }
    if (retries <= 0)
      return;
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, RESIZE_RETRY_DELAY_MS, () => {
      this._waitForResizable(targetWindow, callback, retries - 1);
      return GLib.SOURCE_REMOVE;
    });
  }

  _unmaximizeWindow(targetWindow) {
    if (typeof targetWindow.get_maximized === 'function') {
      // GNOME Shell 49 and earlier
      const maxState = targetWindow.get_maximized();

      if (maxState)
        targetWindow.unmaximize(maxState);
    } else {
      // GNOME Shell 50 and later
      if (targetWindow.maximized_horizontally || targetWindow.maximized_vertically)
        targetWindow.unmaximize();
    }
  }

  _logLayout(targetWindow, index, rectRatio, rectPixel) {
    logger.debug(
      `  Windows[${index}] `
      + `id=${targetWindow.get_id()} `
      + `userTime=${targetWindow.get_user_time()} `
      + `x=${rectRatio.x.toFixed(2).padStart(4)} `
      + `y=${rectRatio.y.toFixed(2).padStart(4)} `
      + `w=${rectRatio.width.toFixed(2).padStart(4)} `
      + `h=${rectRatio.height.toFixed(2).padStart(4)} `
      + '| px: '
      + `x=${String(rectPixel.x).padStart(4)} `
      + `y=${String(rectPixel.y).padStart(4)} `
      + `w=${String(rectPixel.width).padStart(4)} `
      + `h=${String(rectPixel.height).padStart(4)}`
    );
  }
}
