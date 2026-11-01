/*
 * Switch Layout Tiling
 *
 * Copyright (C) 2026  shimamu
 *
 * https://github.com/shimamu/switch-layout-tiling
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Clutter from 'gi://Clutter';
import { Indicator } from './ui/indicator.js';
import { LayoutMapEditor } from './ui/editor/layoutMapEditor.js';
import { DeveloperPreferences, LayoutPreferences } from './io/settings.js';
import { logger } from './io/logger.js';
import { WindowPlacer } from './io/windowPlacer.js';
import { pipe } from './logic/functional.js';
import { LayoutMapsManager } from './logic/layoutMapsManager.js';
import { TilingCoordinator } from './logic/tilingCoordinator.js';
import { WorkspaceFixedAreaSelection } from './logic/workspaceFixedAreaSelection.js';
import { WorkspaceLayoutMapSelection } from './logic/workspaceLayoutMapSelection.js';


const TILE_DELAY_MS = {
  AFTER_CREATE: 800,
  AFTER_UNMANAGED: 100,
  AFTER_MINIMIZED: 100,
};

const LAYOUT_MAP_MOVE_DIRECTION = {
  UP: -1,
  DOWN: 1,
};


export default class SwitchLayoutTilingExtension extends Extension {

  enable() {
    this._extensionId = this.uuid.split('@')[0];
    logger.setExtensionId(this._extensionId);
    logger.info('Enabling extension');

    this._createComponents();
    this._connectSignals();

    this._tilingCoordinator.tileWindows();
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;

    this._disconnectSignals();
  }

  rotateWindowsOnScroll(direction) {
    const fixedAreaIndexes = pipe(
      this._getActiveLayoutMap(),
      (layoutMap) => this._windowPlacer.getSplitAreaCount(layoutMap),
      (splitAreaCount) => this._workspaceFixedAreaIndexMap.getFixedAreaIndexesForSplitAreas(splitAreaCount),
    );

    switch (direction) {
    case Clutter.ScrollDirection.DOWN:
      logger.info('Rotate layout map clockwise');
      this._tilingCoordinator.rotateWindowsClockwise(fixedAreaIndexes);
      break;
    case Clutter.ScrollDirection.UP:
      logger.info('Rotate layout map counterclockwise');
      this._tilingCoordinator.rotateWindowsCounterClockwise(fixedAreaIndexes);
      break;
    }
  }

  openLayoutMapEditor(layoutMapIndex) {
    const editor = new LayoutMapEditor({
      layoutMap: this._layoutMapsManager.getLayoutMap(layoutMapIndex),
      layoutMapIndex,
      handlers: {
        onSave: (newLayoutMap) => {
          this._layoutMapsManager.updateLayoutMap(layoutMapIndex, newLayoutMap);
          this._layoutMapsManager.save();
          this._tilingCoordinator.tileWindows();
          this._indicator.refresh();
        },
        onClose: () => {
          this._indicator.openPanelMenuLater();
        },
      },
    });

    editor.open();
  }

  moveLayoutMapOneStep(sourceIndex, direction) {
    const targetIndex = sourceIndex + direction;
    if (!this._layoutMapsManager.swap(sourceIndex, targetIndex))
      return;

    this._workspaceLayoutMapSelection.updateIndexAfterLayoutMapSwap(sourceIndex, targetIndex);

    this._layoutMapsManager.save();
    this._workspaceLayoutMapSelection.save();
  }

  addNewLayoutMap() {
    const layoutMap = this._layoutMapsManager.addNewLayoutMap();
    if (!layoutMap) {
      logger.warn(`Cannot add more than ${LayoutMapsManager.MAX_LAYOUT_COUNT} layouts`);
      Main.notify(
        this.metadata.name,
        _('You can only add up to %s layouts').replace(
          '%s',
          LayoutMapsManager.MAX_LAYOUT_COUNT,
        ),
      );
      return;
    }

    this._layoutMapsManager.save();

    return layoutMap;
  }

  _createComponents() {
    const settings = this.getSettings();
    this._developerPreferences = new DeveloperPreferences(settings);
    this._layoutPreferences = new LayoutPreferences(settings);

    logger.setLevel(this._developerPreferences.getLogLevel());

    this._workspaceLayoutMapSelection = new WorkspaceLayoutMapSelection(settings);
    this._workspaceLayoutMapSelection.load();
    this._workspaceFixedAreaIndexMap = new WorkspaceFixedAreaSelection();

    this._layoutMapsManager = new LayoutMapsManager(settings);
    this._layoutMapsManager.load();

    this._windowPlacer =  new WindowPlacer(this._layoutPreferences);
    this._tilingCoordinator = new TilingCoordinator({
      dataSource: {
        getActiveLayoutMap: () => this._getActiveLayoutMap(),
      },
      windowPlacer: this._windowPlacer,
    });

    this._indicator = new Indicator({
      iconsPath: `${this.path}/icons`,
      extensionUuid: this.uuid,
      extensionId: this._extensionId,
      indicatorName: this.metadata.name,
      dataSource: {
        getFixedAreaIndexes: () => this._workspaceFixedAreaIndexMap.getFixedAreaIndexes(),
        getLayoutMapIndex: () => this._workspaceLayoutMapSelection.getLayoutMapIndex(),
        getLayoutMaps: () => this._layoutMapsManager.getLayoutMaps(),
      },
      handlers: {
        onRetileWindows: () => {
          this._tilingCoordinator.tileWindows();
        },
        onClearFixedAreas: () => {
          this._workspaceFixedAreaIndexMap.clearFixedAreas();
        },
        onToggleFixedArea: (areaIndex) => {
          this._workspaceFixedAreaIndexMap.toggleFixedArea(areaIndex);
        },
        onLayoutMapActivate: (layoutMapIndex) => {
          this._workspaceLayoutMapSelection.setLayoutMapIndex(layoutMapIndex);
          this._workspaceLayoutMapSelection.save();
          this._tilingCoordinator.tileWindows();
        },
        onLayoutMapMoveUp: (layoutMapIndex) => {
          this.moveLayoutMapOneStep(layoutMapIndex, LAYOUT_MAP_MOVE_DIRECTION.UP);
        },
        onLayoutMapMoveDown: (layoutMapIndex) => {
          this.moveLayoutMapOneStep(layoutMapIndex, LAYOUT_MAP_MOVE_DIRECTION.DOWN);
        },
        onLayoutMapEdit: (layoutMapIndex) => {
          this.openLayoutMapEditor(layoutMapIndex);
        },
        onLayoutMapDelete: (layoutMapIndex) => {
          this._layoutMapsManager.remove(layoutMapIndex);
          this._layoutMapsManager.save();
          this._workspaceLayoutMapSelection.updateIndexAfterDeleteLayoutMap(
            layoutMapIndex,
            this._layoutMapsManager.getLayoutMaps().length - 1,
          );
          this._workspaceLayoutMapSelection.save();
          this._tilingCoordinator.tileWindows();
        },
        onAddNewLayoutMap: () => {
          return this.addNewLayoutMap();
        },
        onIndicatorScroll: (direction) => {
          this.rotateWindowsOnScroll(direction);
        },
      },
    });
  }

  _connectSignals() {
    this._updateLoggerOnLogLevelChanged();
    this._updateIndicatorMenuOnWorkspaceSwitched();
    this._enableRetilingOnTileMarginChanged();
    this._enableRetilingOnWindowLifecycleEvent();
  }

  _getActiveLayoutMap() {
    const layoutMapIndex = this._workspaceLayoutMapSelection.getLayoutMapIndex();
    return this._layoutMapsManager.getLayoutMap(layoutMapIndex);
  }

  _onWindowCreated(display, targetWindow) {
    if (!targetWindow || targetWindow.skip_taskbar || targetWindow.minimized)
      return;

    // When the window is no longer managed by GNOME Shell (e.g. when it is closed)
    targetWindow.connect('unmanaged', () => {
      this._tilingCoordinator.tileWindowsLater(TILE_DELAY_MS.AFTER_UNMANAGED);
      this._indicator.updateWindowCountLater(TILE_DELAY_MS.AFTER_UNMANAGED);
    });

    targetWindow.connect('notify::minimized', () => {
      this._tilingCoordinator.tileWindowsLater(TILE_DELAY_MS.AFTER_MINIMIZED);
      this._indicator.updateWindowCountLater(TILE_DELAY_MS.AFTER_MINIMIZED);
    });

    this._tilingCoordinator.tileWindowsLater(TILE_DELAY_MS.AFTER_CREATE);
    this._indicator.updateWindowCountLater(TILE_DELAY_MS.AFTER_CREATE);
  }

  _onWorkspaceSwitched() {
    this._indicator.updateActiveLayoutMapCheck();
    this._indicator.updateFixedAreaChecks();
    this._indicator.updateWindowCountLater();
  }

  _updateLoggerOnLogLevelChanged() {
    this._logLevelChangedId = this._developerPreferences.onLogLevelChanged(() => {
      logger.setLevel(this._developerPreferences.getLogLevel());
      logger.info('Log level changed to', logger.levelName());
    });
  }

  _updateIndicatorMenuOnWorkspaceSwitched() {
    this._onWorkspaceSwitched = this._onWorkspaceSwitched.bind(this);
    this._workspaceSwitchedId = global.workspace_manager.connect('active-workspace-changed', this._onWorkspaceSwitched);
  }

  _enableRetilingOnTileMarginChanged() {
    this._tileMarginChangedId = this._layoutPreferences.onTileMarginChanged(() => {
      this._tilingCoordinator.tileWindows();
    });
  }

  _enableRetilingOnWindowLifecycleEvent() {
    this._onWindowCreated = this._onWindowCreated.bind(this);
    this._windowCreatedId = global.display.connect('window-created', this._onWindowCreated);
  }

  _disconnectSignals() {
    if (this._logLevelChangedId)
      this._developerPreferences.disconnect(this._logLevelChangedId);

    if (this._workspaceSwitchedId)
      global.workspace_manager.disconnect(this._workspaceSwitchedId);

    if (this._tileMarginChangedId)
      this._layoutPreferences.disconnect(this._tileMarginChangedId);

    if (this._windowCreatedId)
      global.display.disconnect(this._windowCreatedId);
  }
}
