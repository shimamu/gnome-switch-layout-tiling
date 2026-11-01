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
import { Slider } from 'resource:///org/gnome/shell/ui/slider.js';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as fn from '../../logic/functional.js';
import { PATTERN } from '../../logic/layoutPatterns.js';
import { LayoutPreview } from '../components/layoutPreview.js';


function toPercentage(ratio) {
  return (ratio * 100).toFixed(0);
}


export class LayoutPatternSelector {
  static #OPACITY = {
    ENABLED: 255,
    DISABLED: 100,
  };

  static SelectableMode = fn.deepFreeze({
    ONLY_NONE: 'only-none',
    NONE_AND_ALL_PATTERNS: 'none_and_all_patterns',
    ALL_PATTERNS: 'all_patterns',
  });

  constructor({
    availablePatterns,
    currentPattern,
    handlers = {},
  }) {
    this._availablePatterns = availablePatterns;
    this._currentSelectedPattern = currentPattern;
    this._handlers = handlers;

    this._container = new St.BoxLayout({
      vertical: true,
      style_class: 'layout-pattern-selector-container',
    });

    this._createComponents();
    this._buildUI();
    this.updatePatternListItems();

    this.applySelectableMode(
      LayoutPatternSelector.SelectableMode.NONE_AND_ALL_PATTERNS,
    );
  }

  applySelectableMode(mode) {
    this._selectablePatterns = this._getPatternsForSelectableMode(mode);

    this._patternListItems.forEach(({ pattern, container }) => {
      const selectable = this._selectablePatterns.includes(pattern);

      container.reactive = selectable;
      container.can_focus = selectable;
      container.opacity = selectable
        ? LayoutPatternSelector.#OPACITY.ENABLED
        : LayoutPatternSelector.#OPACITY.DISABLED;
    });
  }

  updatePatternListItems() {
    this._patternList.remove_all_children();
    this._patternListItems = [];

    [PATTERN.NONE, ...this._availablePatterns].forEach((pattern) => {
      const container = this._createPatternListItem(pattern);

      this._patternList.add_child(container);
      this._patternListItems.push({ pattern, container });
    });
  }

  get actor() {
    return this._container;
  }

  get currentSelectedPattern() {
    return this._currentSelectedPattern;
  }

  _createComponents() {
    this._patternList = new St.BoxLayout({
      vertical: true,
      style_class: 'layout-pattern-selector-list',
      visible: true,
      reactive: true,
      can_focus: true,
    });
  }

  _buildUI() {
    this._container.add_child(this._patternList);
  }

  _createPatternListItem(pattern) {
    const patternLabel = new St.Label({
      text: _(pattern),
      style_class: 'layout-pattern-selector-list-item',
    });

    const layoutPreview = new LayoutPreview({ pattern });

    const container = new St.BoxLayout({
      reactive: true,
      track_hover: true,
      style_class: 'popup-menu-item layout-pattern-selector-list-item-container',
    });

    container.add_child(layoutPreview.actor);
    container.add_child(patternLabel);

    container.connect('button-press-event', () => {
      if (!this._selectablePatterns.includes(pattern))
        return Clutter.EVENT_STOP;

      this._currentSelectedPattern = pattern;
      this._handlers.onPatternChange?.();

      return Clutter.EVENT_STOP;
    });

    return container;
  }

  _getPatternsForSelectableMode(mode) {
    const { ONLY_NONE, NONE_AND_ALL_PATTERNS, ALL_PATTERNS } = LayoutPatternSelector.SelectableMode;
    const selectablePatterns = {
      [ONLY_NONE]: [PATTERN.NONE],
      [NONE_AND_ALL_PATTERNS]: [PATTERN.NONE, ...this._availablePatterns],
      [ALL_PATTERNS]: this._availablePatterns,
    };

    return selectablePatterns[mode] ?? [];
  }
}


export class LayoutSplitSlider {
  static #MIN_SPLIT_RATIO = 0.3;
  static #MAX_SPLIT_RATIO = 0.7;

  constructor({
    splitRatios,
    handlers = {},
  }) {
    this._splitRatios = splitRatios;
    this._handlers = handlers;

    this._container = new St.BoxLayout({
      vertical: true,
      style_class: 'layout-split-slider-container',
    });

    this._createComponents();
    this._buildUI();
  }

  get splitRatios() {
    return this._sliderPanes.map(sliderPane => sliderPane.slider.value);
  }

  get actor() {
    return this._container;
  }

  _createComponents() {
    this._sliderPanes = [];

    this._splitRatios.forEach((splitRatio, i) => {
      const lineLabel = new St.Label({
        text: _('Split Line %s:').replace(
          '%s',
          i + 1,
        ),
        y_align: Clutter.ActorAlign.CENTER,
        style_class: 'layout-split-slider-line-label',
      });
      const slider = new Slider(splitRatio);
      const ratioEntry = new St.Entry({
        hint_text: String(toPercentage(splitRatio)),
        style_class: 'layout-split-slider-line-ratio-entry',
        can_focus: true,
        x_expand: false,
      });
      const percentLabel = new St.Label({
        text: '%',
        y_align: Clutter.ActorAlign.CENTER,
        style_class: 'layout-split-slider-line-percent-label',
      });

      ratioEntry.clutter_text.connect('activate', () => {
        const text = ratioEntry.text.trim();
        const percentage = Number(text);

        if (
          text === '' ||
          !Number.isFinite(percentage)
        ) {
          ratioEntry.set_text('');
          ratioEntry.set_hint_text(
            `${toPercentage(slider.value)}`,
          );
          return;
        }

        slider.value = fn.clamp(
          LayoutSplitSlider.#MIN_SPLIT_RATIO,
          LayoutSplitSlider.#MAX_SPLIT_RATIO,
        )(percentage / 100);

        // Update the entry with the clamped value.
        ratioEntry.set_text(
          String(toPercentage(slider.value)),
        );
      });

      slider.connect('notify::value', () => {
        slider.value = fn.clamp(
          LayoutSplitSlider.#MIN_SPLIT_RATIO,
          LayoutSplitSlider.#MAX_SPLIT_RATIO,
        )(slider.value);

        const percentage = toPercentage(slider.value);

        if (ratioEntry.text === '')
          ratioEntry.set_hint_text(`${percentage}`);
        else
          ratioEntry.set_text(String(percentage));

        this._handlers.onSplitChange?.();
      });

      this._sliderPanes.push({
        container: new St.BoxLayout({
          vertical: false,
          style_class: 'layout-split-slider-line-container',
        }),
        lineLabel,
        slider,
        ratioEntry,
        percentLabel,
      });
    });
  }

  _buildUI() {
    this._sliderPanes.forEach(({ container, lineLabel, slider, ratioEntry, percentLabel }) => {
      container.add_child(lineLabel);
      container.add_child(slider);
      container.add_child(ratioEntry);
      container.add_child(percentLabel);
      this._container.add_child(container);
    });
  }
}


export class LayoutPreviewPane {
  constructor(layout) {
    this._container = new St.BoxLayout({
      style_class: 'layout-preview-pane-container',
    });

    this._createComponents(layout);
    this._buildUI();
  }

  renderPreview(layout) {
    this._preview.render(layout);
    this._patternLabel.text = _(layout.pattern);
  }

  get actor() {
    return this._container;
  }

  _createComponents(layout) {
    this._preview = new LayoutPreview(layout);

    this._patternLabel = new St.Label({
      text: _(layout.pattern),
      style_class: 'layout-preview-pane-pattern-label',
    });

  }

  _buildUI() {
    this._container.add_child(this._preview.actor);
    this._container.add_child(this._patternLabel);
  }
}
