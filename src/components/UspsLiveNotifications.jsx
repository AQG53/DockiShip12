import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Truck, X, AlertCircle } from "lucide-react";
import { listUspsWebhookEvents } from "../lib/api";

const POLL_MS = 8000;
const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 5000;

const getNotificationTone = (event = {}) => {
  const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
  const status = String(payload?.status || payload?.eventType || event?.eventType || "").toLowerCase();
  if (status.includes("delivered")) {
    return {
      tone: "success",
      icon: Check,
      containerClass: "border-emerald-200 bg-[linear-gradient(135deg,#d9f99d_0%,#c7f9cc_42%,#d1fae5_100%)] text-emerald-950 shadow-[0_18px_38px_rgba(16,185,129,0.18)]",
      badgeClass: "bg-white text-emerald-500",
      accentClass: "bg-emerald-200/70",
      closeClass: "text-emerald-700/70 hover:text-emerald-900",
    };
  }

  if (status.includes("exception") || status.includes("fail") || status.includes("return")) {
    return {
      tone: "error",
      icon: AlertCircle,
      containerClass: "border-rose-200 bg-[linear-gradient(135deg,#fecdd3_0%,#ffe4e6_45%,#ffe4e6_100%)] text-rose-950 shadow-[0_18px_38px_rgba(244,63,94,0.15)]",
      badgeClass: "bg-white text-rose-500",
      accentClass: "bg-rose-200/70",
      closeClass: "text-rose-700/70 hover:text-rose-900",
    };
  }

  return {
    tone: "info",
    icon: Truck,
    containerClass: "border-sky-200 bg-[linear-gradient(135deg,#dbeafe_0%,#e0f2fe_45%,#ecfeff_100%)] text-slate-950 shadow-[0_18px_38px_rgba(14,165,233,0.16)]",
    badgeClass: "bg-white text-sky-500",
    accentClass: "bg-sky-200/70",
    closeClass: "text-sky-700/70 hover:text-sky-900",
  };
};

const buildNotificationCopy = (event = {}) => {
  const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
  const trackingNumber = payload?.trackingNumber || event?.trackingNumber || "USPS";
  const title =
    payload?.status
    || payload?.eventType
    || event?.eventType
    || "USPS Update Received";
  const message =
    payload?.statusSummary
    || payload?.description
    || payload?.summary
    || `Tracking ${trackingNumber} received a new USPS subscription update.`;

  return {
    trackingNumber,
    title: String(title),
    message: String(message),
  };
};

function NotificationCard({ item, onDismiss }) {
  const tone = getNotificationTone(item.event);
  const Icon = tone.icon;
  const copy = buildNotificationCopy(item.event);

  return (
    <div
      className={`relative overflow-hidden rounded-[22px] border px-3.5 py-3 pr-10 backdrop-blur-sm transition-all duration-300 ${tone.containerClass}`}
    >
      <div className={`absolute left-0 top-0 h-full w-16 ${tone.accentClass}`} />
      <div className="relative flex items-start gap-3">
        <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone.badgeClass} shadow-sm`}>
          <Icon size={22} strokeWidth={2.5} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">
                USPS Live Update
              </p>
              <h3 className="mt-0.5 line-clamp-1 text-base font-semibold leading-5">
                {copy.title}
              </h3>
            </div>
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] leading-[1.15rem] opacity-80">
            {copy.message}
          </p>
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.14em] opacity-65">
            Tracking {copy.trackingNumber}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className={`absolute right-3 top-3 rounded-full p-1 transition-colors ${tone.closeClass}`}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function UspsLiveNotifications({ enabled = true }) {
  const [visibleItems, setVisibleItems] = useState([]);
  const queueRef = useRef([]);
  const initializedRef = useRef(false);
  const seenIdsRef = useRef(new Set());
  const timersRef = useRef(new Map());
  const pollingRef = useRef(false);

  const dismiss = (id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setVisibleItems((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        window.clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (visibleItems.length >= MAX_VISIBLE) return;
    if (queueRef.current.length === 0) return;

    const availableSlots = MAX_VISIBLE - visibleItems.length;
    if (availableSlots <= 0) return;

    const nextItems = queueRef.current.splice(0, availableSlots);
    if (nextItems.length === 0) return;

    setVisibleItems((prev) => [...prev, ...nextItems]);
    nextItems.forEach((item) => {
      const timer = window.setTimeout(() => {
        dismiss(item.id);
      }, AUTO_DISMISS_MS);
      timersRef.current.set(item.id, timer);
    });
  }, [visibleItems]);

  useEffect(() => {
    if (!enabled) {
      initializedRef.current = false;
      seenIdsRef.current = new Set();
      queueRef.current = [];
      setVisibleItems([]);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      if (pollingRef.current || cancelled) return;
      pollingRef.current = true;
      try {
        const response = await listUspsWebhookEvents({ limit: 20 });
        const rows = Array.isArray(response?.rows) ? response.rows : [];
        const orderedRows = [...rows].reverse();

        if (!initializedRef.current) {
          orderedRows.forEach((row) => {
            if (row?.id) seenIdsRef.current.add(row.id);
          });
          initializedRef.current = true;
          return;
        }

        const newItems = orderedRows
          .filter((row) => row?.id && !seenIdsRef.current.has(row.id))
          .map((row) => {
            seenIdsRef.current.add(row.id);
            return {
              id: row.id,
              event: row,
            };
          });

        if (newItems.length > 0 && !cancelled) {
          queueRef.current.push(...newItems);
          setVisibleItems((prev) => [...prev]);
        }
      } catch (error) {
        console.error("Failed to poll USPS webhook events", error);
      } finally {
        pollingRef.current = false;
      }
    };

    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      pollingRef.current = false;
    };
  }, [enabled]);

  const items = useMemo(() => visibleItems.slice(0, MAX_VISIBLE), [visibleItems]);

  if (!enabled || items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[180] flex w-[min(88vw,22rem)] flex-col gap-2.5 sm:right-5 sm:top-5">
      {items.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <NotificationCard item={item} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
