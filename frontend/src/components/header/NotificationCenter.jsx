import React from "react";
import { Bell } from "lucide-react";

/**
 * NotificationCenter Trigger Button
 * Wires directly into centralized OverlayManager to prevent overlapping popovers.
 */
export default function NotificationCenter({ unreadCount = 0, onOpenNotifications }) {
  return (
    <div className="notification-center-wrap">
      <button
        type="button"
        className="notif-bell-btn"
        onClick={() => onOpenNotifications && onOpenNotifications()}
        title="Operational Notification Centre • Active Warnings & System Feeds"
        aria-label="Notification Center"
      >
        <Bell
          size={14}
          className={unreadCount > 0 ? "text-amber-500 animate-bounce" : "text-slate-600"}
        />
        {unreadCount > 0 && (
          <span className="notif-badge font-mono">{unreadCount}</span>
        )}
      </button>
    </div>
  );
}
