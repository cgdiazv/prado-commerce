export type TaskbarPosition = "side" | "top";
export type TaskbarInitialState = "expanded" | "collapsed";

export interface TaskbarSettings {
  position: TaskbarPosition;
  initialState: TaskbarInitialState;
}

export const TASKBAR_POSITION_STORAGE_KEY = "prado_taskbar_position";
export const TASKBAR_INITIAL_STATE_STORAGE_KEY = "prado_taskbar_initial_state";
export const TASKBAR_CHANGE_EVENT = "prado_taskbar_settings_changed";

export const DEFAULT_TASKBAR_SETTINGS: TaskbarSettings = {
  position: "side",
  initialState: "expanded",
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getStoredTaskbarSettings(): TaskbarSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_TASKBAR_SETTINGS };
  }

  let position: TaskbarPosition = DEFAULT_TASKBAR_SETTINGS.position;
  let initialState: TaskbarInitialState = DEFAULT_TASKBAR_SETTINGS.initialState;

  try {
    const storedPos = localStorage.getItem(TASKBAR_POSITION_STORAGE_KEY) || readCookie(TASKBAR_POSITION_STORAGE_KEY);
    if (storedPos === "side" || storedPos === "top") {
      position = storedPos;
    }

    const storedState = localStorage.getItem(TASKBAR_INITIAL_STATE_STORAGE_KEY) || readCookie(TASKBAR_INITIAL_STATE_STORAGE_KEY);
    if (storedState === "expanded" || storedState === "collapsed") {
      initialState = storedState;
    }
  } catch {
    // Ignore storage errors
  }

  return { position, initialState };
}

export function setStoredTaskbarSettings(partial: Partial<TaskbarSettings>) {
  if (typeof window === "undefined") return;

  const current = getStoredTaskbarSettings();
  const next: TaskbarSettings = {
    position: partial.position ?? current.position,
    initialState: partial.initialState ?? current.initialState,
  };

  try {
    localStorage.setItem(TASKBAR_POSITION_STORAGE_KEY, next.position);
    localStorage.setItem(TASKBAR_INITIAL_STATE_STORAGE_KEY, next.initialState);
    writeCookie(TASKBAR_POSITION_STORAGE_KEY, next.position);
    writeCookie(TASKBAR_INITIAL_STATE_STORAGE_KEY, next.initialState);
  } catch {
    // Ignore storage errors
  }

  try {
    window.dispatchEvent(
      new CustomEvent(TASKBAR_CHANGE_EVENT, {
        detail: next,
      })
    );
  } catch {
    // Ignore event dispatch errors
  }
}

export function subscribeToTaskbarSettingsChange(
  callback: (settings: TaskbarSettings) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<TaskbarSettings>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    } else {
      callback(getStoredTaskbarSettings());
    }
  };

  const storageHandler = (e: StorageEvent) => {
    if (e.key === TASKBAR_POSITION_STORAGE_KEY || e.key === TASKBAR_INITIAL_STATE_STORAGE_KEY) {
      callback(getStoredTaskbarSettings());
    }
  };

  window.addEventListener(TASKBAR_CHANGE_EVENT, handler);
  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener(TASKBAR_CHANGE_EVENT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}
