'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type IdentifyResponse = { localName: string; latinName: string };

type Props = {
  turnstileSiteKey: string | null;
};

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

export function HomeClient({ turnstileSiteKey }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdentifyResponse | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const widgetContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  const turnstileEnabled = useMemo(() => Boolean(turnstileSiteKey), [turnstileSiteKey]);

  useEffect(() => {
    if (!turnstileEnabled) return;

    const renderWidget = () => {
      if (!widgetContainerRef.current || widgetIdRef.current || !window.turnstile) return;

      widgetIdRef.current = window.turnstile.render(widgetContainerRef.current, {
        sitekey: turnstileSiteKey!,
        callback: (token: string) => setTurnstileToken(token),
        'error-callback': () => setTurnstileToken(null),
        'expired-callback': () => setTurnstileToken(null)
      });
    };

    const existingScript = document.getElementById('turnstile-script') as HTMLScriptElement | null;

    if (existingScript) {
      if (window.turnstile) {
        renderWidget();
      } else {
        existingScript.addEventListener('load', renderWidget, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'turnstile-script';
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [turnstileEnabled, turnstileSiteKey]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    setResult(null);
    setError(null);
    if (selected) {
      setFile(selected);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError('Silakan pilih foto jamur terlebih dahulu.');
      return;
    }

    if (turnstileEnabled && !turnstileToken) {
      setError('Verifikasi CAPTCHA belum selesai.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
    if (turnstileToken) {
      formData.append('turnstileToken', turnstileToken);
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/identify', { method: 'POST', body: formData });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || 'Identifikasi gagal.');
      }

      setResult(body as IdentifyResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Identifikasi gagal.';
      setError(message);
    } finally {
      setLoading(false);
      if (turnstileEnabled && widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h1>Identifikasi Jamur</h1>
        <p className="lead">Unggah foto jamur untuk mengetahui nama latin dan nama lokal.</p>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="file">Foto jamur</label>
            <input
              id="file"
              className="input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
            />
            {previewUrl ? (
              <div className="preview">
                <img src={previewUrl} alt="Pratinjau jamur" />
              </div>
            ) : null}
          </div>

          {turnstileEnabled ? (
            <div>
              <label>Verifikasi</label>
              <div ref={widgetContainerRef} />
            </div>
          ) : null}

          <button type="submit" className="button" disabled={!file || loading}>
            {loading ? 'Memproses...' : 'Identifikasi'}
          </button>
        </form>

        {error ? <div className="status error">{error}</div> : null}

        {result ? (
          <div className="status result">
            <div>
              <strong>Nama lokal:</strong> {result.localName || 'Nama lokal belum tersedia'}
            </div>
            <div>
              <strong>Nama latin:</strong> {result.latinName}
            </div>
          </div>
        ) : null}

        <p className="muted">
          Hasil identifikasi bersifat perkiraan dan bukan panduan konsumsi.
        </p>
      </div>
    </div>
  );
}
