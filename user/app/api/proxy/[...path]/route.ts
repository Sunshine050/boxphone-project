import { type NextRequest, NextResponse } from 'next/server';
import {
  getBackendProxyUrl,
  isLocalBackendUrl,
} from '@boxphon/shared/server/backend-proxy-url';

const BACKEND = getBackendProxyUrl();
const LOCAL_BACKEND = isLocalBackendUrl(BACKEND);

async function proxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const search = req.nextUrl.search ?? '';
  const target = `${BACKEND}/${path.join('/')}${search}`;
  const isScreenshot = path.some((segment) => segment === 'screenshot');

  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (!['host', 'content-length'].includes(k.toLowerCase())) {
      headers.set(k, v);
    }
  });

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const body = hasBody ? await req.text() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(isScreenshot ? 60_000 : 30_000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream unreachable';
    console.error('[api/proxy] upstream fetch failed:', target, message);
    return NextResponse.json(
      {
        error: 'Bad gateway',
        message:
          'Could not reach the API backend. Set BACKEND_PROXY_URL (e.g. http://127.0.0.1:3031 on the server).',
        detail: message,
      },
      { status: 502 },
    );
  }

  const resHeaders = new Headers();
  upstream.headers.forEach((v, k) => {
    if (k.toLowerCase() === 'transfer-encoding') return;
    if (k.toLowerCase() === 'set-cookie' && LOCAL_BACKEND) {
      const sanitized = v
        .replace(/;\s*Domain=[^;]*/gi, '')
        .replace(/;\s*Secure\b/gi, '');
      resHeaders.append(k, sanitized);
    } else {
      resHeaders.set(k, v);
    }
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
