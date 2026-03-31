import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BellRing, RadioTower, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import Navbar from "../components/Navbar";
import { getUspsWebhookConfig, listUspsSubscriptions, listUspsWebhookEvents } from "../lib/api";

const POLL_MS = 8000;

const formatDateTime = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
};

const stringify = (value) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? "");
  }
};

const getEventSummary = (row) => {
  const payload = row?.payload && typeof row.payload === "object" ? row.payload : {};
  const errorMeta = payload?.error || row?.envelope?.error;
  if (row?.eventType === "LISTENER_ERROR") {
    return String(errorMeta?.message || "Listener request failed validation.");
  }

  return String(
    payload?.statusSummary
    || payload?.description
    || payload?.summary
    || payload?.status
    || payload?.eventType
    || row?.eventType
    || "USPS webhook event received.",
  );
};

export default function UspsSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [events, setEvents] = useState([]);
  const [webhookConfig, setWebhookConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async (silent = false) => {
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      try {
        const [subscriptionRes, webhookEventRes, webhookConfigRes] = await Promise.all([
          listUspsSubscriptions(),
          listUspsWebhookEvents({ limit: 100 }),
          getUspsWebhookConfig(),
        ]);

        if (cancelled) return;
        setSubscriptions(Array.isArray(subscriptionRes?.rows) ? subscriptionRes.rows : []);
        setEvents(Array.isArray(webhookEventRes?.rows) ? webhookEventRes.rows : []);
        setWebhookConfig(webhookConfigRes || null);
        setError("");
      } catch (loadError) {
        if (cancelled) return;
        console.error("Failed to load USPS subscriptions dashboard", loadError);
        setError(
          loadError?.response?.data?.message
          || loadError?.message
          || "Failed to load USPS subscriptions data.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void load(false);
    const intervalId = window.setInterval(() => {
      void load(true);
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [reloadKey]);

  const summary = useMemo(() => {
    const activeSubscriptions = subscriptions.filter((item) => !item?.isExpired && String(item?.status || "").toUpperCase() === "ENABLED").length;
    const listenerErrors = events.filter((item) => item?.eventType === "LISTENER_ERROR").length;
    const liveEvents = events.length - listenerErrors;
    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions,
      liveEvents,
      listenerErrors,
    };
  }, [subscriptions, events]);

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Development</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">USPS Subscriptions</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Inspect saved USPS tracking subscriptions, recent webhook activity, and listener validation failures coming into DockiShip.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <RefreshCcw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={RadioTower} label="Saved Subscriptions" value={summary.totalSubscriptions} tone="amber" />
          <SummaryCard icon={ShieldCheck} label="Active Subscriptions" value={summary.activeSubscriptions} tone="emerald" />
          <SummaryCard icon={BellRing} label="Live Events" value={summary.liveEvents} tone="sky" />
          <SummaryCard icon={AlertCircle} label="Listener Errors" value={summary.listenerErrors} tone="rose" />
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Listener</h2>
              <p className="mt-1 text-sm text-slate-600">This is the callback URL that USPS should post subscription updates to.</p>
            </div>
            {refreshing && <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Refreshing…</span>}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Callback URL</p>
              <p className="mt-2 break-all text-sm font-medium text-slate-900">{webhookConfig?.callbackUrl || "—"}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Callback Path</p>
              <p className="mt-2 break-all text-sm text-slate-700">{webhookConfig?.callbackPath || "—"}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Webhook Security</p>
              <p className="mt-2 text-sm text-slate-900">
                Shared secret configured: <span className="font-semibold">{webhookConfig?.hasSecret ? "Yes" : "No"}</span>
              </p>
              <p className="mt-3 text-sm text-slate-700">Header: <span className="font-medium">X-HMAC</span></p>
              <p className="mt-1 text-sm text-slate-700">Input: <span className="font-medium">timestamp + payload</span></p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Saved USPS Subscriptions</h2>
              <p className="mt-1 text-sm text-slate-600">These rows come from the USPS subscription records saved in DockiShip.</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
              {subscriptions.length} total
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-3 py-3">Tracking</th>
                  <th className="px-3 py-3">Subscription</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Expiration</th>
                  <th className="px-3 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                      No USPS subscriptions have been saved yet.
                    </td>
                  </tr>
                )}

                {subscriptions.map((row) => (
                  <tr key={row.subscriptionId} className="align-top">
                    <td className="px-3 py-4">
                      <p className="font-medium text-slate-900">{row.trackingNumber || "—"}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.subscriptionType || "TRACKING_V3R2"}</p>
                    </td>
                    <td className="px-3 py-4">
                      <p className="break-all font-mono text-xs text-slate-700">{row.subscriptionId}</p>
                      <p className="mt-2 text-xs text-slate-500">Created {formatDateTime(row.creationTimestamp)}</p>
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.isExpired ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {row.isExpired ? "Expired" : (row.status || "Unknown")}
                      </span>
                      <p className="mt-2 text-xs text-slate-500">{row.statusReason || "No status reason"}</p>
                    </td>
                    <td className="px-3 py-4 text-xs text-slate-600">
                      <p>{formatDateTime(row.expirationTimestamp)}</p>
                      <p className="mt-2">Updated {formatDateTime(row.statusChangeTimestamp)}</p>
                    </td>
                    <td className="px-3 py-4">
                      <p className="text-xs text-slate-600">
                        Events: {(Array.isArray(row.filterProperties?.trackingEventTypes) && row.filterProperties.trackingEventTypes.join(", ")) || "—"}
                      </p>
                      <p className="mt-2 break-all text-xs text-slate-600">
                        Emails: {(Array.isArray(row.adminNotification) && row.adminNotification.map((item) => item?.email).filter(Boolean).join(", ")) || "—"}
                      </p>
                      <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50">
                        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                          Raw Subscription JSON
                        </summary>
                        <pre className="max-h-72 overflow-auto border-t border-slate-200 px-3 py-3 text-[11px] leading-5 text-slate-700">{stringify(row)}</pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Listener Activity</h2>
              <p className="mt-1 text-sm text-slate-600">Recent USPS events and listener failures saved from the webhook endpoint.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {events.length} rows
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {events.length === 0 && !loading && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No USPS webhook activity has been saved yet.
              </div>
            )}

            {events.map((row) => {
              const isError = row?.eventType === "LISTENER_ERROR";
              const summaryText = getEventSummary(row);
              return (
                <article
                  key={row.id}
                  className={`rounded-2xl border px-4 py-4 ${isError ? "border-rose-200 bg-rose-50/70" : "border-slate-200 bg-slate-50/70"}`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${isError ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700"}`}>
                          {isError ? <AlertCircle size={13} /> : <Truck size={13} />}
                          {row.eventType || "EVENT"}
                        </span>
                        <span className="text-xs text-slate-500">{formatDateTime(row.receivedAt)}</span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-900">{summaryText}</p>
                      <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                        <p><span className="font-semibold text-slate-700">Tracking:</span> {row.trackingNumber || "—"}</p>
                        <p><span className="font-semibold text-slate-700">Subscription:</span> {row.subscriptionId || "—"}</p>
                        <p><span className="font-semibold text-slate-700">Type:</span> {row.subscriptionType || "—"}</p>
                        <p><span className="font-semibold text-slate-700">Event Time:</span> {formatDateTime(row.eventTimestamp)}</p>
                      </div>
                    </div>
                  </div>

                  <details className="mt-4 rounded-xl border border-slate-200 bg-white">
                    <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                      Raw Listener Record
                    </summary>
                    <div className="grid gap-3 border-t border-slate-200 p-3 xl:grid-cols-3">
                      <JsonPanel title="Headers" value={row.headers} />
                      <JsonPanel title="Envelope" value={row.envelope} />
                      <JsonPanel title="Payload" value={row.payload} />
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    sky: "border-sky-200 bg-sky-50 text-sky-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
  };

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${tones[tone] || tones.sky}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-75">{label}</p>
          <p className="mt-2 text-3xl font-semibold">{value}</p>
        </div>
        <div className="rounded-2xl bg-white/70 p-3">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function JsonPanel({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
        {title}
      </div>
      <pre className="max-h-80 overflow-auto px-3 py-3 text-[11px] leading-5 text-slate-700">{stringify(value)}</pre>
    </div>
  );
}
