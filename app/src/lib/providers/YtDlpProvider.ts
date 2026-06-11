import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  SubtitleProviderError,
  type SubtitleProvider,
  type SubtitleFetchOptions,
  type SubtitleFetchResult,
} from '@/types/subtitles';

const execFileAsync = promisify(execFile);

type YtDlpSubtitleFormat = {
  ext?: string;
  url?: string;
  protocol?: string;
};

type YtDlpVideoInfo = {
  subtitles?: Record<string, YtDlpSubtitleFormat[]>;
  automatic_captions?: Record<string, YtDlpSubtitleFormat[]>;
};

type ParsedVttCue = {
  start: number;
  end: number;
  text: string;
  wordTimings?: TimedWord[];
};

type TimedWord = {
  start: number;
  end: number;
  text: string;
};

const MAX_WORD_DURATION_SEC = 1.2;
const KNOWN_NON_SPEECH_TOKENS = new Set([
  'applaus',
  'applause',
  'gelach',
  'laughter',
  'muziek',
  'music',
  'silence',
]);

function classifyYtDlpError(error: unknown): SubtitleProviderError {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'yt-dlp failed';
  const normalized = message.toLowerCase();

  if (
    normalized.includes('incomplete youtube id') ||
    normalized.includes('unsupported url') ||
    normalized.includes('video provider could not be detected')
  ) {
    return new SubtitleProviderError(
      'Invalid YouTube video ID or unsupported video URL.',
      'INVALID_VIDEO',
    );
  }

  if (
    normalized.includes('no subtitles found') ||
    normalized.includes('vtt format not available')
  ) {
    return new SubtitleProviderError('No subtitles found', 'NOT_FOUND');
  }

  if (
    normalized.includes('http 429') ||
    normalized.includes('too many requests') ||
    normalized.includes('rate limit')
  ) {
    return new SubtitleProviderError(
      'YouTube subtitle download was rate-limited with HTTP 429.',
      'RATE_LIMIT',
    );
  }

  return new SubtitleProviderError(
    message,
    'PROVIDER_ERROR',
  );
}

/**
 * YT-DLP subtitle provider implementation (fallback/legacy provider)
 * Uses yt-dlp to retrieve video subtitles locally
 */
export class YtDlpProvider implements SubtitleProvider {
  readonly name = 'yt-dlp';
  private ytDlpPath: string;

  constructor(ytDlpPath = '/usr/bin/yt-dlp') {
    this.ytDlpPath = ytDlpPath;
  }

  async fetchSubtitles(videoId: string, options?: SubtitleFetchOptions): Promise<SubtitleFetchResult> {
    try {
      console.log(`[YtDlpProvider] Fetching subtitles for ${videoId}`);
      
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      const info = await this.getVideoInfo(videoUrl);

      const subtitles = info.subtitles || {};
      const autoCaptions = info.automatic_captions || {};
      const selected = this.selectTrack(subtitles, autoCaptions, options);
      const subTrack = selected?.formats;
      const detectedLang = selected?.language || options?.language || 'en';
      const sourceKind = selected?.sourceKind || options?.sourceKind || 'manual';

      if (!subTrack || !Array.isArray(subTrack)) {
        throw new Error('No subtitles found');
      }

      const vttSub = subTrack.find((subtitle) => subtitle.ext === 'vtt' && subtitle.url && subtitle.protocol !== 'm3u8_native') ||
        subTrack.find((subtitle) => subtitle.ext === 'vtt' && subtitle.url);
      if (!vttSub || !vttSub.url) {
        throw new Error('VTT format not available');
      }

      // Fetch the VTT content
      const response = await fetch(vttSub.url, {
        headers: {
          'accept-language': options?.language || 'en',
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch VTT: HTTP ${response.status} ${response.statusText}`);
      }

      const vttContent = await response.text();
      console.log(`[YtDlpProvider] Fetched ${vttContent.length} characters of VTT`);

      const parsedCues = this.parseVTT(vttContent);
      const normalizedCues = sourceKind === 'auto'
        ? this.normalizeRollingCues(parsedCues)
        : parsedCues;
      const phrases = normalizedCues.map((cue, index) => ({
        id: index,
        startSec: cue.start,
        endSec: cue.end,
        text: cue.text,
      }));

      return {
        phrases,
        language: detectedLang,
        sourceKind,
        retrievalPath: `yt-dlp-${sourceKind}`,
        timingExactness: 'exact',
        qualityFlags: [],
        warnings: [],
      };
    } catch (error) {
      throw classifyYtDlpError(error);
    }
  }

  private async getVideoInfo(videoUrl: string): Promise<YtDlpVideoInfo> {
    const { stdout } = await execFileAsync(this.ytDlpPath, [
      '--skip-download',
      '--dump-single-json',
      videoUrl,
    ], {
      maxBuffer: 50 * 1024 * 1024,
    });
    return JSON.parse(stdout) as YtDlpVideoInfo;
  }

  /**
   * Parse VTT format to extract phrases
   */
  private parseVTT(vttContent: string): ParsedVttCue[] {
    const blocks = vttContent.replace(/\r/g, '').split(/\n\s*\n/);
    const cues: ParsedVttCue[] = [];

    for (const block of blocks) {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      const timestampIndex = lines.findIndex((line) => line.includes('-->'));
      if (timestampIndex < 0) continue;
      const timestampMatch = lines[timestampIndex].match(
        /(\d{2}):(\d{2}):(\d{2}\.\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}\.\d{3})/,
      );
      if (!timestampMatch) continue;

      const start = this.toSeconds(timestampMatch[1], timestampMatch[2], timestampMatch[3]);
      const end = this.toSeconds(timestampMatch[4], timestampMatch[5], timestampMatch[6]);
      const body = lines.slice(timestampIndex + 1).join(' ');
      const text = this.cleanText(body);
      if (text) {
        cues.push({
          start,
          end,
          text,
          wordTimings: this.parseInlineWordTimings(body, start, end),
        });
      }
    }

    return cues;
  }

  private selectTrack(
    subtitles: Record<string, YtDlpSubtitleFormat[]>,
    autoCaptions: Record<string, YtDlpSubtitleFormat[]>,
    options?: SubtitleFetchOptions,
  ): { formats: YtDlpSubtitleFormat[]; language: string; sourceKind: 'manual' | 'auto' } | null {
    const requestedLanguage = options?.language || 'en';
    const preferredLangs = Array.from(new Set([requestedLanguage, 'nl', 'en']));

    if (options?.sourceKind === 'auto') {
      const selected = this.findTrack(autoCaptions, preferredLangs, true);
      return selected ? { ...selected, sourceKind: 'auto' } : null;
    }

    if (options?.sourceKind === 'manual') {
      const selected = this.findTrack(subtitles, preferredLangs, false);
      return selected ? { ...selected, sourceKind: 'manual' } : null;
    }

    const manual = this.findTrack(subtitles, preferredLangs, false);
    if (manual) return { ...manual, sourceKind: 'manual' };
    const auto = this.findTrack(autoCaptions, preferredLangs, true);
    if (auto) return { ...auto, sourceKind: 'auto' };
    return null;
  }

  private findTrack(
    tracks: Record<string, YtDlpSubtitleFormat[]>,
    preferredLangs: string[],
    preferOriginalAuto: boolean,
  ): { formats: YtDlpSubtitleFormat[]; language: string } | null {
    const keys = Object.keys(tracks);
    for (const lang of preferredLangs) {
      const key = preferOriginalAuto
        ? keys.find((candidate) => candidate === `${lang}-orig`) ||
          keys.find((candidate) => candidate === lang) ||
          keys.find((candidate) => candidate.startsWith(`${lang}-`))
        : keys.find((candidate) => candidate === lang) ||
          keys.find((candidate) => candidate.startsWith(`${lang}-`));
      if (key && Array.isArray(tracks[key])) {
        return { formats: tracks[key], language: key.replace(/-orig$/, '') };
      }
    }
    const fallbackKey = keys[0];
    return fallbackKey && Array.isArray(tracks[fallbackKey])
      ? { formats: tracks[fallbackKey], language: fallbackKey.replace(/-orig$/, '') }
      : null;
  }

  private normalizeRollingCues(cues: ParsedVttCue[]): ParsedVttCue[] {
    const words: TimedWord[] = [];
    let previousDisplayTokens: string[] = [];
    for (const cue of cues) {
      const displayTokens = this.tokenizeDisplayText(cue.text);
      if (!displayTokens.length) continue;

      const overlap = this.suffixPrefixOverlap(previousDisplayTokens, displayTokens);
      const newDisplayTokens = displayTokens.slice(overlap);
      const timings = cue.wordTimings?.length ? cue.wordTimings : this.approximateWordTimings(cue, displayTokens);

      for (let index = overlap; index < displayTokens.length; index += 1) {
        const displayToken = displayTokens[index];
        const timing = timings[index] || timings[timings.length - 1];
        if (!timing) continue;
        const normalized = this.normalizeToken(displayToken);
        if (normalized && !this.isNonSpeechToken(displayToken)) {
          const boundedTiming = this.boundWordTiming(timing);
          words.push({
            start: boundedTiming.start,
            end: boundedTiming.end,
            text: displayToken,
          });
        }
      }
      if (newDisplayTokens.length) {
        previousDisplayTokens = displayTokens;
      }
    }

    if (!words.length) {
      return cues;
    }

    return this.dropConsecutiveDuplicatePhrases(this.makeNonOverlapping(this.buildPhrasesFromWords(words)));
  }

  private parseInlineWordTimings(body: string, cueStart: number, cueEnd: number): TimedWord[] {
    const tokens: TimedWord[] = [];
    const regex = /<(?:(\d{2}):)?(\d{2}):(\d{2}\.\d{3})>|<c>|<\/c>|([^<\s]+)/g;
    let currentTime = cueStart;
    let match;
    while ((match = regex.exec(body))) {
      if (match[2] && match[3]) {
        currentTime = match[1]
          ? this.toSeconds(match[1], match[2], match[3])
          : Number(match[2]) * 60 + Number(match[3]);
        continue;
      }
      if (match[4]) {
        tokens.push({
          start: currentTime,
          end: cueEnd,
          text: this.cleanText(match[4]),
        });
      }
    }
    for (let index = 0; index < tokens.length; index += 1) {
      tokens[index].end = tokens[index + 1]?.start || cueEnd;
    }
    return tokens.filter((token) => token.text && token.end > token.start);
  }

  private toSeconds(hours: string, minutes: string, seconds: string): number {
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
  }

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenizeDisplayText(text: string): string[] {
    return this.cleanText(text).split(/\s+/).filter(Boolean);
  }

  private suffixPrefixOverlap(previousTokens: string[], currentTokens: string[]): number {
    const max = Math.min(previousTokens.length, currentTokens.length);
    for (let size = max; size > 0; size -= 1) {
      let matches = true;
      for (let index = 0; index < size; index += 1) {
        if (
          this.normalizeToken(previousTokens[previousTokens.length - size + index]) !==
          this.normalizeToken(currentTokens[index])
        ) {
          matches = false;
          break;
        }
      }
      if (matches) return size;
    }
    return 0;
  }

  private approximateWordTimings(cue: ParsedVttCue, tokens: string[]): TimedWord[] {
    if (!tokens.length) return [];
    const duration = cue.end - cue.start;
    return tokens.map((token, index) => ({
      text: token,
      start: cue.start + (duration * index) / tokens.length,
      end: cue.start + (duration * (index + 1)) / tokens.length,
    }));
  }

  private normalizeToken(text: string): string {
    return this.cleanText(text).toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  }

  private isNonSpeechToken(text: string): boolean {
    const normalized = this.normalizeToken(text);
    return KNOWN_NON_SPEECH_TOKENS.has(normalized) ||
      /^\[[^\]]+\]$/.test(text.trim()) ||
      /^\([^)]+\)$/.test(text.trim());
  }

  private boundWordTiming(timing: TimedWord): TimedWord {
    if (!Number.isFinite(timing.start) || !Number.isFinite(timing.end) || timing.end <= timing.start) {
      return timing;
    }
    return {
      ...timing,
      end: Math.min(timing.end, timing.start + MAX_WORD_DURATION_SEC),
    };
  }

  private buildPhrasesFromWords(words: TimedWord[]): ParsedVttCue[] {
    const phrases: ParsedVttCue[] = [];
    let current: ParsedVttCue | null = null;
    for (const word of words) {
      if (!current) {
        current = { start: word.start, end: word.end, text: word.text };
        continue;
      }

      const candidateText = `${current.text} ${word.text}`.trim();
      const duration = word.end - current.start;
      const wordCount = candidateText.split(/\s+/).filter(Boolean).length;
      const pause = word.start - current.end;
      const endsSentence = /[.!?…]$/.test(current.text);
      const tooLong = duration > 6 || wordCount > 12 || candidateText.length > 90 || pause > 0.9;
      if (endsSentence || tooLong) {
        phrases.push(current);
        current = { start: word.start, end: word.end, text: word.text };
      } else {
        current.text = candidateText;
        current.end = word.end;
      }
    }
    if (current) phrases.push(current);
    return phrases
      .map((phrase) => ({ ...phrase, text: this.cleanText(phrase.text) }))
      .filter((phrase) => phrase.text && phrase.end > phrase.start);
  }

  private makeNonOverlapping(cues: ParsedVttCue[]): ParsedVttCue[] {
    const sorted = [...cues].sort((a, b) => a.start - b.start || a.end - b.end);
    const result: ParsedVttCue[] = [];
    for (const cue of sorted) {
      const previous = result[result.length - 1];
      const next = { ...cue };
      if (previous && next.start < previous.end) {
        next.start = previous.end;
      }
      if (next.end <= next.start) continue;
      result.push(next);
    }
    return result;
  }

  private dropConsecutiveDuplicatePhrases(cues: ParsedVttCue[]): ParsedVttCue[] {
    const result: ParsedVttCue[] = [];
    for (const cue of cues) {
      const previous = result[result.length - 1];
      if (previous && this.normalizePhrase(previous.text) === this.normalizePhrase(cue.text)) {
        previous.end = Math.max(previous.end, cue.end);
        continue;
      }
      result.push(cue);
    }
    return result;
  }

  private normalizePhrase(text: string): string {
    return this.tokenizeDisplayText(text).map((token) => this.normalizeToken(token)).filter(Boolean).join(' ');
  }
}
