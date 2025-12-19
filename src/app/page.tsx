import { HomeClient } from './home-client';

export default function Page() {
  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || null;
  return <HomeClient turnstileSiteKey={turnstileSiteKey} />;
}
