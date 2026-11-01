/*
 * Switch Layout Tiling
 *
 * Copyright (C) 2026  shimamu
 *
 * https://github.com/shimamu/switch-layout-tiling
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import St from 'gi://St';


const DEFAULT_ICON_SIZE = 16;

export const IconName = {
  CHECK: 'object-select-symbolic',
  DELETE: 'edit-delete-symbolic',
  DOWN: 'pan-down-symbolic',
  EDIT: 'document-edit-symbolic',
  GRID: 'view-grid-symbolic',
  LAYOUT_SWITCH: 'object-flip-horizontal-symbolic',
  NEW_LAYOUT: 'window-new-symbolic',
  PIN: 'view-pin-symbolic',
  REFRESH: 'view-refresh-symbolic',
  SETTINGS: 'preferences-system-symbolic',
  UP: 'pan-up-symbolic',
};

export const IconFactory = {
  createIconFromTheme(
    iconName,
    {
      iconSize = DEFAULT_ICON_SIZE,
      styleClass = 'popup-menu-icon',
    } = {},
  ) {
    if (!iconName)
      throw new Error('Invalid icon key');
    return new St.Icon({
      icon_name: iconName,
      icon_size: iconSize,
      style_class: styleClass,
      x_align: Clutter.ActorAlign.START,
      y_align: Clutter.ActorAlign.CENTER,
    });
  },

  createIconFromFile(
    filePath,
    {
      iconSize = DEFAULT_ICON_SIZE,
      styleClass = 'popup-menu-icon',
    } = {},
  ) {
    const iconFile = Gio.File.new_for_path(filePath);
    return new St.Icon({
      gicon: new Gio.FileIcon({ file: iconFile }),
      icon_size: iconSize,
      style_class: styleClass,
      x_align: Clutter.ActorAlign.START,
      y_align: Clutter.ActorAlign.CENTER,
    });
  },
};
