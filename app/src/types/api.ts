export type ApiErrorCode =
  | 'authentication_required'
  | 'caption_fetch_failed'
  | 'guest_lookup_unavailable'
  | 'invalid_phrase_translation_request'
  | 'invalid_turn_id'
  | 'invalid_video'
  | 'missing_2000nl_user_token'
  | 'missing_clicked_form'
  | 'missing_phrase_id'
  | 'missing_source_language_code'
  | 'missing_source_text'
  | 'missing_video_id'
  | 'no_captions'
  | 'no_match'
  | 'not_available'
  | 'platform_session_unavailable'
  | 'platform_unavailable'
  | 'practice_operation_not_found'
  | 'provider_error'
  | 'provider_rate_limited'
  | 'rate_limited'
  | string;

export type ApiErrorBody = {
  error: ApiErrorCode;
  code?: ApiErrorCode;
  message?: string;
  detail?: string | null;
  recoverable?: boolean;
  retryable?: boolean;
  suggestedAction?: string;
};

export type ApiErrorEnvelope = {
  error: {
    code: ApiErrorCode;
    message: string;
    retryable: boolean;
  };
};

export type ReadyEnvelope<T> = {
  state: 'ready';
} & T;

export type FailedEnvelope<T = Record<string, never>> = {
  state: 'failed';
  error: {
    code: ApiErrorCode;
    message: string;
    retryable: boolean;
  };
} & T;
