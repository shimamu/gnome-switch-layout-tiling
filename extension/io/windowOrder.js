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
import { logger } from './logger.js';


export const WindowOrder = {
  CLOCKWISE: 1,
  COUNTER_CLOCKWISE: -1,
};

function compareByUserTimeAsc(a, b) {
  return a.get_user_time() - b.get_user_time();
}

function compareByUserTimeDesc(a, b) {
  return b.get_user_time() - a.get_user_time();
}

export function logWindowOrder(label, windows) {
  logger.debug(`  ${label}:`);

  windows.forEach((targetWindow, index) => {
    logger.debug(
      `    Window[${index}] id=${targetWindow.get_id()} userTime=${targetWindow.get_user_time()}`
    );
  });
}

export function reorderActiveWindows(activeWindows, visibleWindows) {
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

export function rotateWindowOrder(windows, direction, fixedAreaIndexes = new Set()) {
  logger.debug('Rotate window order');
  logger.debug('  Direction:', direction);
  logger.debug('  Active windows count:', windows.length);
  logger.debug('  Fixed area indexes (0-based):', [...fixedAreaIndexes].sort((a, b) => a - b).join(', '));

  logWindowOrder('Before rotation', windows);

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

  logWindowOrder('After rotation', reorderedWindows);

  return reorderedWindows;
}

export function getActiveWindowsOldestFirst() {
  return [...DesktopContext.getActiveWindows()]
    .sort(compareByUserTimeAsc);
}

export function getActiveWindowsNewestFirst() {
  return [...DesktopContext.getActiveWindows()]
    .sort(compareByUserTimeDesc);
}

