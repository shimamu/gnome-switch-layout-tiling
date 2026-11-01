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


export const SettingsKeys = {
  LAYOUT_MAPS: 'layout-maps',
  LOG_LEVEL: 'log-level',
  TILE_MARGIN: 'tile-margin',
  WORKSPACE_LAYOUT_MAP_INDEX_MAP: 'workspace-layout-map-index-map',
};

export const loadLayoutMapsRaw = (settings) =>
  fn.deepFreeze(
    JSON.parse(settings.get_string(SettingsKeys.LAYOUT_MAPS))
  );

export const saveLayoutMapsRaw = (settings, layoutMaps) =>
  settings.set_string(SettingsKeys.LAYOUT_MAPS, JSON.stringify(layoutMaps));

const loadLogLevelRaw = (settings) =>
  settings.get_int(SettingsKeys.LOG_LEVEL);

const loadTileMarginRaw = (settings) =>
  settings.get_int(SettingsKeys.TILE_MARGIN);

export const loadWorkspaceLayoutMapIndexMapRaw = (settings) =>
  JSON.parse(
    settings.get_string(SettingsKeys.WORKSPACE_LAYOUT_MAP_INDEX_MAP)
  );

export const saveWorkspaceLayoutMapIndexMapRaw = (
  settings,
  workspaceLayoutMapIndexMap,
) =>
  settings.set_string(
    SettingsKeys.WORKSPACE_LAYOUT_MAP_INDEX_MAP,
    JSON.stringify(workspaceLayoutMapIndexMap)
  );


export class LayoutPreferences {
  constructor(settings) {
    this._settings = settings;
  }

  getTileMargin() {
    return loadTileMarginRaw(this._settings);
  }

  onTileMarginChanged(callback) {
    return this._settings.connect(
      `changed::${SettingsKeys.TILE_MARGIN}`,
      callback
    );
  }

  disconnect(signalId) {
    this._settings.disconnect(signalId);
  }
}


export class DeveloperPreferences {
  constructor(settings) {
    this._settings = settings;
  }

  getLogLevel() {
    return loadLogLevelRaw(this._settings);
  }

  onLogLevelChanged(callback) {
    return this._settings.connect(
      `changed::${SettingsKeys.LOG_LEVEL}`,
      callback
    );
  }

  disconnect(signalId) {
    this._settings.disconnect(signalId);
  }
}
