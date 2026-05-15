import { type NextRequest, NextResponse } from 'next/server';

const BACKEND = 'http://localhost:3031';

async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const search = req.nextUrl.search ?? '';
  const target = `${BACKEND}/${path.join('/')}${search}`;

  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (!['host', 'content-length'].includes(k.toLowerCase())) {
      headers.set(k, v);
    }
  });

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const body = hasBody ? await req.text() : undefined;
  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body,
  });

  const resHeaders = new Headers();
  upstream.headers.forEach((v, k) => {
    if (k.toLowerCase() === 'transfer-encoding') return;
    if (k.toLowerCase() === 'set-cookie') {
      // Strip Domain and Secure so cookies land on localhost in local dev
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
