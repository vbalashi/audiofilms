import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getAsrRuntimeConfig } from '@/lib/asr/asrConfig';
import { DEFAULT_2000NL_API_BASE, DEFAULT_DICTIONARY_PROVIDER } from '@/lib/providers/dictionary';
import { DEFAULT_SUBTITLE_PROVIDER, DEFAULT_YT_DLP_PATH } from '@/lib/providers';
import { jsonResponse, optionsResponse } from '@/lib/http/apiResponse';

export async function OPTIONS(request: Request) {
  return optionsResponse(request, { methods: ['GET', 'OPTIONS'] });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeChecks = searchParams.get('checks') === '1' || searchParams.get('checks') === 'true';
  const subtitle = subtitleReadiness(includeChecks);
  const dictionary = dictionaryReadiness();
  const asr = asrReadiness();
  const degraded = [subtitle.ready, dictionary.ready].some((ready) => !ready);

  return jsonResponse(request, {
    service: 'audiofilms-api',
    status: degraded ? 'degraded' : 'ok',
    version: buildVersion(),
    builtAt: process.env.AUDIOFILMS_BUILD_AT || '',
    commit: process.env.AUDIOFILMS_COMMIT_SHA || '',
    time: new Date().toISOString(),
    providers: {
      subtitle,
      dictionary,
    },
    asr,
  });
}

function buildVersion(): string {
  if (process.env.AUDIOFILMS_BUILD_VERSION) {
    return process.env.AUDIOFILMS_BUILD_VERSION;
  }

  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
    ) as { version?: string };
    return packageJson.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

function resolveYtDlpPath(): string {
  return process.env.YT_DLP_PATH?.trim() || DEFAULT_YT_DLP_PATH;
}

function commandExists(command: string): boolean {
  try {
    execFileSync(command, ['--version'], {
      stdio: 'ignore',
      timeout: 3000,
    });
    return true;
  } catch {
    return false;
  }
}

function subtitleReadiness(includeChecks: boolean) {
  const provider = process.env.SUBTITLE_PROVIDER || DEFAULT_SUBTITLE_PROVIDER;
  const ytDlpPath = resolveYtDlpPath();
  const ytDlpExists = fs.existsSync(ytDlpPath);
  const supadataConfigured = Boolean(process.env.SUPADATA_API_KEY?.trim());
  const providerConfigured = provider === 'supadata' ? supadataConfigured : ytDlpExists;

  return {
    ready: providerConfigured,
    provider,
    ytDlpPath,
    ytDlpExists,
    supadataConfigured,
    checks: includeChecks
      ? {
          ytDlpRunnable: ytDlpExists ? commandExists(ytDlpPath) : false,
        }
      : undefined,
  };
}

function dictionaryReadiness() {
  const provider = process.env.DICTIONARY_PROVIDER || DEFAULT_DICTIONARY_PROVIDER;
  const openRouterConfigured = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const openAiConfigured = Boolean(
    process.env.OPENAI_API_KEY?.trim() || process.env.AZURE_OPENAI_API_KEY?.trim(),
  );
  const twoThousandNlEnvTokenConfigured = Boolean(process.env.DICTIONARY_2000NL_ACCESS_TOKEN?.trim());
  const ready = provider === 'free-dictionary' ||
    (provider === 'openrouter' && openRouterConfigured) ||
    (provider === 'openai' && openAiConfigured) ||
    provider === '2000nl';

  return {
    ready,
    provider,
    openRouterConfigured,
    openAiConfigured,
    twoThousandNlApiBase: process.env.DICTIONARY_2000NL_API_BASE || DEFAULT_2000NL_API_BASE,
    twoThousandNlEnvTokenConfigured,
    twoThousandNlAcceptsForwardedBearer: provider === '2000nl',
  };
}

function asrReadiness() {
  const config = getAsrRuntimeConfig();
  return {
    ready: config.mode !== 'disabled',
    mode: config.mode,
    queueUrl: config.queueUrl,
    queueDir: config.queueDir,
    artifactStore: config.artifactStore,
    maxDurationSec: config.maxDurationSec,
    maxActiveJobs: config.maxActiveJobs,
    authRequired: config.authRequired,
    authConfigured: config.authConfigured,
  };
}
