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
import St from 'gi://St';
import { pipe } from '../../logic/functional.js';
import { patternOf, splitRatioOf } from '../../logic/layoutOperations.js';
import { patternsForSplitAreaCount, LayoutConverter } from '../../logic/layoutPatterns.js';
import { LayoutPreviewPane, LayoutPatternSelector, LayoutSplitSlider } from './layoutConfiguratorComponents.js';


export class LayoutConfigurator {
  constructor({
    splitAreaCount,
    layout,
    handlers = {},
  }) {
    this._splitAreaCount = splitAreaCount;
    this._handlers = handlers;

    this._container = new St.BoxLayout({
      vertical: true,
      style_class: 'layout-configurator-container'
    });

    this._createComponents({ layout });
    this._buildUI();
    this._renderCurrentPreview();
  }

  applySelectableMode(mode) {
    this._patternSelector.applySelectableMode(mode);
  }

  get actor() {
    return this._container;
  }

  _createComponents({ layout }) {
    this._previewPane = new LayoutPreviewPane(layout);

    this._patternSelector = new LayoutPatternSelector({
      availablePatterns: patternsForSplitAreaCount(this._splitAreaCount),
      currentPattern: patternOf(layout),
      handlers: {
        onPatternChange: () => {
          this._renderCurrentPreview();
          this._notifyLayoutUpdated();
        },
      },
    });

    this._splitSlider = pipe(
      this._splitAreaCount,
      (splitAreaCount) => LayoutConverter.splitLineCountOf(splitAreaCount),
      (splitLineCount) => [...Array(splitLineCount)].map((_, i) =>
        splitRatioOf(layout, i)
      ),
      (splitRatios) => new LayoutSplitSlider({
        splitRatios,
        handlers: {
          onSplitChange: () => {
            this._renderCurrentPreview();
            this._notifyLayoutUpdated();
          },
        },
      }),
    );
  }

  _buildUI() {
    this._container.add_child(new St.Label({
      text: _('Layout for %s Split Areas').replace(
        '%s',
        this._splitAreaCount,
      ),
      style_class: 'subtitle',
      style: 'margin-bottom: 6px;',
    }));

    this._container.add_child(this._previewPane.actor);
    this._container.add_child(this._patternSelector.actor);
    this._container.add_child(this._splitSlider.actor);
  }

  _renderCurrentPreview() {
    const layout = this._collectCurrentLayout();
    this._renderPreview(layout);
  }

  _notifyLayoutUpdated() {
    const layout = this._collectCurrentLayout();
    this._handlers.onLayoutUpdate(layout);
  }

  _collectCurrentLayout() {
    return {
      pattern: this._patternSelector.currentSelectedPattern,
      splitRatios: this._splitSlider.splitRatios,
    };
  }

  _renderPreview(layout) {
    this._previewPane.renderPreview(layout);
  }
}
