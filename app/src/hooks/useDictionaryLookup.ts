"use client";

import { useCallback, useState } from "react";
import type {
  DictionaryLookupErrorResponse,
  DictionaryLookupSuccessResponse,
} from "@/types/dictionary";

export type DictionaryLookupStatus = "idle" | "loading" | "ready" | "error";

type LookupParams = {
  word: string;
  language: string;
  context?: string;
};

type DictionaryLookupState = {
  status: DictionaryLookupStatus;
  selectedWord: string | null;
  definitions: string[];
  error: string | null;
  translateUrl: string | null;
  warning: string | null;
  provider: string | null;
  recoverable: boolean;
};

const initialState: DictionaryLookupState = {
  status: "idle",
  selectedWord: null,
  definitions: [],
  error: null,
  translateUrl: null,
  warning: null,
  provider: null,
  recoverable: false,
};

export function useDictionaryLookup() {
  const [state, setState] = useState<DictionaryLookupState>(initialState);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const lookup = useCallback(async ({ word, language, context }: LookupParams) => {
    if (!word) {
      return;
    }

    setState({
      status: "loading",
      selectedWord: word,
      definitions: [],
      error: null,
      translateUrl: null,
      warning: null,
      provider: null,
      recoverable: false,
    });

    try {
      const params = new URLSearchParams({
        word,
        language,
        context: context || "",
      });

      const response = await fetch(`/api/dict?${params.toString()}`);
      const payload = (await response.json().catch(() => ({}))) as
        | DictionaryLookupSuccessResponse
        | DictionaryLookupErrorResponse;

      if (!response.ok) {
        const message =
          "error" in payload &&
          typeof payload.error === "string" &&
          payload.error.length > 0
            ? payload.error
            : "Lookup failed";

        setState({
          status: "error",
          selectedWord: word,
          definitions: [],
          error: message,
          translateUrl:
            "translateUrl" in payload && payload.translateUrl
              ? payload.translateUrl
              : null,
          warning: null,
          provider: null,
          recoverable:
            "recoverable" in payload && typeof payload.recoverable === "boolean"
              ? payload.recoverable
              : false,
        });
        return;
      }

      const definitions = "definitions" in payload ? payload.definitions : [];
      setState({
        status: "ready",
        selectedWord: word,
        definitions: definitions.filter(Boolean),
        error: null,
        translateUrl: null,
        warning:
          "meta" in payload && payload.meta?.warning ? payload.meta.warning : null,
        provider:
          "meta" in payload && payload.meta?.provider ? payload.meta.provider : null,
        recoverable: false,
      });
    } catch (error) {
      console.error(error);
      setState({
        status: "error",
        selectedWord: word,
        definitions: [],
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch definition right now.",
        translateUrl: null,
        warning: null,
        provider: null,
        recoverable: true,
      });
    }
  }, []);

  return {
    ...state,
    lookup,
    reset,
  };
}
