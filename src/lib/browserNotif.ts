// Browser Notification API helper. Client-only.

export async function ensurePermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "denied";
  }
  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch {
      return "denied";
    }
  }
  return Notification.permission;
}

export function permission(): NotificationPermission {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "denied";
  return Notification.permission;
}

export function fire(title: string, body?: string, tag?: string): void {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  // Don't double-noise while the tab is in focus.
  if (typeof document !== "undefined" && document.visibilityState === "visible") return;
  try {
    new Notification(title, { body, tag, icon: "/icon.svg" });
  } catch { /* ignore */ }
}
