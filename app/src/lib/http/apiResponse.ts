import { NextResponse } from 'next/server';

type CorsOptions = {
  methods?: string[];
  headers?: string[];
};

const DEFAULT_ALLOWED_ORIGINS = [
  'chrome-extension://hhdkchoccmikoefhenobdjipgdppdpoc',
  'https://www.youtube.com',
  'https://youtube.com',
];

const DEFAULT_ALLOWED_HEADERS = [
  'accept',
  'authorization',
  'content-type',
  'x-audiofilms-tester-token',
];

function splitEnvList(value: string | undefined): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function allowedOrigins(): string[] {
  const configured = [
    ...splitEnvList(process.env.ALLOWED_ORIGINS),
    ...splitEnvList(process.env.ALLOWED_EXTENSION_ORIGINS),
    ...splitEnvList(process.env.ALLOWED_WEB_ORIGINS),
  ];

  const devOrigins = process.env.NODE_ENV !== 'production'
    ? ['http://localhost:3000', 'http://127.0.0.1:3000']
    : [];

  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...devOrigins, ...configured]));
}

function isOriginAllowed(origin: string): boolean {
  const allowed = allowedOrigins();
  return allowed.includes('*') || allowed.includes(origin);
}

export function corsHeaders(request: Request, options: CorsOptions = {}): HeadersInit {
  const origin = request.headers.get('origin') || '';
  const requestHeaders = request.headers.get('access-control-request-headers') || '';
  const allowHeaders = requestHeaders || (options.headers || DEFAULT_ALLOWED_HEADERS).join(', ');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': (options.methods || ['GET', 'POST', 'OPTIONS']).join(', '),
    'Access-Control-Allow-Headers': allowHeaders,
    'Access-Control-Max-Age': '86400',
  };

  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }

  return headers;
}

export function jsonResponse(
  request: Request,
  body: unknown,
  init: ResponseInit = {},
  corsOptions: CorsOptions = {},
) {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(corsHeaders(request, corsOptions))) {
    headers.set(key, value);
  }
  headers.set('Cache-Control', headers.get('Cache-Control') || 'no-store');

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

export function optionsResponse(request: Request, corsOptions: CorsOptions = {}) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request, corsOptions),
  });
}
