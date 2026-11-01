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


export const DesktopContext = {
  getActiveWindows: () => {
    const workspace = global.workspace_manager.get_active_workspace();
    return workspace.list_windows()
      .filter(w =>
        w.showing_on_its_workspace() // visible after WS switch / multi-monitor
        && !w.skip_taskbar           // normal app window (not popup/internal)
        && !w.minimized
      );
  },

  getActiveWorkspaceIndex: () => {
    return global.workspace_manager.get_active_workspace_index();
  },

  getPrimaryMonitorRect: () => {
    const { x, y, width, height } = Main.layoutManager.primaryMonitor;
    return { x, y, width, height };
  },

  getWorkArea: () => {
    const monitorIndex = global.display.get_current_monitor();
    return Main.layoutManager.getWorkAreaForMonitor?.(monitorIndex)
      ?? DesktopContext.getPrimaryMonitorRect();
  },
};
