import { useEffect, useRef } from "react";
import { shouldAutoLock } from "./autoLock";

export function useAutoLock(active: boolean, minutes: number, onLock: () => void | Promise<void>) {
  const lastActivityAt = useRef(Date.now());

  useEffect(() => {
    if (!active) return;

    lastActivityAt.current = Date.now();

    const recordActivity = () => {
      if (document.visibilityState === "visible") {
        lastActivityAt.current = Date.now();
      }
    };

    const check = () => {
      if (shouldAutoLock(lastActivityAt.current, Date.now(), minutes)) {
        void onLock();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        check();
      }
    };

    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "wheel"];
    events.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = window.setInterval(check, 5_000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, recordActivity));
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [active, minutes, onLock]);
}
