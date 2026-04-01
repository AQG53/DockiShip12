import { getAccessToken, getTenantId } from "./axios";

const subscribers = new Map();
let nextSubscriberId = 1;
let activeController = null;
let reconnectTimer = null;
let reconnectAttempt = 0;
let activeConnectionKey = "";
let browserListenersInstalled = false;

const MAX_RECONNECT_MS = 15000;

function getStreamUrl() {
  const baseUrl = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  return `${baseUrl}/integrations/usps/stream`;
}

function getConnectionKey() {
  const token = getAccessToken();
  const tenantId = getTenantId();
  const url = getStreamUrl();
  if (!token || !tenantId || !url) return "";
  return `${url}::${tenantId}::${token}`;
}

function notifySubscribers(method, payload) {
  for (const subscriber of subscribers.values()) {
    try {
      subscriber?.[method]?.(payload);
    } catch (error) {
      console.error(`USPS stream subscriber ${method} handler failed`, error);
    }
  }
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function stopActiveConnection() {
  clearReconnectTimer();
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
  activeConnectionKey = "";
}

function scheduleReconnect() {
  if (subscribers.size === 0 || reconnectTimer) return;
  const delay = Math.min(1000 * Math.max(1, 2 ** reconnectAttempt), MAX_RECONNECT_MS);
  reconnectAttempt += 1;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    void ensureConnection();
  }, delay);
}

function parseEventBlock(rawBlock) {
  const lines = String(rawBlock || "").split("\n");
  let event = "message";
  const dataLines = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) continue;

    const field = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).replace(/^\s/, "");
    if (field === "event") event = value || "message";
    else if (field === "data") dataLines.push(value);
  }

  if (dataLines.length === 0) return null;

  const rawData = dataLines.join("\n");
  try {
    return {
      type: event,
      data: JSON.parse(rawData),
    };
  } catch {
    return {
      type: event,
      data: rawData,
    };
  }
}

async function readSseStream(response) {
  if (!response.body) {
    throw new Error("USPS stream response body is not available.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true }).replace(/\r/g, "");

    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex >= 0) {
      const block = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      const parsed = parseEventBlock(block);
      if (parsed) {
        notifySubscribers("onEvent", parsed);
      }

      separatorIndex = buffer.indexOf("\n\n");
    }
  }
}

async function ensureConnection() {
  if (subscribers.size === 0) {
    stopActiveConnection();
    return;
  }

  const token = getAccessToken();
  const tenantId = getTenantId();
  const url = getStreamUrl();
  const nextKey = getConnectionKey();

  if (!token || !tenantId || !url || !nextKey) {
    stopActiveConnection();
    return;
  }

  if (activeController && activeConnectionKey === nextKey) {
    return;
  }

  stopActiveConnection();
  const controller = new AbortController();
  activeController = controller;
  activeConnectionKey = nextKey;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
        "X-Tenant-ID": tenantId,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`USPS stream failed (${response.status})`);
      error.status = response.status;
      throw error;
    }

    reconnectAttempt = 0;
    notifySubscribers("onOpen", {
      tenantId,
      connectedAt: new Date().toISOString(),
    });

    await readSseStream(response);
    if (!controller.signal.aborted) {
      scheduleReconnect();
    }
  } catch (error) {
    if (controller.signal.aborted) return;

    notifySubscribers("onError", error);
    const status = Number(error?.status || error?.response?.status || 0);
    if (status === 401 || status === 403) {
      stopActiveConnection();
      return;
    }

    scheduleReconnect();
  } finally {
    if (activeController === controller) {
      activeController = null;
      activeConnectionKey = "";
    }
  }
}

function installBrowserListeners() {
  if (browserListenersInstalled || typeof window === "undefined") return;
  browserListenersInstalled = true;

  const handleStateChange = () => {
    reconnectAttempt = 0;
    void ensureConnection();
  };

  window.addEventListener("auth-changed", handleStateChange);
  window.addEventListener("tenant-changed", handleStateChange);
}

export function subscribeUspsStream(handlers = {}) {
  installBrowserListeners();

  const id = nextSubscriberId++;
  subscribers.set(id, {
    onEvent: typeof handlers.onEvent === "function" ? handlers.onEvent : undefined,
    onOpen: typeof handlers.onOpen === "function" ? handlers.onOpen : undefined,
    onError: typeof handlers.onError === "function" ? handlers.onError : undefined,
  });

  void ensureConnection();

  return () => {
    subscribers.delete(id);
    if (subscribers.size === 0) {
      stopActiveConnection();
      reconnectAttempt = 0;
    }
  };
}
