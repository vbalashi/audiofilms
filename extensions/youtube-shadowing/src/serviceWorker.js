try { importScripts("config.js"); } catch (_error) {}
const CONNECT_SESSION_STORAGE_KEY = "af2000nlConnectSession";
const DEFAULT_API_BASE = globalThis.__afShadowingConfig?.defaults?.apiBase || "https://audiofilms-api.dilum.io";
const DEFAULT_CONNECT_BASE_URL = globalThis.__afShadowingConfig?.defaults?.connectBase || "https://2000.dilum.io";
const DEFAULT_CONNECT_CLIENT_ID = "audiofilms_chrome_dev";
const CONNECT_SCOPE = "platform:read platform:write offline_access";
const REFRESH_SKEW_SECONDS = 90;
const ALLOW_LOCAL_BEARER_TARGETS = globalThis.__afShadowingConfig?.defaults?.allowLocalBearerTargets === true;

restrictChromeStorageToTrustedContexts();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "af-fetch-backend-subtitles") {
    fetchBackendSubtitles(message.url, message.options)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          ok: false,
          status: 0,
          text: "",
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return true;
  }

  if (message?.type === "af-fetch-dictionary-lookup") {
    sendResponse({
      ok: false,
      status: 400,
      text: "",
      error: "Dictionary requests must use service-worker commands.",
    });

    return false;
  }

  if (message?.type === "af-dictionary-command") {
    fetchDictionaryCommand(message.operation, message.body)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          ok: false,
          status: 0,
          text: "",
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return true;
  }

  if (message?.type === "af-get-2000nl-session") {
    getFreshConnectSession()
      .then((result) => {
        sendResponse({
          ok: result.ok,
          session: result.session || null,
          error: result.error || "",
        });
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          session: null,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return true;
  }

  if (message?.type === "af-connect-2000nl") {
    connectTwoThousandNl()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          ok: false,
          session: null,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return true;
  }

  if (message?.type === "af-disconnect-2000nl") {
    disconnectTwoThousandNl()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return true;
  }

  return false;
});

async function fetchBackendSubtitles(url, options = {}) {
  if (!url || typeof url !== "string") {
    throw new Error("Missing backend subtitles URL.");
  }

  const response = await fetch(url, {
    credentials: "omit",
    method: options.method || "GET",
    body: options.body,
    headers: {
      accept: "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    text,
  };
}

async function fetchDictionaryCommand(operation, body = null) {
  const command = dictionaryCommand(operation);
  const headers = {
    accept: "application/json",
    ...(command.method === "POST" ? { "content-type": "application/json" } : {}),
  };

  const session = await getFreshConnectSession();
  if (session.ok && session.accessToken && shouldAttachDictionaryBearer(command.url)) {
    headers.authorization = `Bearer ${session.accessToken}`;
  }

  const response = await fetch(command.url, {
    credentials: "omit",
    method: command.method,
    headers,
    ...(command.method === "POST" ? { body: JSON.stringify(body || {}) } : {}),
  });
  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    text,
  };
}

function dictionaryCommand(operation) {
  const routes = {
    "dict-lookup": { method: "POST", path: "/api/dict/lookup" },
    "dict-action": { method: "POST", path: "/api/dict/actions" },
    "dict-translation": { method: "POST", path: "/api/dict/translation" },
    "dict-session": { method: "GET", path: "/api/dict/session" },
  };
  const route = routes[operation];
  if (!route) {
    throw new Error("Unsupported dictionary command.");
  }
  return {
    method: route.method,
    url: new URL(route.path, `${trustedApiBase()}/`).toString(),
  };
}

async function connectTwoThousandNl() {
  if (!chrome.identity?.launchWebAuthFlow) {
    throw new Error("Chrome identity API is unavailable.");
  }

  const baseUrl = normalizeConnectBaseUrl();
  const clientId = normalizeClientId();
  const redirectUri = chrome.identity.getRedirectURL();
  const state = randomBase64Url(24);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const authorizeUrl = new URL(`${baseUrl}/connect/authorize`);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", CONNECT_SCOPE);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  const redirectedTo = await launchWebAuthFlow({
    url: authorizeUrl.toString(),
    interactive: true,
  });
  const redirectedUrl = new URL(redirectedTo);
  const returnedState = redirectedUrl.searchParams.get("state");
  const code = redirectedUrl.searchParams.get("code");
  const error = redirectedUrl.searchParams.get("error");

  if (error) {
    throw new Error(error);
  }
  if (!code || returnedState !== state) {
    throw new Error("Invalid 2000NL authorization response.");
  }

  const session = await exchangeConnectToken(baseUrl, {
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });
  await storeConnectSession({ ...session, baseUrl, clientId });
  return { ok: true, session: publicConnectSession(session) };
}

async function getFreshConnectSession() {
  const stored = await readConnectSession();
  if (!stored?.refresh_token) {
    return { ok: true, session: null };
  }
  if (!isPinnedConnectSession(stored)) {
    await clearConnectSession();
    return { ok: true, session: null };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (stored.access_token && Number(stored.expires_at || 0) > nowSeconds + REFRESH_SKEW_SECONDS) {
    return { ok: true, session: publicConnectSession(stored), accessToken: stored.access_token };
  }

  try {
    const baseUrl = normalizeConnectBaseUrl();
    const clientId = normalizeClientId();
    const refreshed = await exchangeConnectToken(baseUrl, {
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: stored.refresh_token,
    });
    await storeConnectSession({ ...refreshed, baseUrl, clientId });
    return { ok: true, session: publicConnectSession(refreshed), accessToken: refreshed.access_token };
  } catch (error) {
    await clearConnectSession();
    return {
      ok: false,
      session: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function disconnectTwoThousandNl() {
  const stored = await readConnectSession();
  if (stored?.refresh_token && isPinnedConnectSession(stored)) {
    const baseUrl = normalizeConnectBaseUrl();
    const clientId = normalizeClientId();
    await fetch(`${baseUrl}/api/connect/revoke`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        refresh_token: stored.refresh_token,
      }),
    }).catch(() => null);
  }
  await clearConnectSession();
  return { ok: true };
}

async function exchangeConnectToken(baseUrl, body) {
  const response = await fetch(`${baseUrl}/api/connect/token`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || payload?.detail || `2000NL Connect returned HTTP ${response.status}`);
  }
  return payload;
}

function launchWebAuthFlow(options) {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(options, (redirectedTo) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!redirectedTo) {
        reject(new Error("2000NL authorization was cancelled."));
        return;
      }
      resolve(redirectedTo);
    });
  });
}

async function readConnectSession() {
  const values = await chromeStorageGet(CONNECT_SESSION_STORAGE_KEY);
  return values?.[CONNECT_SESSION_STORAGE_KEY] || null;
}

async function storeConnectSession(session) {
  await chromeStorageSet({ [CONNECT_SESSION_STORAGE_KEY]: session });
}

async function clearConnectSession() {
  await chromeStorageRemove(CONNECT_SESSION_STORAGE_KEY);
}

function chromeStorageGet(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (values) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(values);
    });
  });
}

function chromeStorageSet(values) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(values, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function chromeStorageRemove(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(key, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function normalizeConnectBaseUrl() {
  return String(DEFAULT_CONNECT_BASE_URL).trim().replace(/\/+$/, "") || "https://2000.dilum.io";
}

function trustedApiBase() {
  return String(DEFAULT_API_BASE).trim().replace(/\/+$/, "") || "https://audiofilms-api.dilum.io";
}

function normalizeClientId() {
  return String(DEFAULT_CONNECT_CLIENT_ID).trim() || "audiofilms_chrome_dev";
}

function isPinnedConnectSession(session) {
  const sessionBaseUrl = String(session?.baseUrl || "").trim().replace(/\/+$/, "");
  const sessionClientId = String(session?.clientId || "").trim();
  return sessionBaseUrl === normalizeConnectBaseUrl() && sessionClientId === normalizeClientId();
}

function publicConnectSession(session) {
  return {
    expires_at: session.expires_at || null,
    expires_in: session.expires_in || null,
    token_type: session.token_type || "bearer",
    scope: session.scope || "",
    user: session.user || null,
  };
}

function shouldAttachDictionaryBearer(url) {
  try {
    const parsed = new URL(url);
    if (!/\/api\/dict(?:\/|$)/.test(parsed.pathname)) {
      return false;
    }
    const allowedOrigins = new Set([
      "https://audiofilms-api.dilum.io",
    ]);
    allowedOrigins.add(new URL(trustedApiBase()).origin);
    if (ALLOW_LOCAL_BEARER_TARGETS) {
      allowedOrigins.add("http://localhost:3000");
      allowedOrigins.add("http://127.0.0.1:3000");
    }
    return allowedOrigins.has(parsed.origin);
  } catch (_error) {
    return false;
  }
}

function restrictChromeStorageToTrustedContexts() {
  if (!chrome.storage?.local?.setAccessLevel) {
    return;
  }
  chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }, () => {
    if (chrome.runtime.lastError) {
      console.warn("Failed to restrict chrome.storage.local access:", chrome.runtime.lastError.message);
    }
  });
}

function randomBase64Url(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256Base64Url(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
