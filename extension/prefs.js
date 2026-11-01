/*
 * Switch Layout Tiling
 *
 * Copyright (C) 2026  shimamu
 *
 * https://github.com/shimamu/switch-layout-tiling
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { LogLevel } from './io/logger.js';
import { SettingsKeys } from './io/settings.js';

export default class SwitchLayoutTilingPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();
    const page = this._createPage();

    page.add(this._createAppearanceGroup(settings));
    page.add(this._createDeveloperGroup(settings));

    window.add(page);
  }

  _createPage() {
    return new Adw.PreferencesPage({
      title: _('General'),
      icon_name: 'dialog-information-symbolic',
    });
  }

  _createAppearanceGroup(settings) {
    const group = new Adw.PreferencesGroup({
      title: _('Appearance'),
      description: _('Configure the appearance of the extension'),
    });

    const tileGapRow = new Adw.SpinRow({
      title: _('Tile Gap (px)'),
      subtitle: _('Gap between tiled windows'),
      adjustment: new Gtk.Adjustment({
        lower: 1,
        upper: 20,
        step_increment: 1,
      }),
    });

    settings.bind(
      SettingsKeys.TILE_MARGIN,
      tileGapRow,
      'value',
      Gio.SettingsBindFlags.DEFAULT
    );

    group.add(tileGapRow);

    return group;
  }

  _createDeveloperGroup(settings) {
    const group = new Adw.PreferencesGroup({
      title: _('Developer Options'),
      description: _('Advanced and debugging settings'),
    });

    const logLevelLabels = Object.entries(LogLevel)
      .filter(([, v]) => typeof v === 'number')
      .sort(([, a], [, b]) => a - b)
      .map(([k, v]) => `${v} - ${k}`);

    const logLevelRow = new Adw.ComboRow({
      title: _('Log Level'),
      subtitle: _('Control how verbose the logging is'),
      model: Gtk.StringList.new(logLevelLabels),
    });

    settings.bind(
      SettingsKeys.LOG_LEVEL,
      logLevelRow,
      'selected',
      Gio.SettingsBindFlags.DEFAULT
    );

    group.add(logLevelRow);

    return group;
  }
}
