/*
 * Switch Layout Tiling
 *
 * Copyright (C) 2026  shimamu
 *
 * https://github.com/shimamu/switch-layout-tiling
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { describe, expect, it, vi } from 'vitest';

import {
  SettingsKeys,
  loadLayoutMapsRaw,
  saveLayoutMapsRaw,
  loadWorkspaceLayoutMapIndexMapRaw,
  saveWorkspaceLayoutMapIndexMapRaw,
} from '../../extension/io/settings.js';

function createSettings() {
  return {
    get_string: vi.fn(),
    set_string: vi.fn(),
  };
}

describe('loadLayoutMapsRaw', () => {
  it('loads and deeply freezes layout maps', () => {
    const settings = createSettings();
    const layoutMaps = [
      {
        1: { pattern: 'FULL' },
        2: { pattern: 'VERTICAL' },
      },
    ];

    settings.get_string.mockReturnValue(JSON.stringify(layoutMaps));

    const result = loadLayoutMapsRaw(settings);

    expect(settings.get_string).toHaveBeenCalledWith(
      SettingsKeys.LAYOUT_MAPS,
    );
    expect(result).toEqual(layoutMaps);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result[0])).toBe(true);
    expect(Object.isFrozen(result[0][1])).toBe(true);
  });
});

describe('saveLayoutMapsRaw', () => {
  it('saves layout maps as JSON', () => {
    const settings = createSettings();
    const layoutMaps = [
      {
        1: { pattern: 'FULL' },
        2: { pattern: 'VERTICAL' },
      },
    ];

    saveLayoutMapsRaw(settings, layoutMaps);

    expect(settings.set_string).toHaveBeenCalledWith(
      SettingsKeys.LAYOUT_MAPS,
      JSON.stringify(layoutMaps),
    );
  });
});

describe('loadWorkspaceLayoutMapIndexMapRaw', () => {
  it('loads the workspace layout map index map', () => {
    const settings = createSettings();
    const indexMap = { '0': 1, '1': 2 };

    settings.get_string.mockReturnValue(JSON.stringify(indexMap));

    expect(loadWorkspaceLayoutMapIndexMapRaw(settings)).toEqual(indexMap);
    expect(settings.get_string).toHaveBeenCalledWith(
      SettingsKeys.WORKSPACE_LAYOUT_MAP_INDEX_MAP,
    );
  });
});

describe('saveWorkspaceLayoutMapIndexMapRaw', () => {
  it('saves the workspace layout map index map as JSON', () => {
    const settings = createSettings();
    const indexMap = { '0': 1, '1': 2 };

    saveWorkspaceLayoutMapIndexMapRaw(settings, indexMap);

    expect(settings.set_string).toHaveBeenCalledWith(
      SettingsKeys.WORKSPACE_LAYOUT_MAP_INDEX_MAP,
      JSON.stringify(indexMap),
    );
  });
});
