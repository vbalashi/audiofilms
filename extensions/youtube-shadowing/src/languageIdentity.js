(function audioFilmsLanguageIdentity() {
  const aliases = { he: "he", iw: "he", id: "id", in: "id", yi: "yi", ji: "yi", jw: "jw", jv: "jw" };

  function identifyLanguage(value) {
    const raw = String(value || "").trim();
    if (!raw || raw.toLowerCase() === "auto") {
      return { raw, canonicalTag: "", baseLanguage: "", script: "", region: "", asrLanguage: "" };
    }
    const subtags = raw.replace(/_/g, "-").split("-").filter(Boolean);
    const language = (subtags[0] || "").toLowerCase();
    const baseLanguage = aliases[language] || language;
    const scriptPart = subtags.slice(1).find((part) => /^[A-Za-z]{4}$/.test(part));
    const regionPart = subtags.slice(1).find((part) => /^[A-Za-z]{2}$/.test(part) || /^\d{3}$/.test(part));
    const script = scriptPart ? scriptPart[0].toUpperCase() + scriptPart.slice(1).toLowerCase() : "";
    const region = regionPart && /^[A-Za-z]{2}$/.test(regionPart) ? regionPart.toUpperCase() : regionPart || "";
    return {
      raw,
      canonicalTag: [baseLanguage, script, region].filter(Boolean).join("-"),
      baseLanguage,
      script,
      region,
      asrLanguage: baseLanguage,
    };
  }

  function compareLanguageIdentity(left, right) {
    const a = identifyLanguage(left);
    const b = identifyLanguage(right);
    if (!a.canonicalTag || !b.canonicalTag) return "incompatible";
    if (a.canonicalTag === b.canonicalTag) return "exact";
    if (a.baseLanguage !== b.baseLanguage) return "incompatible";
    if (a.script && b.script && a.script !== b.script) return "incompatible";
    if (a.region && b.region && a.region !== b.region) return "incompatible";
    return "compatible";
  }

  window.__afShadowingLanguageIdentity = {
    identifyLanguage,
    compareLanguageIdentity,
    normalizeLanguageCode: (value) => identifyLanguage(value).canonicalTag,
    asrLanguageCode: (value) => identifyLanguage(value).asrLanguage,
  };
})();
