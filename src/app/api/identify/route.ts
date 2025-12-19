import { NextResponse } from 'next/server';
import { identifyWithINat } from '@/lib/inat';
import { checkRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(req: Request) {
  const ip = getClientIp(req) ?? 'unknown';
  const rate = checkRateLimit(ip);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan, coba lagi beberapa saat.' },
      {
        status: 429,
        headers: rate.retryAfterSeconds ? { 'Retry-After': rate.retryAfterSeconds.toString() } : undefined
      }
    );
  }

  let formData: FormData;

  try {
    formData = await req.formData();
  } catch (error) {
    console.error('Gagal membaca form data', error);
    return NextResponse.json({ error: 'Format permintaan tidak valid.' }, { status: 400 });
  }

  const file = formData.get('image');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'File gambar wajib diunggah.' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Tipe file harus JPEG, PNG, atau WEBP.' }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Ukuran file maksimal 8MB.' }, { status: 400 });
  }

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    const turnstileToken = formData.get('turnstileToken');
    const verified = await verifyTurnstile(turnstileToken, turnstileSecret, ip);

    if (!verified) {
      return NextResponse.json({ error: 'Verifikasi CAPTCHA gagal. Silakan coba lagi.' }, { status: 400 });
    }
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await identifyWithINat({
      buffer,
      filename: file.name || 'upload',
      contentType: file.type
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Identifikasi gagal', error);
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function getClientIp(req: Request): string | null {
  const header = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip');
  if (!header) return null;
  return header.split(',')[0]?.trim() || null;
}

async function verifyTurnstile(token: FormDataEntryValue | null, secret: string, ip: string) {
  if (!token || typeof token !== 'string') return false;

  const payload = new FormData();
  payload.append('secret', secret);
  payload.append('response', token);
  if (ip) {
    payload.append('remoteip', ip);
  }

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: payload
    });

    if (!res.ok) return false;

    const body = await res.json();
    return Boolean(body.success);
  } catch (error) {
    console.error('Turnstile verification failed', error);
    return false;
  }
}
