import { useEffect } from 'react';
import { reticle, install } from '@reticlehq/react';

/**
 * Dev-only island. Vite owns this entry the same way it owns `<Counter client:load />`, so the
 * SDK is a static import — not a bare `await import('@reticlehq/react')` from a raw page script,
 * which 404s while the dep cache is cold (#1008 e2e).
 */
export default function ReticleDev() {
  useEffect(() => {
    const token =
      document.querySelector('meta[name="reticle-pairing-token"]')?.getAttribute('content') ?? '';
    const root =
      document.querySelector('meta[name="reticle-pairing-root"]')?.getAttribute('content') ?? '';
    if (0 === token.length) {
      console.warn(
        '[reticle] no pairing token was available when this page rendered, so the app will connect and be refused — you will see NO SESSION even though the SDK loads and the socket opens. The token is written by the Reticle daemon: start it (`reticle serve`, or let your agent start it) and reload this page.',
      );
    }
    install();
    reticle.connect({
      projectId: 'example-astro',
      ...(0 < token.length ? { token } : {}),
      ...(0 < root.length ? { root } : {}),
    });
  }, []);
  return null;
}
