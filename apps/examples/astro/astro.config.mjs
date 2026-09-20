import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { reticle } from '@reticlehq/vite-plugin';

// The plugin is wired with `inject: false`. Astro SSRs its own HTML, so the connect-injection
// never fires; the STAMPING half is what puts data-reticle-source on the JSX.
//
// The pairing token is NOT inlined here. On Astro 7.2+ `vite.define` does not reach the client
// pipeline (#1008). The page reads the file in frontmatter and puts it on a <meta> the
// processed client script can query.
//
// `vite.build.target` is bumped to es2022 so Astro doesn't try to down-level the modern
// @reticlehq/react bundle to its conservative default browser target.
export default defineConfig({
  integrations: [react()],
  server: { port: 5304 },
  vite: {
    /* reticle-vite-owning */
    build: { target: 'es2022' },
    optimizeDeps: { include: ['@reticlehq/react'], esbuildOptions: { target: 'es2022' } },
    plugins: [reticle({ inject: false })],
    server: { watch: { ignored: [/(^|[\\/])\.reticle([\\/]|$)/] } },
  },
});
