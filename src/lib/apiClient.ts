const SESSION_TOKEN_KEY = 'ma_mill_session_token_v1';
const BANK_TOKEN_KEY = 'ma_mill_bank_token_v1';

// In-memory fallbacks ensure tokens always work even if iframe blocks Web Storage
let memorySessionToken: string | null = null;
let memoryBankToken: string | null = null;

export function getSessionToken(): string | null {
  if (memorySessionToken) return memorySessionToken;
  try {
    const val = localStorage.getItem(SESSION_TOKEN_KEY);
    if (val) memorySessionToken = val;
    return val;
  } catch {
    return memorySessionToken;
  }
}

export function setSessionToken(token: string | null) {
  memorySessionToken = token;
  try {
    if (token) {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // ignore storage errors in restricted iframes
  }
}

export function getBankToken(): string | null {
  if (memoryBankToken) return memoryBankToken;
  try {
    const val = sessionStorage.getItem(BANK_TOKEN_KEY) || localStorage.getItem(BANK_TOKEN_KEY);
    if (val) memoryBankToken = val;
    return val;
  } catch {
    return memoryBankToken;
  }
}

export function setBankToken(token: string | null) {
  memoryBankToken = token;
  try {
    if (token) {
      sessionStorage.setItem(BANK_TOKEN_KEY, token);
      localStorage.setItem(BANK_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(BANK_TOKEN_KEY);
      localStorage.removeItem(BANK_TOKEN_KEY);
    }
  } catch {
    // ignore storage errors in restricted iframes
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const sessionToken = getSessionToken();
  if (sessionToken) {
    headers['x-mill-session'] = sessionToken;
  }

  const bankToken = getBankToken();
  if (bankToken) {
    headers['x-bank-token'] = bankToken;
  }

  const res = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json().catch(() => ({}))
    : {};

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }

  return data as T;
}
