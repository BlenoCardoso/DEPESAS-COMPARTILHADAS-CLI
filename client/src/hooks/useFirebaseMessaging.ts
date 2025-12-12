import { useEffect } from "react";
import { app } from "@/lib/firebase";

/**
 * Lightweight bridge for Firebase Cloud Messaging. It runs only in browsers
 * that support the Notifications API and silently no-ops elsewhere.
 */
export function useFirebaseMessaging(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      console.info("Firebase messaging skipped: Notification API unavailable");
      return;
    }

    let isMounted = true;

    const registerMessaging = async () => {
      try {
        const { isSupported, getMessaging, getToken, onMessage } = await import("firebase/messaging");
        if (!(await isSupported())) {
          console.info("Firebase messaging skipped: unsupported browser");
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.info("Firebase messaging permission denied");
          return;
        }

        const messaging = getMessaging(app);
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        const token = await getToken(messaging, vapidKey ? { vapidKey } : undefined);

        if (isMounted && token) {
          console.info("Firebase messaging token", token);
        }

        onMessage(messaging, (payload) => {
          if (!isMounted) return;
          console.info("Push notification recebida", payload);
        });
      } catch (error) {
        console.warn("Firebase messaging setup failed", error);
      }
    };

    registerMessaging();

    return () => {
      isMounted = false;
    };
  }, [enabled]);
}
