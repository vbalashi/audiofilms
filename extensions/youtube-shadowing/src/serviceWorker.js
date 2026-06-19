try { importScripts("config.js"); } catch (_error) {}
const CONNECT_SESSION_STORAGE_KEY = "af2000nlConnectSession";
const ASR_TESTER_TOKEN_STORAGE_KEY = "afAsrTesterToken";
const DEFAULT_API_BASE = globalThis.__afShadowingConfig?.defaults?.apiBase || "https://audiofilms-api.dilum.io";
const DEFAULT_CONNECT_BASE_URL = globalThis.__afShadowingConfig?.defaults?.connectBase || "https://2000.dilum.io";
const DEFAULT_CONNECT_CLIENT_ID = "audiofilms_chrome_dev";
const CONNECT_SCOPE = "platform:read platform:write offline_access";
const REFRESH_SKEW_SECONDS = 90;
const ALLOW_LOCAL_BEARER_TARGETS = globalThis.__afShadowingConfig?.defaults?.allowLocalBearerTargets === true;

restrictChromeStorageToTrustedContexts();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "af-fetch-backend-subtitles") {
    sendResponse({
      ok: false,
      status: 400,
      text: "",
      error: "Backend requests must use service-worker commands.",
    });

    return false;
  }

  if (message?.type === "af-backend-command") {
    fetchBackendCommand(message.operation, message.body)
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

async function fetchBackendCommand(operation, body = {}) {
  const command = backendCommand(operation, body || {});
  const headers = {
    accept: "application/json",
    ...(command.method === "POST" ? { "content-type": "application/json" } : {}),
  };
  if (backendCommandNeedsTesterToken(operation)) {
    const testerToken = await trustedTesterToken();
    if (testerToken) {
      headers.authorization = `Bearer ${testerToken}`;
    }
  }

  const response = await fetch(command.url, {
    credentials: "omit",
    method: command.method,
    headers,
    ...(command.method === "POST" ? { body: JSON.stringify(command.payload || {}) } : {}),
  });
  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    text,
  };
}

function backendCommand(operation, body) {
  const apiBase = trustedBackendApiBase(body.apiBase);
  if (operation === "get-subs") {
    const url = new URL("/api/get-subs", `${apiBase}/`);
    setSearchParam(url, "videoId", body.videoId);
    setSearchParam(url, "lang", body.lang || "auto");
    setSearchParam(url, "sourceKind", body.sourceKind || "manual");
    if (body.refresh === true) url.searchParams.set("refresh", "1");
    return { method: "GET", url: url.toString() };
  }
  if (operation === "local-asr-practice") {
    const url = new URL("/api/local-asr-practice", `${apiBase}/`);
    setSearchParam(url, "videoId", body.videoId);
    setSearchParam(url, "lang", body.lang || "auto");
    setSearchParam(url, "sourceKind", body.sourceKind || "manual");
    setSearchParam(url, "textSource", body.textSource);
    setSearchParam(url, "engine", body.engine);
    setSearchParam(url, "model", body.model);
    setSearchParam(url, "duration", body.duration);
    if (body.refresh === true) url.searchParams.set("refresh", "1");
    return { method: "GET", url: url.toString() };
  }
  if (operation === "asr-create") {
    return {
      method: "POST",
      url: new URL("/api/asr/jobs", `${apiBase}/`).toString(),
      payload: body.payload || {},
    };
  }
  if (operation === "practice-timing-create") {
    return {
      method: "POST",
      url: new URL("/api/practice/timing-jobs", `${apiBase}/`).toString(),
      payload: body.payload || {},
    };
  }
  if (operation === "practice-operation") {
    const operationId = normalizePracticeOperationId(body.operationId);
    return {
      method: "GET",
      url: new URL(`/api/practice/operations/${encodeURIComponent(operationId)}`, `${apiBase}/`).toString(),
    };
  }
  if (operation === "asr-status") {
    const jobId = normalizeAsrJobId(body.jobId);
    return {
      method: "GET",
      url: new URL(`/api/asr/jobs/${encodeURIComponent(jobId)}`, `${apiBase}/`).toString(),
    };
  }
  if (operation === "asr-result") {
    const jobId = normalizeAsrJobId(body.jobId);
    return {
      method: "GET",
      url: new URL(`/api/asr/jobs/${encodeURIComponent(jobId)}/result`, `${apiBase}/`).toString(),
    };
  }
  throw new Error("Unsupported backend command.");
}

function backendCommandNeedsTesterToken(operation) {
  return operation === "asr-create" ||
    operation === "practice-timing-create" ||
    operation === "practice-operation" ||
    operation === "asr-status" ||
    operation === "asr-result";
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

function trustedBackendApiBase(value) {
  const fallback = trustedApiBase();
  const parsed = new URL(String(value || fallback), `${fallback}/`);
  const allowedOrigins = new Set([
    "https://audiofilms-api.dilum.io",
    new URL(fallback).origin,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);
  if (!allowedOrigins.has(parsed.origin)) {
    throw new Error("Backend API origin is not allowed.");
  }
  return parsed.origin;
}

function setSearchParam(url, name, value) {
  const text = String(value || "").trim();
  if (text) url.searchParams.set(name, text);
}

function normalizeTesterToken(value) {
  const token = String(value || "").trim();
  if (!token || /[\r\n]/.test(token)) return "";
  return token;
}

async function trustedTesterToken() {
  const configured =
    globalThis.__afShadowingConfig?.trustedTesterToken?.() ||
    globalThis.__afShadowingConfig?.defaults?.testerToken ||
    globalThis.__AF_ASR_TESTER_TOKEN ||
    "";
  const configuredToken = normalizeTesterToken(configured);
  if (configuredToken) return configuredToken;

  try {
    const values = await chromeStorageGet(ASR_TESTER_TOKEN_STORAGE_KEY);
    return normalizeTesterToken(values?.[ASR_TESTER_TOKEN_STORAGE_KEY]);
  } catch (_error) {
    return "";
  }
}

function normalizeAsrJobId(value) {
  const jobId = String(value || "").trim();
  if (!/^asr_[a-z0-9_-]+$/i.test(jobId)) {
    throw new Error("Invalid ASR job id.");
  }
  return jobId;
}

function normalizePracticeOperationId(value) {
  const operationId = String(value || "").trim();
  if (!/^(?:timing|get-captions):[a-z0-9_:-]+$/i.test(operationId)) {
    throw new Error("Invalid practice operation id.");
  }
  return operationId;
}

function dictionaryCommand(operation) {
  const routes = {
    "dict-lookup": { method: "POST", path: "/api/dict/lookup" },
    "dict-action": { method: "POST", path: "/api/dict/actions" },
    "dict-translation": { method: "POST", path: "/api/dict/translation" },
    "dict-session": { method: "GET", path: "/api/dict/session" },
    "phrase-translation": { method: "POST", path: "/api/practice/phrase-translations" },
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
    if (!/\/api\/(?:dict|practice\/phrase-translations)(?:\/|$)/.test(parsed.pathname)) {
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
