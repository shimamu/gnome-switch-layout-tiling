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
import * as fn from '../logic/functional.js';
import { MAX_SPLIT_AREA_COUNT, layoutOf } from '../logic/layoutOperations.js';
import { LayoutPreview } from './components/layoutPreview.js';
import { IconName, IconFactory } from './components/icons.js';


class LayoutMapListRow {
  static LABEL_START_INDEX = 1;

  static ICON_OPACITY = {
    VISIBLE: 255,
    HIDDEN: 0,
  };

  constructor({
    layoutMapIndex,
    layoutMap,
    handlers = {},
    logger,
  }) {
    this._layoutMapIndex = layoutMapIndex;
    this._layoutMap = layoutMap;
    this._handlers = handlers;
    this._logger = logger;

    this._container = new PopupMenu.PopupBaseMenuItem({ reactive: false });
    this._checkIcon = this._createCheckIcon();

    this._createComponents();
    this._buildUI();
  }

  setSelected(selected) {
    this._checkIcon.opacity = selected
      ? LayoutMapListRow.ICON_OPACITY.VISIBLE
      : LayoutMapListRow.ICON_OPACITY.HIDDEN;
  }

  destroy() {
    this._logger.debug(`${this.constructor.name} destroyed`);

    this._layoutMenuItem?.disconnect(this._layoutMenuItemSignalId);
    this._layoutMenuItem?.destroy();
    this._layoutMenuItem = null;

    this._upButton?.disconnect(this._upButtonSignalId);
    this._upButton?.destroy();
    this._upButton = null;

    this._downButton?.disconnect(this._downButtonSignalId);
    this._downButton?.destroy();
    this._downButton = null;

    this._editButton?.disconnect(this._editButtonSignalId);
    this._editButton?.destroy();
    this._editButton = null;

    this._deleteButton?.disconnect(this._deleteButtonSignalId);
    this._deleteButton?.destroy();
    this._deleteButton = null;

    this._container?.destroy();
    this._container = null;
  }

  get actor() {
    return this._container;
  }

  _createComponents() {
    this._layoutMenuItem = this._createLayoutMapMenuItem(this._handlers.onActivate);
    this._upButton = this._createUpButton(this._handlers.onMoveUp);
    this._downButton = this._createDownButton(this._handlers.onMoveDown);
    this._editButton = this._createEditButton(this._handlers.onEdit);
    this._deleteButton = this._createDeleteButton(this._handlers.onDelete, this._handlers.onDeleteCancel);
  }

  _buildUI() {
    this._container.add_child(this._layoutMenuItem);
    this._container.add_child(this._upButton);
    this._container.add_child(this._downButton);
    this._container.add_child(this._editButton);
    this._container.add_child(this._deleteButton);
  }

  _createCheckIcon() {
    const icon = IconFactory.createIconFromTheme(IconName.CHECK);
    icon.opacity = LayoutMapListRow.ICON_OPACITY.HIDDEN;
    return icon;
  }

  _createLayoutMapMenuItem(onActivate) {
    const menuItem = new St.BoxLayout({
      reactive: true,
      track_hover: true,
      style_class: 'popup-menu-item layout-map-list-row-container',
    });

    this._layoutMenuItemSignalId = menuItem.connect('button-press-event', () => {
      onActivate(this._layoutMapIndex);
    });

    menuItem.add_child(this._checkIcon);
    menuItem.add_child(this._createIndexLabel());
    menuItem.add_child(this._createLayoutMapPreviewPane());

    return menuItem;
  }

  _createIndexLabel() {
    return new St.Label({
      text: _('%s. ').replace(
        '%s',
        this._layoutMapIndex + LayoutMapListRow.LABEL_START_INDEX,
      ),
      y_align: Clutter.ActorAlign.CENTER,
      style_class: 'layout-map-list-row-label',
    });
  }

  _createLayoutMapPreviewPane() {
    const layoutMapPreviewPane = new St.BoxLayout({
      vertical: false,
      style_class: 'layout-map-list-row-preview-pane',
    });

    fn.range(1, MAX_SPLIT_AREA_COUNT).forEach(splitAreaCount => {
      const layout = layoutOf(this._layoutMap, splitAreaCount);

      layoutMapPreviewPane.add_child(new LayoutPreview(layout).actor);

      if (splitAreaCount < MAX_SPLIT_AREA_COUNT) {
        layoutMapPreviewPane.add_child(
          IconFactory.createIconFromTheme(IconName.LAYOUT_SWITCH, { icon_size: 12 })
        );
      }
    });

    return layoutMapPreviewPane;
  }

  _createUpButton(onMoveUp) {
    const button = new St.Button({
      style_class: 'popup-menu-item layout-map-list-row-button',
      can_focus: true,
    });

    button.set_child(IconFactory.createIconFromTheme(IconName.UP));
    this._upButtonSignalId = button.connect('clicked', () => {
      onMoveUp(this._layoutMapIndex);
    });

    return button;
  }

  _createDownButton(onMoveDown) {
    const button = new St.Button({
      style_class: 'popup-menu-item layout-map-list-row-button',
      can_focus: true,
    });

    button.set_child(IconFactory.createIconFromTheme(IconName.DOWN));
    this._downButtonSignalId = button.connect('clicked', () => {
      onMoveDown(this._layoutMapIndex);
    });

    return button;
  }

  _createEditButton(onEdit) {
    const button = new St.Button({
      style_class: 'popup-menu-item layout-map-list-row-button',
      can_focus: true,
    });

    button.set_child(IconFactory.createIconFromTheme(IconName.EDIT));
    this._editButtonSignalId = button.connect('clicked', () => {
      onEdit(this._layoutMapIndex);
    });

    return button;
  }

  _createDeleteButton(onDelete, onDeleteCancel) {
    const button = new St.Button({
      style_class: 'popup-menu-item layout-map-list-row-button',
      can_focus: true,
    });

    button.set_child(IconFactory.createIconFromTheme(IconName.DELETE));
    this._deleteButtonSignalId = button.connect('clicked', () => {
      const confirmDialog = this._createDeleteDialog(onDelete, onDeleteCancel);
      confirmDialog.open();
    });

    return button;
  }

  _createDeleteDialog(onDelete, onDeleteCancel) {
    const dialog = new ModalDialog.ModalDialog({ styleClass: null });

    const label = new St.Label({
      text: _('Do you want to delete layout %s?').replace(
        '%s',
        this._layoutMapIndex + LayoutMapListRow.LABEL_START_INDEX,
      ),
      style_class: 'layout-delete-confirm-label',
    });

    dialog.contentLayout.add_child(label);

    dialog.setButtons([
      {
        label: _('Delete'),
        action: () => {
          dialog.close();
          onDelete(this._layoutMapIndex);
        },
        default: true,
      },
      {
        label: _('Cancel'),
        action: () => {
          dialog.close();
          onDeleteCancel();
        },
        key: Clutter.KEY_Escape,
      },
    ]);

    return dialog;
  }
}


class LayoutMapListView {
  constructor({ layoutMaps, handlers, logger }) {
    this._layoutMaps = layoutMaps;
    this._handlers = handlers;
    this._logger = logger;

    this._container = new St.ScrollView({
      style_class: 'indicator-menu-layout-map-list-view',
      overlay_scrollbars: true,
    });
    this._container.set_policy(
      St.PolicyType.NEVER,
      St.PolicyType.AUTOMATIC
    );

    this._layoutMapListContainer = null;
    this._layoutMapListRows = [];

    this._createComponents();
    this._build();
  }

  updateActiveLayoutMapCheck(activeLayoutMapIndex) {
    this._layoutMapListRows.forEach((layoutMapListRow, index) => {
      layoutMapListRow.setSelected(index === activeLayoutMapIndex);
    });
  }

  destroy() {
    this._logger.debug(`${this.constructor.name} destroyed`);

    this._layoutMapListRows.forEach((layoutMapListRow) => {
      layoutMapListRow?.destroy();
    });
    this._layoutMapListRows = null;

    this._layoutMapListContainer?.destroy();
    this._layoutMapListContainer = null;

    this._container?.destroy();
    this._container = null;
  }

  get actor() {
    return this._container;
  }

  _createComponents() {
    this._layoutMapListContainer = new St.BoxLayout({ vertical: true });

    this._layoutMaps.forEach((layoutMap, layoutMapIndex) => {
      const layoutMapListRow = new LayoutMapListRow({
        layoutMapIndex,
        layoutMap,
        handlers: {
          onActivate: this._handlers.onLayoutMapActivate,
          onMoveUp: this._handlers.onLayoutMapMoveUp,
          onMoveDown: this._handlers.onLayoutMapMoveDown,
          onEdit: this._handlers.onLayoutMapEdit,
          onDelete: this._handlers.onLayoutMapDelete,
          onDeleteCancel: this._handlers.onLayoutMapDeleteCancel,
        },
        logger: this._logger,
      });
      this._layoutMapListRows.push(layoutMapListRow);
    });
  }

  _build() {
    this._layoutMapListRows.forEach((layoutMapListRow) => {
      this._layoutMapListContainer.add_child(layoutMapListRow.actor);
    });
    this._container.add_child(this._layoutMapListContainer);
  }
}


class FixedAreaSection {
  static AREA_LABEL_START_INDEX = 1;

  constructor({ dataSource, handlers = {}, logger }) {
    this._dataSource = dataSource;
    this._handlers = handlers;
    this._logger = logger;

    this._container = new PopupMenu.PopupMenuSection();
    this._menuItems = [];
    this._menuItemSignalIds = [];

    this._createComponents();
    this._buildUI();
    this.refresh();
  }

  refresh() {
    const fixedAreaIndexes = this._dataSource.getFixedAreaIndexes();

    this._menuItems.forEach((menuItem, index) => {
      menuItem.setOrnament(
        fixedAreaIndexes.has(index)
          ? PopupMenu.Ornament.CHECK
          : PopupMenu.Ornament.NONE
      );
    });
  }

  updateFixedAreaChecks() {
    this.refresh();
  }

  destroy() {
    this._logger.debug(`${this.constructor.name} destroyed`);

    this._menuItems.forEach((menuItem, index) => {
      menuItem.disconnect(this._menuItemSignalIds[index]);
      menuItem.destroy();
    });
    this._menuItems = [];
    this._menuItemSignalIds = [];

    this._clearButton.disconnect(this._clearButtonSignalId);
    this._clearButton?.destroy();
    this._clearButton = null;

    this._container?.destroy();
    this._container = null;
  }

  get actor() {
    return this._container;
  }

  _createComponents() {
    this._title = this._createTitle();

    this._menuItems = fn.range(0, MAX_SPLIT_AREA_COUNT - 1).map(areaIndex => {
      const menuItem = new PopupMenu.PopupMenuItem(
        _('Area %s').replace(
          '%s',
          areaIndex + FixedAreaSection.AREA_LABEL_START_INDEX
        )
      );

      const signalId = menuItem.connect('activate', () => {
        this._handlers.onToggleFixedArea(areaIndex);
        this.refresh();
      });

      this._menuItemSignalIds.push(signalId);

      return menuItem;
    });
  }

  _buildUI() {
    this._container.addMenuItem(this._title);

    this._menuItems.forEach(menuItem => {
      this._container.addMenuItem(menuItem);
    });
  }

  _createTitle() {
    const title = new PopupMenu.PopupBaseMenuItem({
      reactive: false,
      can_focus: false,
    });

    title.add_child(
      IconFactory.createIconFromTheme(IconName.PIN)
    );

    title.add_child(new St.Label({
      text: _('Fixed Areas (on Rotation)'),
      style_class: 'indicator-menu-item-label',
      x_expand: true,
    }));

    this._clearButton = new St.Button({
      style_class: 'button',
      can_focus: true,
      track_hover: true,
      label: _('Clear All'),
    });

    this._clearButton.set_accessible_name(_('Clear all fixed areas'));

    this._clearButtonSignalId = this._clearButton.connect('clicked', () => {
      this._handlers.onClearFixedAreas();
      this.refresh();
    });

    title.add_child(this._clearButton);

    return title;
  }
}


class LayoutMapSection {
  constructor({
    dataSource: {
      getLayoutMapIndex,
      getLayoutMaps,
    },
    handlers = {},
    logger,
  }) {
    this._dataSource = {
      getLayoutMapIndex,
      getLayoutMaps,
    };
    this._handlers = handlers;
    this._logger = logger;

    this._container = new PopupMenu.PopupMenuSection();

    this._layoutMapListView = null;

    this.refresh();
  }

  refresh() {
    // GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
    this._destroyItems();
    this._createComponents();
    this._buildUI();
    this.updateActiveLayoutMapCheck();
    // return GLib.SOURCE_REMOVE;
    // });
  }

  updateActiveLayoutMapCheck() {
    const layoutMapIndex = this._dataSource.getLayoutMapIndex();
    this._layoutMapListView.updateActiveLayoutMapCheck(layoutMapIndex);
  }

  destroy() {
    this._logger.debug(`${this.constructor.name} destroyed`);

    this._layoutMapListView?.destroy();
    this._layoutMapListView = null;

    this._destroyItems();

    this._container?.destroy();
    this._container = null;
  }

  get actor() {
    return this._container;
  }

  _createComponents() {
    this._title = this._createTitle();

    this._layoutMapListView = new LayoutMapListView({
      layoutMaps: this._dataSource.getLayoutMaps(),
      handlers: this._handlers,
      logger: this._logger,
    });
  }

  _buildUI() {
    this._container.addMenuItem(this._title);
    this._container.actor.add_child(this._layoutMapListView.actor);
  }

  _createTitle() {
    const title = new PopupMenu.PopupBaseMenuItem({
      reactive: false,
      can_focus: false,
    });

    title.add_child(
      IconFactory.createIconFromTheme(IconName.GRID)
    );

    title.add_child(new St.Label({
      text: _('Layouts'),
      style_class: 'indicator-menu-item-label',
    }));

    return title;
  }

  _destroyItems() {
    this._layoutMapListView?.destroy();
    this._layoutMapListView = null;

    this._container.actor.remove_all_children();
  }
}


export class IndicatorMenu {
  static ICON_AT_START_INDEX = 0;

  constructor({ dataSource = {}, handlers = {}, logger }) {
    this._dataSource = dataSource;
    this._handlers = handlers;
    this._logger = logger;

    this._container = new PopupMenu.PopupMenuSection();

    this._createComponents();
    this._buildUI();
  }

  refresh() {
    this._layoutMapSection.refresh();
  }

  updateFixedAreaChecks() {
    this._fixedAreaSection.updateFixedAreaChecks();
  }

  updateActiveLayoutMapCheck() {
    this._layoutMapSection.updateActiveLayoutMapCheck();
  }

  destroy() {
    this._logger.debug(`${this.constructor.name} destroyed`);

    this._menuItemRetileWindows?.disconnect(this._menuItemRetileWindowsSignalId);
    this._menuItemRetileWindows?.destroy();
    this._menuItemRetileWindows = null;

    this._fixedAreaSection?.destroy();
    this._fixedAreaSection = null;

    this._layoutMapSection?.destroy();
    this._layoutMapSection = null;

    this._menuItemAddLayout?.disconnect(this._menuItemAddLayoutSignalId);
    this._menuItemAddLayout?.destroy();
    this._menuItemAddLayout = null;

    this._menuItemSettings?.disconnect(this._menuItemSettingsSignalId);
    this._menuItemSettings?.destroy();
    this._menuItemSettings = null;

    this._container?.destroy();
    this._container = null;
  }

  get actor() {
    return this._container;
  }

  _createComponents() {
    this._menuItemRetileWindows = this._createMenuItemRetileWindows(this._handlers.onRetileWindows);
    this._fixedAreaSection = new FixedAreaSection({
      dataSource: {
        getFixedAreaIndexes: this._dataSource.getFixedAreaIndexes,
      },
      handlers: {
        onClearFixedAreas: this._handlers.onClearFixedAreas,
        onToggleFixedArea: this._handlers.onToggleFixedArea,
      },
      logger: this._logger,
    });
    this._layoutMapSection = new LayoutMapSection({
      dataSource: this._dataSource,
      handlers: {
        onLayoutMapActivate: (layoutMapIndex) => {
          this._handlers.onLayoutMapActivate(layoutMapIndex);
          this.updateActiveLayoutMapCheck();
        },
        onLayoutMapMoveUp: (layoutMapIndex) => {
          this._handlers.onLayoutMapMoveUp(layoutMapIndex);
          this.refresh();
        },
        onLayoutMapMoveDown: (layoutMapIndex) => {
          this._handlers.onLayoutMapMoveDown(layoutMapIndex);
          this.refresh();
        },
        onLayoutMapEdit: this._handlers.onLayoutMapEdit,
        onLayoutMapDelete: (layoutMapIndex) => {
          this._handlers.onLayoutMapDelete(layoutMapIndex);
          this.refresh();
        },
        onLayoutMapDeleteCancel: this._handlers.onLayoutMapDeleteCancel,
      },
      logger: this._logger,
    });
    this._menuItemAddLayout = this._createMenuItemAddLayout(this._handlers.onAddNewLayoutMap);
    this._menuItemSettings = this._createMenuItemSettings(this._handlers.onOpenSettingsWindow);
  }

  _buildUI() {
    this._container.addMenuItem(this._menuItemRetileWindows);
    this._container.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this._container.addMenuItem(this._fixedAreaSection.actor);
    this._container.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this._container.addMenuItem(this._layoutMapSection.actor);
    this._container.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    this._container.addMenuItem(this._menuItemAddLayout);
    this._container.addMenuItem(this._menuItemSettings);
  }

  _createBasicIconMenuItem({ icon, labelText }) {
    const menuItem = new PopupMenu.PopupMenuItem('');
    const label = new St.Label({
      text: labelText,
      style_class: 'indicator-menu-item-label',
    });
    menuItem.insert_child_at_index(icon, IndicatorMenu.ICON_AT_START_INDEX);
    menuItem.add_child(label);

    return menuItem;
  }

  _createMenuItemRetileWindows(onRetileWindows) {
    const menuItemRetileWindows = this._createBasicIconMenuItem({
      icon: IconFactory.createIconFromTheme(IconName.REFRESH),
      labelText: _('Retile Windows'),
    });
    this._menuItemRetileWindowsSignalId = menuItemRetileWindows.connect('activate', () => {
      onRetileWindows();
    });

    return menuItemRetileWindows ;
  }

  _createMenuItemAddLayout(onAddNewLayoutMap) {
    const menuItemAddLayout = this._createBasicIconMenuItem({
      icon: IconFactory.createIconFromTheme(IconName.NEW_LAYOUT),
      labelText: _('Add Layout'),
    });

    this._menuItemAddLayoutSignalId = menuItemAddLayout.connect('activate', () => {
      if (onAddNewLayoutMap()) {
        this.refresh();
      }
    });

    return menuItemAddLayout;
  }

  _createMenuItemSettings(onOpenSettingsWindow) {
    const menuItemSettings = this._createBasicIconMenuItem({
      icon: IconFactory.createIconFromTheme(IconName.SETTINGS),
      labelText: _('Settings'),
    });
    this._menuItemSettingsSignalId = menuItemSettings.connect('activate', () => {
      onOpenSettingsWindow();
    });

    return menuItemSettings;
  }
}
