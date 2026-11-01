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

import { DesktopContext } from '../../extension/env/desktopContext.js';
import { WorkspaceFixedAreaSelection } from '../../extension/logic/workspaceFixedAreaSelection.js';

describe('WorkspaceFixedAreaSelection', () => {
  let selection;
  let activeWorkspaceIndex;

  beforeEach(() => {
    activeWorkspaceIndex = 0;

    vi.mocked(DesktopContext.getActiveWorkspaceIndex).mockImplementation(
      () => activeWorkspaceIndex,
    );

    selection = new WorkspaceFixedAreaSelection();
  });

  describe('getFixedAreaIndexes', () => {
    it('returns an empty Set when no areas are selected', () => {
      expect(selection.getFixedAreaIndexes()).toEqual(new Set());
    });

    it('returns the selected area indexes', () => {
      selection.toggleFixedArea(0);
      selection.toggleFixedArea(2);

      expect(selection.getFixedAreaIndexes()).toEqual(new Set([0, 2]));
    });

    it('returns a copy of the internal Set', () => {
      selection.toggleFixedArea(1);

      const fixedAreaIndexes = selection.getFixedAreaIndexes();
      fixedAreaIndexes.add(2);
      fixedAreaIndexes.delete(1);

      expect(selection.getFixedAreaIndexes()).toEqual(new Set([1]));
    });

    it('returns different Set instances on successive calls', () => {
      const first = selection.getFixedAreaIndexes();
      const second = selection.getFixedAreaIndexes();

      expect(first).not.toBe(second);
      expect(first).toEqual(second);
    });

    it('keeps selections independent between workspaces', () => {
      selection.toggleFixedArea(1);

      activeWorkspaceIndex = 1;

      expect(selection.getFixedAreaIndexes()).toEqual(new Set());

      selection.toggleFixedArea(2);

      expect(selection.getFixedAreaIndexes()).toEqual(new Set([2]));

      activeWorkspaceIndex = 0;

      expect(selection.getFixedAreaIndexes()).toEqual(new Set([1]));
    });
  });

  describe('getFixedAreaIndexesForSplitAreas', () => {
    it('returns selected indexes smaller than the split area count', () => {
      selection.toggleFixedArea(0);
      selection.toggleFixedArea(1);
      selection.toggleFixedArea(2);

      expect(
        selection.getFixedAreaIndexesForSplitAreas(2),
      ).toEqual(new Set([0, 1]));
    });

    it('excludes an index equal to the split area count', () => {
      selection.toggleFixedArea(2);

      expect(
        selection.getFixedAreaIndexesForSplitAreas(2),
      ).toEqual(new Set());
    });

    it('returns an empty Set when no areas are selected', () => {
      expect(
        selection.getFixedAreaIndexesForSplitAreas(3),
      ).toEqual(new Set());
    });

    it('does not change the stored selections', () => {
      selection.toggleFixedArea(0);
      selection.toggleFixedArea(1);
      selection.toggleFixedArea(2);

      selection.getFixedAreaIndexesForSplitAreas(1);

      expect(selection.getFixedAreaIndexes()).toEqual(
        new Set([0, 1, 2]),
      );
    });
  });

  describe('toggleFixedArea', () => {
    it('adds an area index when it is not selected', () => {
      selection.toggleFixedArea(1);

      expect(selection.getFixedAreaIndexes()).toEqual(new Set([1]));
    });

    it('removes an area index when it is already selected', () => {
      selection.toggleFixedArea(1);
      selection.toggleFixedArea(1);

      expect(selection.getFixedAreaIndexes()).toEqual(new Set());
    });

    it('toggles only the specified area index', () => {
      selection.toggleFixedArea(0);
      selection.toggleFixedArea(1);
      selection.toggleFixedArea(0);

      expect(selection.getFixedAreaIndexes()).toEqual(new Set([1]));
    });

    it('does not affect another workspace', () => {
      selection.toggleFixedArea(1);

      activeWorkspaceIndex = 1;
      selection.toggleFixedArea(2);

      expect(selection.getFixedAreaIndexes()).toEqual(new Set([2]));

      activeWorkspaceIndex = 0;

      expect(selection.getFixedAreaIndexes()).toEqual(new Set([1]));
    });
  });

  describe('clearFixedAreas', () => {
    it('clears all selected areas in the active workspace', () => {
      selection.toggleFixedArea(0);
      selection.toggleFixedArea(1);
      selection.toggleFixedArea(2);

      selection.clearFixedAreas();

      expect(selection.getFixedAreaIndexes()).toEqual(new Set());
    });

    it('does not clear selections in another workspace', () => {
      selection.toggleFixedArea(1);

      activeWorkspaceIndex = 1;
      selection.toggleFixedArea(2);

      selection.clearFixedAreas();

      expect(selection.getFixedAreaIndexes()).toEqual(new Set());

      activeWorkspaceIndex = 0;

      expect(selection.getFixedAreaIndexes()).toEqual(new Set([1]));
    });

    it('can be called when no areas are selected', () => {
      expect(() => selection.clearFixedAreas()).not.toThrow();

      expect(selection.getFixedAreaIndexes()).toEqual(new Set());
    });
  });
});
