/*
 * Switch Layout Tiling
 *
 * Copyright (C) 2026  shimamu
 *
 * https://github.com/shimamu/switch-layout-tiling
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import { DesktopContext } from '../env/desktopContext.js';
import { IconFactory } from './components/icons.js';
import { IndicatorMenu } from './indicatorMenu.js';


const INDICATOR_PARAMS_IN_STATUS_AREA = {
  PRIORITY: 0,
  ALIGN: 'right',
};

const INDICATOR_MENU_PARAMS = {
  SOURCE_ALIGNMENT: 0.5,
};


const toCssRgb = color =>
  `rgb(${color.red}, ${color.green}, ${color.blue})`;


export const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    static #WINDOW_COUNT_LABEL_X = 12;
    static #WINDOW_COUNT_LABEL_Y = 0;

    _init({
      iconsPath,
      extensionUuid,
      extensionId,
      indicatorName,
      dataSource = {},
      handlers = {},
      logger,
    }) {
      super._init(INDICATOR_MENU_PARAMS.SOURCE_ALIGNMENT, indicatorName);

      this._iconsPath = iconsPath;
      this._extensionUuid = extensionUuid;
      this._extensionId = extensionId;
      this._dataSource = dataSource;
      this._handlers = handlers;
      this._logger = logger;

      this._openPanelMenuSourceId = null;
      this._updateWindowCountSourceId = null;

      this._createComponents();
      this._buildUI();
      this._connectSignals();

      this.updateWindowCount();
      this._updateWindowCountLabelColor();
    }

    openPanelMenuLater() {
      this._clearOpenPanelMenuSource();

      this._openPanelMenuSourceId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
        this._openPanelMenuSourceId = null;
        this.menu.open();
        return GLib.SOURCE_REMOVE;
      });
    }

    refresh() {
      this._indicatorMenu.refresh();
    }

    updateWindowCount() {
      const windows = DesktopContext.getActiveWindows();

      this._windowCountLabel.text = String(windows.length);
      this._windowCountLabel.visible = windows.length > 0;
    }

    updateWindowCountLater(interval_ms) {
      this._clearUpdateWindowCountSource();

      this._updateWindowCountSourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval_ms, () => {
        this._updateWindowCountSourceId = null;
        this.updateWindowCount();
        return GLib.SOURCE_REMOVE;
      });
    }

    updateFixedAreaChecks() {
      this._indicatorMenu.updateFixedAreaChecks();
    }

    updateActiveLayoutMapCheck() {
      this._indicatorMenu.updateActiveLayoutMapCheck();
    }

    closeMenu() {
      this.menu.close();
    }

    destroy() {
      this._logger.debug(`${this.constructor.name} destroyed`);

      this._clearOpenPanelMenuSource();
      this._clearUpdateWindowCountSource();

      if (this._accentColorChangedId !== undefined) {
        this._interfaceSettings.disconnect(
          this._accentColorChangedId,
        );
        this._accentColorChangedId = undefined;
      }

      this._indicatorMenu?.destroy();
      this._indicatorMenu = null;

      super.destroy();
    }

    _createComponents() {
      this._createIndicatorIcon();
      this._createMenuComponents();
    }

    _buildUI() {
      this.add_child(this._indicatorIcon);
      this.menu.addMenuItem(this._indicatorMenu.actor);
      Main.panel.addToStatusArea(
        this._extensionId,
        this,
        INDICATOR_PARAMS_IN_STATUS_AREA.PRIORITY,
        INDICATOR_PARAMS_IN_STATUS_AREA.ALIGN,
      );
    }

    _connectSignals() {
      this._connectScrollEvent();
      this._startAccentColorTracking();
    }

    _createIndicatorIcon() {
      this._indicatorIcon = new St.Widget({
        layout_manager: new Clutter.FixedLayout(),
        x_expand: false,
        y_expand: false,
        y_align: Clutter.ActorAlign.CENTER,
      });

      const iconPath = `${this._iconsPath}/gnome-panel-icon.svg`;
      const icon = IconFactory.createIconFromFile(iconPath);

      this._windowCountLabel = new St.Label({
        text: '0',
        style_class: 'indicator-icon-window-count-label',
      });
      this._windowCountLabel.set_position(
        Indicator.#WINDOW_COUNT_LABEL_X,
        Indicator.#WINDOW_COUNT_LABEL_Y,
      );

      this._indicatorIcon.add_child(icon);
      this._indicatorIcon.add_child(this._windowCountLabel);
    }

    _createMenuComponents() {
      this._indicatorMenu = new IndicatorMenu({
        dataSource: this._dataSource,
        handlers: {
          onRetileWindows: this._handlers.onRetileWindows,
          onClearFixedAreas: this._handlers.onClearFixedAreas,
          onToggleFixedArea: (areaIndex) => {
            this._handlers.onToggleFixedArea(areaIndex);
            this.openPanelMenuLater();
          },
          onLayoutMapActivate: (layoutMapIndex) => {
            this._handlers.onLayoutMapActivate(layoutMapIndex);
            this.closeMenu();
          },
          onLayoutMapMoveUp: this._handlers.onLayoutMapMoveUp,
          onLayoutMapMoveDown: this._handlers.onLayoutMapMoveDown,
          onLayoutMapEdit: (layoutMapIndex) => {
            this._handlers.onLayoutMapEdit(layoutMapIndex);
            this.closeMenu();
          },
          onLayoutMapDelete: (layoutMapIndex) => {
            this._handlers.onLayoutMapDelete(layoutMapIndex);
            this.openPanelMenuLater();
          },
          onLayoutMapDeleteCancel: () => {
            this.openPanelMenuLater();
          },
          onAddNewLayoutMap: () => {
            const layoutMap = this._handlers.onAddNewLayoutMap();
            if (layoutMap) {
              this.openPanelMenuLater();
            }
            return layoutMap;
          },
          onOpenSettingsWindow: () => {
            GLib.spawn_command_line_async(`gnome-extensions prefs ${this._extensionUuid}`);
          },
        },
        logger: this._logger,
      });
    }

    _updateWindowCountLabelColor() {
      const themeContext = St.ThemeContext.get_for_stage(global.stage);
      const [backgroundColor, foregroundColor] = themeContext.get_accent_color();

      this._windowCountLabel.set_style(`
        background-color: ${toCssRgb(backgroundColor)};
        color: ${toCssRgb(foregroundColor)};
      `);
    }

    _connectScrollEvent() {
      this.connect('scroll-event', (_, event) => {
        const direction = event.get_scroll_direction();
        this._handlers.onIndicatorScroll(direction);
        return Clutter.EVENT_STOP;
      });
    }

    _startAccentColorTracking() {
      this._interfaceSettings = new Gio.Settings({
        schema_id: 'org.gnome.desktop.interface',
      });

      this._accentColorChangedId = this._interfaceSettings.connect(
        'changed::accent-color',
        () => this._updateWindowCountLabelColor(),
      );
    }

    _clearOpenPanelMenuSource() {
      if (this._openPanelMenuSourceId === null)
        return;

      GLib.Source.remove(this._openPanelMenuSourceId);
      this._openPanelMenuSourceId = null;
    }

    _clearUpdateWindowCountSource() {
      if (this._updateWindowCountSourceId === null)
        return;

      GLib.Source.remove(this._updateWindowCountSourceId);
      this._updateWindowCountSourceId = null;
    }
  });
