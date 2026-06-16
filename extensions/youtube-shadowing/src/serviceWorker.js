chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "af-fetch-backend-subtitles") {
    fetchBackendSubtitles(message.url)
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
    fetchDictionaryLookup(message.url)
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

  return false;
});

async function fetchBackendSubtitles(url) {
  if (!url || typeof url !== "string") {
    throw new Error("Missing backend subtitles URL.");
  }

  const response = await fetch(url, {
    credentials: "omit",
    headers: {
      accept: "application/json",
    },
  });
  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    text,
  };
}

async function fetchDictionaryLookup(url) {
  if (!url || typeof url !== "string") {
    throw new Error("Missing dictionary lookup URL.");
  }

  const response = await fetch(url, {
    credentials: "omit",
    headers: {
      accept: "application/json",
    },
  });
  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    text,
  };
}
