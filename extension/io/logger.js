/*
 * Switch Layout Tiling
 *
 * Copyright (C) 2026  shimamu
 *
 * https://github.com/shimamu/switch-layout-tiling
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import * as fn from '../logic/functional.js';


export const LogLevel = fn.deepFreeze({
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,

  nameOf(level) {
    return Object.entries(this).find(([, v]) => v === level)?.[0] ?? 'UNKNOWN';
  },
});


export class Logger {
  constructor(level = LogLevel.INFO) {
    this._level = level;
    this._extensionId = '-';
  }

  setExtensionId(extensionId) {
    this._extensionId = extensionId;
  }

  setLevel(level) {
    this._level = level;
  }

  levelName() {
    return LogLevel.nameOf(this._level);
  }

  debug(...msgs) {
    this._log(LogLevel.DEBUG, ...msgs);
  }

  info(...msgs) {
    this._log(LogLevel.INFO, ...msgs);
  }

  warn(...msgs) {
    this._log(LogLevel.WARN, ...msgs);
  }

  error(...msgs) {
    this._log(LogLevel.ERROR, ...msgs);
  }

  _log(level, ...msgs) {
    if (!this._shouldLog(level))
      return;

    log(`[${this._extensionId}] [${this.levelName()}] ${msgs.join(' ')}`);
  }

  _shouldLog(level) {
    return level >= this._level;
  }
}
