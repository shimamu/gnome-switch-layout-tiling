/*
 * Switch Layout Tiling
 *
 * Copyright (C) 2026  shimamu
 *
 * https://github.com/shimamu/switch-layout-tiling
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import { logger } from '../../io/logger.js';
import * as fn from '../../logic/functional.js';
import {
  MAX_SPLIT_AREA_COUNT,
  isNoLayout,
  layoutOf,
  updateLayoutMap,
} from '../../logic/layoutOperations.js';
import { LayoutConfigurator } from './layoutConfigurator.js';
import { LayoutPatternSelector } from './layoutConfiguratorComponents.js';


class ActionButtonsPane {
  constructor(handlers = {}) {
    this._handlers = handlers;

    this._container = new St.BoxLayout({
      style_class: 'layout-map-editor-action-buttons-pane',
      x_align: Clutter.ActorAlign.CENTER,
    });

    this._createComponents();
    this._build();
  }

  get actor() {
    return this._container;
  }

  _createComponents() {
    this._saveButton = new St.Button({
      label: _('Save'),
      style_class: 'button',
    });
    this._saveButton.connect('clicked', this._handlers.onSave);

    this._cancelButton = new St.Button({
      label: _('Cancel'),
      style_class: 'button',
    });
    this._cancelButton.connect('clicked', this._handlers.onCancel);
  }

  _build() {
    this._container.add_child(this._saveButton);
    this._container.add_child(this._cancelButton);
  }
}


class LayoutMapUpdateController {
  constructor(layoutMap) {
    this._layoutMap = layoutMap;
    this._listeners = {};
  }

  layoutFor(splitAreaCount) {
    return layoutOf(this._layoutMap, splitAreaCount);
  }

  subscribeLayoutUpdated(splitAreaCount, callback) {
    this._subscribe(
      this._layoutUpdateEventName(splitAreaCount),
      callback,
    );
  }

  updateLayout(splitAreaCount, newLayout) {
    logger.debug(
      `Updating layout (split area count: ${splitAreaCount})`,
    );

    this._layoutMap = updateLayoutMap(
      this._layoutMap,
      splitAreaCount,
      newLayout,
    );

    this._emitLayoutUpdated(splitAreaCount, newLayout);
  }

  notifyLayout(splitAreaCount) {
    const layout = this.layoutFor(splitAreaCount);
    this._emitLayoutUpdated(splitAreaCount, layout);
  }

  get layoutMap() {
    return this._layoutMap;
  }

  _subscribe(eventName, callback) {
    this._listeners = fn.addToArrayAt(
      this._listeners,
      eventName,
      callback,
    );
  }

  _emitLayoutUpdated(splitAreaCount, layout) {
    this._emit(this._layoutUpdateEventName(splitAreaCount), layout);
  }

  _emit(eventName, data) {
    const listeners = this._listeners[eventName] || [];

    logger.debug(
      `Emitting event "${eventName}" to ${listeners.length} listener(s)`,
    );

    listeners.forEach(callback => callback(data));
  }

  _layoutUpdateEventName(splitAreaCount) {
    return `layout${splitAreaCount}-updated`;
  }
}


export class LayoutMapEditor {
  constructor({
    layoutMap,
    layoutMapIndex,
    handlers = {},
  }) {
    this._layoutMapUpdateController = new LayoutMapUpdateController(layoutMap);
    this._layoutMapIndex = layoutMapIndex;
    this._handlers = handlers;
    this._closing = false;

    this._dialog = new ModalDialog.ModalDialog({
      styleClass: 'layout-map-editor-dialog',
    });

    this._container = new St.BoxLayout({
      style_class: 'layout-map-editor-container',
      vertical: true,
    });

    this._dialog.contentLayout.add_child(this._container);

    this._createComponents();
    this._setComponentRelationships();
    this._buildUI();
  }

  open() {
    if (this._closing)
      return;

    this._dialog.open();
  }

  _createComponents() {
    this._createLayoutConfigurators();
    this._createActionButtonsPane(this._handlers.onSave);
  }

  _setComponentRelationships() {
    this._subscribeLayoutConfiguratorToNeighborLayouts();
    this._syncLayoutConfiguratorsWithNeighborLayouts();
  }

  _buildUI() {
    this._container.add_child(new St.Label({
      text: _('Edit Layout %s').replace(
        '%s',
        this._layoutMapIndex + 1,
      ),
      style_class: 'layout-map-editor-container-title-label',
    }));

    const layoutConfiguratorsPane = new St.BoxLayout({
      style_class: 'layout-configurators-pane',
      vertical: false,
    });

    fn.range(
      1,
      MAX_SPLIT_AREA_COUNT,
    ).forEach(splitAreaCount => {
      const layoutConfigurator =
      this._layoutConfigurators.get(splitAreaCount);

      layoutConfiguratorsPane.add_child(layoutConfigurator.actor);
    });

    this._container.add_child(
      new PopupMenu.PopupSeparatorMenuItem(),
    );
    this._container.add_child(layoutConfiguratorsPane);
    this._container.add_child(this._actionButtonsPane.actor);
  }

  _close() {
    if (this._closing)
      return;

    this._closing = true;

    this._dialog.close();

    this._handlers.onClose?.();
  }

  _createLayoutConfigurators() {
    this._layoutConfigurators = new Map();

    fn.range(1, MAX_SPLIT_AREA_COUNT).forEach(splitAreaCount => {
      const configurator = new LayoutConfigurator({
        splitAreaCount,
        layout: this._layoutMapUpdateController.layoutFor(
          splitAreaCount,
        ),
        handlers: {
          onLayoutUpdate: layout =>
            this._layoutMapUpdateController.updateLayout(
              splitAreaCount,
              layout,
            ),
        },
      });

      this._layoutConfigurators.set(
        splitAreaCount,
        configurator,
      );
    });
  }

  _subscribeLayoutConfiguratorToNeighborLayouts() {
    fn.range(1, MAX_SPLIT_AREA_COUNT).forEach(splitAreaCount => {
      const layoutConfigurator =
        this._layoutConfigurators.get(splitAreaCount);

      if (!layoutConfigurator)
        return;

      [-1, +1].forEach(offset => {
        const neighborSplitAreaCount = splitAreaCount + offset;

        if (!this._layoutConfigurators.has(neighborSplitAreaCount))
          return;

        this._layoutMapUpdateController.subscribeLayoutUpdated(
          neighborSplitAreaCount,
          layout => {
            const mode =
              this._selectableLayoutPatternModeFromNeighborLayout(
                neighborSplitAreaCount,
                splitAreaCount,
                layout,
              );

            if (mode !== null) {
              logger.debug(
                `Updating selectable mode (split area count: ${splitAreaCount}, mode: ${mode})`,
              );

              layoutConfigurator.applySelectableMode(mode);
            }
          },
        );
      });
    });
  }

  _syncLayoutConfiguratorsWithNeighborLayouts() {
    fn.range(1, MAX_SPLIT_AREA_COUNT).forEach(splitAreaCount => {
      this._layoutMapUpdateController.notifyLayout(splitAreaCount);
    });
  }

  _createActionButtonsPane(onSave) {
    this._actionButtonsPane = new ActionButtonsPane({
      onSave: () => {
        if (this._closing)
          return;

        const layoutMap = this._layoutMapUpdateController.layoutMap;

        logger.info(
          `Saving layout map (index: ${this._layoutMapIndex})`,
        );

        // Close the UI before saving.
        // The save callback may destroy the editor, so avoid calling _close() again afterward.
        this._close();
        onSave(layoutMap);
      },

      onCancel: () => {
        this._close();
      },
    });
  }

  _selectableLayoutPatternModeFromNeighborLayout(
    neighborSplitAreaCount,
    targetSplitAreaCount,
    neighborLayout,
  ) {
    if (targetSplitAreaCount == 1)
      return LayoutPatternSelector.SelectableMode.ALL_PATTERNS;

    if (neighborSplitAreaCount === 1)
      return null;

    if (neighborSplitAreaCount === targetSplitAreaCount + 1) {
      return isNoLayout(neighborLayout)
        ? LayoutPatternSelector.SelectableMode.NONE_AND_ALL_PATTERNS
        : LayoutPatternSelector.SelectableMode.ALL_PATTERNS;
    }

    if (neighborSplitAreaCount === targetSplitAreaCount - 1) {
      return isNoLayout(neighborLayout)
        ? LayoutPatternSelector.SelectableMode.ONLY_NONE
        : LayoutPatternSelector.SelectableMode.NONE_AND_ALL_PATTERNS;
    }

    return null;
  }
}
