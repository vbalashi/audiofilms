(function audioFilmsDictionaryMocks(root) {
  function dictionaryMockResponse(operation, body = null, mockMode = "", options = {}) {
    if (mockMode !== "cards" && mockMode !== "generated") return null;
    if (operation === "dict-lookup") {
      if (mockMode === "generated") {
        return jsonCommandResponse({
          contractVersion: "dict-lookup-v2",
          clickedForm: body?.clickedForm || "gedoe",
          query: body?.clickedForm || "gedoe",
          cards: [],
          error: "no_match",
          code: "no_match",
          meta: { provider: "mock", responseVersion: "overlay-v2" },
        }, false, 404);
      }
      return jsonCommandResponse(mockDictionaryLookup(body, options));
    }
    if (operation === "dict-search") {
      return jsonCommandResponse(mockDictionarySearch(body));
    }
    if (operation === "dict-translation") {
      if (body?.entryId === "entry-translate-error") {
        return jsonCommandResponse({ error: "Card translation failed." }, false, 500);
      }
      return jsonCommandResponse({
        status: "ready",
        overlay: {
          headword: "apple",
          meanings: [
            {
              definition: "круглый фрукт для учебных примеров",
              examples: ["яблоко от яблони недалеко падает"],
            },
          ],
        },
      });
    }
    if (operation === "dict-action") {
      return jsonCommandResponse({ ok: true });
    }
    if (operation === "dict-generated-draft") {
      return jsonCommandResponse({
        ok: true,
        draft: {
          draftSetId: "mock-draft-set",
          candidateId: "mock-candidate",
          revision: 1,
          clickedForm: body?.clickedForm || "appel",
          languageCode: body?.sourceLanguageCode || "nl",
          contextText: body?.contextText || "",
          sourceContext: body?.sourceContext,
          item: {
            draftSetId: "mock-draft-set",
            candidateId: "mock-candidate",
            revision: 1,
            entry: {
              content: {
                headword: body?.clickedForm || "appel",
                languageCode: body?.sourceLanguageCode || "nl",
                sections: [
                  {
                    id: "meaning-1",
                    kind: "meaning",
                    text: "Een gegenereerde uitleg voor deze selectie.",
                  },
                  {
                    id: "example-1",
                    kind: "example",
                    text: body?.contextText || "Dit is een voorbeeld.",
                  },
                ],
                summary: {
                  definition: "Een gegenereerde uitleg voor deze selectie.",
                  example: body?.contextText || "Dit is een voorbeeld.",
                },
              },
              contentFingerprint: "mock-generated-entry",
            },
          },
          card: mockGeneratedDraftCard(body, options),
        },
      });
    }
    if (operation === "dict-generated-save") {
      return jsonCommandResponse({
        ok: true,
        entryId: "entry-generated-mock",
        generation: {
          status: "persisted",
          requiresExplicitStartLearning: true,
        },
      });
    }
    return null;
  }

  function jsonCommandResponse(body, ok = true, status = 200) {
    return {
      ok,
      status,
      text: JSON.stringify(body),
    };
  }

  function mockDictionaryLookup(body = {}, options = {}) {
    const clickedForm = body?.clickedForm || "appel";
    return {
      request: {
        clickedForm,
        sourceLanguageCode: body?.sourceLanguageCode || "nl",
        contextText: body?.contextText || "",
      },
      cards: [
        mockDictionaryCard({
          id: "mock-learn",
          entryId: "entry-learn",
          clickedForm,
          headword: "opbouwen",
          headwordTranslation: "строить; выстраивать; формировать",
          definition: "bouwen; tot een geheel maken",
          definitionTranslation: "строить; создать единое целое",
          context: "iemand bouwt iets op",
          contextTranslation: "кто-то что-то выстраивает",
          example: "Na de brand is het huis weer opnieuw opgebouwd.",
          exampleTranslation: "После пожара дом снова отстроили.",
          partOfSpeech: "ww",
          audio: {
            state: "ready",
            kind: "curated",
            primaryUrl: "https://2000.dilum.io/audio/nl/o/opbouwen.mp3",
            variants: {
              nl: "https://2000.dilum.io/audio/nl/o/opbouwen.mp3",
            },
            source: "2000nl",
            format: "audio/mpeg",
          },
          phase: "encountered",
          progressActions: [
            progressDisplayAction("learn", "Start Learning", "start-learning"),
          ],
        }, options),
        mockDictionaryCard({
          id: "mock-review",
          entryId: "entry-review",
          clickedForm,
          headword: "groen licht",
          headwordTranslation: "зеленый свет; разрешение; одобрение",
          definition: "toestemming krijgen om iets te doen",
          definitionTranslation: "получить разрешение что-то сделать",
          example: "Na weken wachten kreeg het project eindelijk groen licht.",
          exampleTranslation: "После недель ожидания проект наконец получил разрешение.",
          partOfSpeech: "idiom",
          audio: {
            state: "resolvable",
            kind: "generated",
            source: "2000nl-tts",
            resolveToken: "mock-resolve-token",
            format: "audio/mpeg",
          },
          phase: "reviewing",
          progressActions: [
            progressDisplayAction("again", "Again", "review-card", "fail", true),
            progressDisplayAction("hard", "Hard", "review-card", "hard", true),
            progressDisplayAction("good", "Good", "review-card", "success", true),
            progressDisplayAction("easy", "Easy", "review-card", "easy", true),
          ],
        }, options),
        mockDictionaryCard({
          id: "mock-frozen",
          entryId: "entry-translate-error",
          clickedForm,
          headword: "opgebouwd",
          headwordTranslation: "",
          definition: "voltooid deelwoord van opbouwen; opnieuw tot stand gebracht",
          definitionTranslation: "",
          example: "Het huis is na de brand opnieuw opgebouwd.",
          exampleTranslation: "",
          partOfSpeech: "ww",
          phase: "frozen",
          progressActions: [],
        }, options),
      ],
      meta: {
        provider: "mock",
        version: "dictionary-card-ui-smoke",
      },
    };
  }

  function mockDictionarySearch(body = {}) {
    const query = body?.clickedForm || "appel";
    const group = body?.group || null;
    const groups = [
      {
        id: "headwords",
        total: 1,
        items: [],
        page: { limit: body?.limit || 5, nextCursor: null, hasMore: false },
      },
      {
        id: "examples",
        total: 2,
        items: [
          {
            kind: "field-match",
            resultKey: "entry-learn:raw.meanings[0].examples[0]",
            entry: { id: "entry-learn", headword: query },
            field: { kind: "example", text: `Een voorbeeldzin met ${query}.` },
            match: { matchedText: query },
          },
        ],
        page: { limit: body?.limit || 5, nextCursor: "mock-examples-cursor", hasMore: !body?.cursor },
      },
      {
        id: "definitions",
        total: 1,
        items: [
          {
            kind: "field-match",
            resultKey: "entry-learn:raw.meanings[0].definition",
            entry: { id: "entry-learn", headword: query },
            field: { kind: "meaning-definition", text: `${query} in een woordenboekbetekenis.` },
            match: { matchedText: query },
          },
        ],
        page: { limit: body?.limit || 5, nextCursor: null, hasMore: false },
      },
      {
        id: "alphabetical",
        total: 3,
        items: [
          {
            kind: "entry",
            entry: { id: "entry-alpha-1", headword: query, summaryDefinition: "alfabetische buur" },
            match: { relation: "alphabetical", matchedText: query },
          },
        ],
        page: { limit: body?.limit || 5, nextCursor: null, hasMore: false },
      },
    ];
    return {
      contractVersion: "dictionary-search-v1",
      query,
      request: {
        languageCode: body?.sourceLanguageCode || "nl",
        scope: "mock",
        ...(group ? { group } : {}),
      },
      groups: group ? groups.filter((candidate) => candidate.id === group) : groups,
    };
  }

  function mockGeneratedDraftCard(body = {}, options = {}) {
    const clickedForm = body?.clickedForm || "gedoe";
    return {
      ...mockDictionaryCard({
        id: "mock-generated-draft",
        entryId: "",
        clickedForm,
        headword: clickedForm,
        phase: "not-started",
        progressActions: [
          {
            id: "save-and-learn",
            label: "Start Learning",
            group: "progress",
            enabled: true,
            command: { kind: "generated-save-and-start-learning" },
          },
        ],
      }, options),
      generatedDraftItem: {
        entry: {
          id: "draft:mock-generated-draft",
          content: {
            headword: clickedForm,
            languageCode: body?.sourceLanguageCode || "nl",
            sections: [
              {
                id: "meaning-1",
                kind: "meaning",
                text: "Een gegenereerde uitleg voor deze selectie.",
              },
              {
                id: "example-1",
                kind: "example",
                text: body?.contextText || "Dit is een voorbeeld.",
              },
            ],
          },
        },
      },
    };
  }

  function mockDictionaryCard({
    id,
    entryId,
    clickedForm,
    headword,
    headwordTranslation = "apple",
    definition = "A round fruit used in learner examples.",
    definitionTranslation = "круглый фрукт для учебных примеров",
    context = "",
    contextTranslation = "",
    example = `${clickedForm} valt niet ver van de boom.`,
    exampleTranslation = "яблоко от яблони недалеко падает",
    meaningId = 1,
    partOfSpeech = "noun",
    audio,
    phase,
    progressActions,
  }, options = {}) {
    const includeLookupTranslations = Boolean(entryId) && entryId !== "entry-translate-error";
    const now = options.now && typeof options.now.toISOString === "function" ? options.now : new Date();
    return {
      id,
      entryId,
      clickedForm,
      headword,
      language: "Dutch",
      meaningId,
      partOfSpeech,
      ...(audio ? { audio } : {}),
      match: { relation: "exact", confidence: 1 },
      summary: {
        definition,
        ...(includeLookupTranslations && definitionTranslation ? { definitionTranslation } : {}),
        example,
        ...(includeLookupTranslations && exampleTranslation ? { exampleTranslation } : {}),
      },
      ...(includeLookupTranslations && headwordTranslation ? { headwordTranslation } : {}),
      chips: [
        { kind: "part-of-speech", label: partOfSpeech },
        { kind: "language", label: "Dutch" },
      ],
      sections: [
        { kind: "meaning", label: "Definition", text: definition },
        ...(context
          ? [{
              kind: "context",
              text: context,
              ...(includeLookupTranslations && contextTranslation ? { translation: contextTranslation } : {}),
            }]
          : []),
        {
          kind: "example",
          text: example,
          ...(includeLookupTranslations && exampleTranslation ? { translation: exampleTranslation } : {}),
        },
        ...(partOfSpeech === "idiom"
          ? [{
              kind: "note",
              label: "usage note",
              text: "Used for permission from a person, organization, or authority.",
            }]
          : []),
      ],
      ...(includeLookupTranslations
        ? {
            translation: {
              status: "ready",
              targetLanguageCode: "ru",
              translationId: `mock-translation-${id}`,
              translationPolicyVersion: "mock-v1",
            },
          }
        : {}),
      progress: {
        phase,
        seenCount: phase === "encountered" ? 1 : 4,
        lastSeenAt: now.toISOString(),
      },
      displayActions: [
        ...progressActions,
        {
          id: "translate",
          label: "Translate",
          group: "translation",
          enabled: true,
          command: { kind: "card-translation" },
        },
      ],
    };
  }

  function progressDisplayAction(id, label, action, result, requiresTurnId = false) {
    return {
      id,
      label,
      group: "progress",
      enabled: true,
      command: {
        kind: "platform-action",
        action,
        ...(result ? { result } : {}),
        ...(requiresTurnId ? { requiresTurnId: true } : {}),
      },
    };
  }

  root.__afShadowingDictionaryMocks = {
    dictionaryMockResponse,
    jsonCommandResponse,
    mockDictionaryLookup,
    mockDictionarySearch,
    mockGeneratedDraftCard,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
