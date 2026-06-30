(function audioFilmsOptions() {
  const ASR_TESTER_TOKEN_STORAGE_KEY = "afAsrTesterToken";
  const DEV_MOCKS_STORAGE_KEY = "afShadowingDevMocks";
  const tokenInput = document.getElementById("asrTesterToken");
  const saveButton = document.getElementById("saveToken");
  const clearButton = document.getElementById("clearToken");
  const devDictionaryMock = document.getElementById("devDictionaryMock");
  const devIssueReportMock = document.getElementById("devIssueReportMock");
  const saveDevMocks = document.getElementById("saveDevMocks");
  const status = document.getElementById("status");

  function setStatus(message) {
    status.textContent = message;
  }

  function normalizeToken(value) {
    const token = String(value || "").trim();
    if (!token || /[\r\n]/.test(token)) return "";
    return token;
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

  async function loadStatus() {
    const values = await chromeStorageGet(ASR_TESTER_TOKEN_STORAGE_KEY);
    const hasToken = Boolean(normalizeToken(values?.[ASR_TESTER_TOKEN_STORAGE_KEY]));
    setStatus(hasToken ? "ASR tester token is saved." : "No ASR tester token saved.");
  }

  saveButton.addEventListener("click", async () => {
    const token = normalizeToken(tokenInput.value);
    if (!token) {
      setStatus("Paste a valid token before saving.");
      return;
    }
    await chromeStorageSet({ [ASR_TESTER_TOKEN_STORAGE_KEY]: token });
    tokenInput.value = "";
    setStatus("ASR tester token saved.");
  });

  clearButton.addEventListener("click", async () => {
    await chromeStorageRemove(ASR_TESTER_TOKEN_STORAGE_KEY);
    tokenInput.value = "";
    setStatus("ASR tester token cleared.");
  });

  saveDevMocks?.addEventListener("click", async () => {
    await chromeStorageSet({
      [DEV_MOCKS_STORAGE_KEY]: {
        dictionary: normalizeDictionaryMock(devDictionaryMock?.value),
        issueReport: normalizeIssueReportMock(devIssueReportMock?.value),
      },
    });
    setStatus("Dev mock settings saved.");
  });

  loadStatus().catch((error) => {
    setStatus(error instanceof Error ? error.message : "Could not read extension storage.");
  });

  function normalizeDictionaryMock(value) {
    return ["cards", "generated"].includes(value) ? value : "";
  }

  function normalizeIssueReportMock(value) {
    return ["success", "failure", "error"].includes(value) ? value : "";
  }
})();
