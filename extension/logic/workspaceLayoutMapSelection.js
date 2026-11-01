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
import {
  loadWorkspaceLayoutMapIndexMapRaw,
  saveWorkspaceLayoutMapIndexMapRaw,
} from '../io/settings.js';


export class WorkspaceLayoutMapSelection {
  #INITIAL_LAYOUT_MAP_INDEX = 0;

  constructor(settings) {
    this._settings = settings;
    this._workspaceLayoutMapIndexMap = null;
  }

  getLayoutMapIndex() {
    const workspaceIndex = DesktopContext.getActiveWorkspaceIndex();

    if (!(workspaceIndex in this._workspaceLayoutMapIndexMap)) {
      this.setLayoutMapIndex(this.#INITIAL_LAYOUT_MAP_INDEX);
    }

    return this._workspaceLayoutMapIndexMap[workspaceIndex];
  }

  setLayoutMapIndex(index) {
    const workspaceIndex = DesktopContext.getActiveWorkspaceIndex();

    this._workspaceLayoutMapIndexMap[workspaceIndex] = index;
  }

  updateIndexAfterDeleteLayoutMap(targetIndex, lastLayoutMapIndex) {
    const currentLayoutMapIndex = this.getLayoutMapIndex();
    if (targetIndex < currentLayoutMapIndex)
      this.setLayoutMapIndex(currentLayoutMapIndex - 1);
    else if (lastLayoutMapIndex < currentLayoutMapIndex)
      this.setLayoutMapIndex(lastLayoutMapIndex);
  }

  updateIndexAfterLayoutMapSwap(sourceIndex, targetIndex) {
    const currentLayoutMapIndex = this.getLayoutMapIndex();

    if (currentLayoutMapIndex === sourceIndex)
      this.setLayoutMapIndex(targetIndex);
    else if (currentLayoutMapIndex === targetIndex)
      this.setLayoutMapIndex(sourceIndex);
  };

  load() {
    this._workspaceLayoutMapIndexMap = loadWorkspaceLayoutMapIndexMapRaw(this._settings);
  }

  save() {
    if (this._workspaceLayoutMapIndexMap === null)
      return;

    saveWorkspaceLayoutMapIndexMapRaw(
      this._settings,
      this._workspaceLayoutMapIndexMap
    );
  }
}
