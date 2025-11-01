import { getCurrentScope, onScopeDispose, reactive, readonly } from 'vue';

type EventSourceStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'errored' | 'unsupported';

type EventHandler = (event: MessageEvent) => void;

type ListenerMap = Map<string, Set<EventHandler>>;

type ReconnectDelay = number | ((attempt: number) => number);

type UseEventSourceOptions = {
  autoReconnect?: boolean;
  reconnectDelay?: ReconnectDelay;
  withCredentials?: boolean;
  initialStatus?: EventSourceStatus;
};

type EventSourceState = {
  status: EventSourceStatus;
  url: string | null;
  error: Error | null;
  lastEventId: string | null;
  lastEventAt: number | null;
  attempts: number;
};

type UseEventSourceResult = {
  state: Readonly<EventSourceState>;
  connect: (url?: string | null) => void;
  disconnect: () => void;
  reconnect: () => void;
  setUrl: (url: string | null) => void;
  on: (event: string, handler: EventHandler) => () => void;
  off: (event: string, handler?: EventHandler) => void;
};

function resolveDelay(delay: ReconnectDelay | undefined, attempt: number): number {
  if (typeof delay === 'function') {
    return Math.max(0, Number(delay(attempt)) || 0);
  }
  if (typeof delay === 'number' && Number.isFinite(delay)) {
    return Math.max(0, delay);
  }
  if (attempt <= 1) {
    return 1000;
  }
  return Math.min(attempt * 1500, 10000);
}

function createListenerMap(): ListenerMap {
  return new Map<string, Set<EventHandler>>();
}

function dispatchEvent(listeners: ListenerMap, event: string, payload: MessageEvent) {
  const handlers = listeners.get(event);
  if (!handlers || handlers.size === 0) {
    return;
  }
  [...handlers].forEach((handler) => {
    try {
      handler(payload);
    } catch (error) {
      // swallow errors to avoid interrupting stream processing
      console.warn('[useEventSource] handler error', error);
    }
  });
}

export type { EventSourceStatus, EventSourceState, UseEventSourceResult };

export function useEventSource(
  initialUrl: string | null = null,
  options: UseEventSourceOptions = {},
): UseEventSourceResult {
  const listenerMap = createListenerMap();
  const state = reactive<EventSourceState>({
    status: options.initialStatus ?? 'idle',
    url: initialUrl,
    error: null,
    lastEventId: null,
    lastEventAt: null,
    attempts: 0,
  });

  const autoReconnect = options.autoReconnect !== false;
  const reconnectDelay = options.reconnectDelay;
  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function clearReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function updateStatus(status: EventSourceStatus) {
    state.status = status;
  }

  function cleanupSource() {
    if (eventSource) {
      eventSource.onopen = null;
      eventSource.onerror = null;
      eventSource.onmessage = null;
      eventSource.close();
      eventSource = null;
    }
  }

  function scheduleReconnect() {
    if (!autoReconnect || typeof window === 'undefined') {
      return;
    }
    clearReconnectTimer();
    const attempt = state.attempts + 1;
    state.attempts = attempt;
    const delay = resolveDelay(reconnectDelay, attempt);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (state.url) {
        connect(state.url);
      }
    }, delay);
  }

  function handleMessage(event: MessageEvent) {
    state.lastEventId = event.lastEventId || null;
    state.lastEventAt = Date.now();
    dispatchEvent(listenerMap, 'message', event);
    if (event.type && event.type !== 'message') {
      dispatchEvent(listenerMap, event.type, event);
    }
  }

  function connect(targetUrl: string | null = state.url) {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      updateStatus('unsupported');
      state.error = new Error('EventSource non supportato nell\'ambiente corrente');
      return;
    }
    if (!targetUrl) {
      return;
    }
    if (eventSource && state.url === targetUrl && state.status === 'open') {
      return;
    }
    cleanupSource();
    clearReconnectTimer();
    state.error = null;
    state.url = targetUrl;
    state.status = 'connecting';
    state.attempts = 0;
    try {
      eventSource = new EventSource(targetUrl, {
        withCredentials: Boolean(options.withCredentials),
      });
    } catch (error) {
      state.error = error instanceof Error ? error : new Error(String(error));
      updateStatus('errored');
      scheduleReconnect();
      return;
    }
    eventSource.onopen = () => {
      state.attempts = 0;
      state.error = null;
      updateStatus('open');
    };
    eventSource.onerror = () => {
      state.error = new Error('Connessione stream QA interrotta');
      updateStatus('errored');
      cleanupSource();
      scheduleReconnect();
    };
    eventSource.onmessage = handleMessage;
  }

  function disconnect() {
    clearReconnectTimer();
    cleanupSource();
    state.attempts = 0;
    if (state.status === 'open' || state.status === 'connecting') {
      updateStatus('closed');
    }
  }

  function reconnect() {
    const url = state.url;
    disconnect();
    if (url) {
      connect(url);
    }
  }

  function setUrl(url: string | null) {
    state.url = url;
  }

  function on(event: string, handler: EventHandler): () => void {
    const key = event || 'message';
    if (!listenerMap.has(key)) {
      listenerMap.set(key, new Set<EventHandler>());
    }
    const listeners = listenerMap.get(key)!;
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
      if (listeners.size === 0) {
        listenerMap.delete(key);
      }
    };
  }

  function off(event: string, handler?: EventHandler) {
    const key = event || 'message';
    const listeners = listenerMap.get(key);
    if (!listeners) {
      return;
    }
    if (handler) {
      listeners.delete(handler);
    } else {
      listeners.clear();
    }
    if (listeners.size === 0) {
      listenerMap.delete(key);
    }
  }

  const scope = getCurrentScope();
  if (scope) {
    onScopeDispose(() => {
      clearReconnectTimer();
      cleanupSource();
      listenerMap.clear();
    });
  }

  return {
    state: readonly(state),
    connect,
    disconnect,
    reconnect,
    setUrl,
    on,
    off,
  };
}
