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


export class WorkspaceFixedAreaSelection {
  constructor() {
    this._workspaceFixedAreaIndexMap = {};
  }

  getFixedAreaIndexes() {
    return new Set(this._getFixedAreaIndexes());
  }

  getFixedAreaIndexesForSplitAreas(splitAreaCount) {
    const fixedAreaIndexes = this.getFixedAreaIndexes();
    return new Set([...fixedAreaIndexes].filter(index => index < splitAreaCount));
  }

  toggleFixedArea(areaIndex) {
    const fixedAreaIndexes = this._getFixedAreaIndexes();

    if (fixedAreaIndexes.has(areaIndex))
      fixedAreaIndexes.delete(areaIndex);
    else
      fixedAreaIndexes.add(areaIndex);
  }

  clearFixedAreas() {
    this._getFixedAreaIndexes().clear();
  }

  _getFixedAreaIndexes() {
    const workspaceIndex = DesktopContext.getActiveWorkspaceIndex();

    if (!(workspaceIndex in this._workspaceFixedAreaIndexMap))
      this._workspaceFixedAreaIndexMap[workspaceIndex] = new Set();

    return this._workspaceFixedAreaIndexMap[workspaceIndex];
  }
}
