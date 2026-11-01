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

vi.mock('../../extension/env/desktopContext.js', () => ({
  DesktopContext: {
    getActiveWorkspaceIndex: vi.fn(),
  },
}));

vi.mock('../../extension/io/settings.js', () => ({
  loadWorkspaceLayoutMapIndexMapRaw: vi.fn(),
  saveWorkspaceLayoutMapIndexMapRaw: vi.fn(),
}));

import { DesktopContext } from '../../extension/env/desktopContext.js';
import {
  loadWorkspaceLayoutMapIndexMapRaw,
  saveWorkspaceLayoutMapIndexMapRaw,
} from '../../extension/io/settings.js';
import { WorkspaceLayoutMapSelection } from '../../extension/logic/workspaceLayoutMapSelection.js';

describe('WorkspaceLayoutMapSelection', () => {
  let selection;
  let settings;
  let activeWorkspaceIndex;

  beforeEach(() => {
    vi.clearAllMocks();

    activeWorkspaceIndex = 0;
    settings = {};

    vi.mocked(DesktopContext.getActiveWorkspaceIndex).mockImplementation(
      () => activeWorkspaceIndex,
    );

    vi.mocked(loadWorkspaceLayoutMapIndexMapRaw).mockReturnValue({});

    selection = new WorkspaceLayoutMapSelection(settings);
    selection.load();
  });

  describe('getLayoutMapIndex', () => {
    it('returns the initial index when the workspace has no selection', () => {
      expect(selection.getLayoutMapIndex()).toBe(0);
    });

    it('initializes the selection for the active workspace', () => {
      selection.getLayoutMapIndex();

      expect(selection._workspaceLayoutMapIndexMap).toEqual({
        0: 0,
      });
    });

    it('returns the selected layout map index', () => {
      selection.setLayoutMapIndex(2);

      expect(selection.getLayoutMapIndex()).toBe(2);
    });

    it('maintains independent selections for different workspaces', () => {
      selection.setLayoutMapIndex(2);

      activeWorkspaceIndex = 1;

      expect(selection.getLayoutMapIndex()).toBe(0);

      selection.setLayoutMapIndex(3);

      activeWorkspaceIndex = 0;

      expect(selection.getLayoutMapIndex()).toBe(2);

      activeWorkspaceIndex = 1;

      expect(selection.getLayoutMapIndex()).toBe(3);
    });
  });

  describe('setLayoutMapIndex', () => {
    it('sets the index for the active workspace', () => {
      selection.setLayoutMapIndex(2);

      expect(selection.getLayoutMapIndex()).toBe(2);
    });

    it('does not change another workspace selection', () => {
      selection.setLayoutMapIndex(1);

      activeWorkspaceIndex = 1;
      selection.setLayoutMapIndex(3);

      activeWorkspaceIndex = 0;

      expect(selection.getLayoutMapIndex()).toBe(1);

      activeWorkspaceIndex = 1;

      expect(selection.getLayoutMapIndex()).toBe(3);
    });
  });

  describe('updateIndexAfterDeleteLayoutMap', () => {
    it('decrements the selected index when an earlier layout map is deleted', () => {
      selection.setLayoutMapIndex(2);

      selection.updateIndexAfterDeleteLayoutMap(1, 3);

      expect(selection.getLayoutMapIndex()).toBe(1);
    });

    it('decrements the selected index when the first layout map is deleted', () => {
      selection.setLayoutMapIndex(2);

      selection.updateIndexAfterDeleteLayoutMap(0, 3);

      expect(selection.getLayoutMapIndex()).toBe(1);
    });

    it('does not change the selected index when the selected layout map is deleted', () => {
      selection.setLayoutMapIndex(2);

      selection.updateIndexAfterDeleteLayoutMap(2, 2);

      expect(selection.getLayoutMapIndex()).toBe(2);
    });

    it('does not change the selected index when a later layout map is deleted', () => {
      selection.setLayoutMapIndex(1);

      selection.updateIndexAfterDeleteLayoutMap(2, 2);

      expect(selection.getLayoutMapIndex()).toBe(1);
    });

    it('moves the selection to the last remaining layout map when the selected index exceeds it', () => {
      selection.setLayoutMapIndex(3);

      selection.updateIndexAfterDeleteLayoutMap(1, 2);

      expect(selection.getLayoutMapIndex()).toBe(2);
    });

    it('moves the selection to the last remaining layout map when the last layout map is deleted', () => {
      selection.setLayoutMapIndex(3);

      selection.updateIndexAfterDeleteLayoutMap(3, 2);

      expect(selection.getLayoutMapIndex()).toBe(2);
    });

    it('does not change the selected index when it is equal to the last remaining index', () => {
      selection.setLayoutMapIndex(2);

      selection.updateIndexAfterDeleteLayoutMap(3, 2);

      expect(selection.getLayoutMapIndex()).toBe(2);
    });

    it('updates only the active workspace selection', () => {
      selection.setLayoutMapIndex(2);

      activeWorkspaceIndex = 1;
      selection.setLayoutMapIndex(3);

      selection.updateIndexAfterDeleteLayoutMap(1, 2);

      expect(selection.getLayoutMapIndex()).toBe(2);

      activeWorkspaceIndex = 0;

      expect(selection.getLayoutMapIndex()).toBe(2);
    });
  });

  describe('updateIndexAfterLayoutMapSwap', () => {
    it('updates the index when the selected layout map is at the source index', () => {
      selection.setLayoutMapIndex(1);

      selection.updateIndexAfterLayoutMapSwap(1, 3);

      expect(selection.getLayoutMapIndex()).toBe(3);
    });

    it('updates the index when the selected layout map is at the target index', () => {
      selection.setLayoutMapIndex(3);

      selection.updateIndexAfterLayoutMapSwap(1, 3);

      expect(selection.getLayoutMapIndex()).toBe(1);
    });

    it('does not change the index when the selected layout map is not involved', () => {
      selection.setLayoutMapIndex(2);

      selection.updateIndexAfterLayoutMapSwap(1, 3);

      expect(selection.getLayoutMapIndex()).toBe(2);
    });

    it('does not change the index when swapping the same index', () => {
      selection.setLayoutMapIndex(2);

      selection.updateIndexAfterLayoutMapSwap(2, 2);

      expect(selection.getLayoutMapIndex()).toBe(2);
    });

    it('updates only the active workspace selection', () => {
      selection.setLayoutMapIndex(1);

      activeWorkspaceIndex = 1;
      selection.setLayoutMapIndex(3);

      selection.updateIndexAfterLayoutMapSwap(3, 0);

      expect(selection.getLayoutMapIndex()).toBe(0);

      activeWorkspaceIndex = 0;

      expect(selection.getLayoutMapIndex()).toBe(1);
    });
  });

  describe('load', () => {
    it('loads the index map from settings', () => {
      const indexMap = {
        0: 2,
        1: 3,
      };

      vi.mocked(loadWorkspaceLayoutMapIndexMapRaw).mockReturnValue(indexMap);

      selection.load();

      expect(loadWorkspaceLayoutMapIndexMapRaw).toHaveBeenCalledWith(settings);
      expect(selection.getLayoutMapIndex()).toBe(2);

      activeWorkspaceIndex = 1;

      expect(selection.getLayoutMapIndex()).toBe(3);
    });

    it('replaces the current index map with the loaded map', () => {
      selection.setLayoutMapIndex(4);

      const indexMap = {
        0: 1,
      };

      vi.mocked(loadWorkspaceLayoutMapIndexMapRaw).mockReturnValue(indexMap);

      selection.load();

      expect(selection.getLayoutMapIndex()).toBe(1);
    });
  });

  describe('save', () => {
    it('saves the current workspace index map to settings', () => {
      selection.setLayoutMapIndex(2);

      activeWorkspaceIndex = 1;
      selection.setLayoutMapIndex(3);

      selection.save();

      expect(saveWorkspaceLayoutMapIndexMapRaw).toHaveBeenCalledOnce();
      expect(saveWorkspaceLayoutMapIndexMapRaw).toHaveBeenCalledWith(
        settings,
        {
          0: 2,
          1: 3,
        },
      );
    });

    it('does not save when the index map has not been loaded', () => {
      const unloadedSelection = new WorkspaceLayoutMapSelection(settings);

      unloadedSelection.save();

      expect(saveWorkspaceLayoutMapIndexMapRaw).not.toHaveBeenCalled();
    });

    it('does not save when the loaded map is empty', () => {
      selection.save();

      expect(saveWorkspaceLayoutMapIndexMapRaw).toHaveBeenCalledWith(
        settings,
        {},
      );
    });
  });
});
