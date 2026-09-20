### Fixed

- **`@reticlehq/init` — Astro 7.2+ gets the pairing token through frontmatter, not `vite.define`.** On current Astro, `vite.define` does not reach the client pipeline, so `__RETICLE_TOKEN__` stayed literal, `connect()` omitted `token`, and the bridge refused with "no pairing token on the page". `init` now reads the file in frontmatter and puts it on a `<meta name="reticle-pairing-token">` the processed module queries. The example moves off the 7.0.3 pin. [#1008](https://github.com/reticlehq/reticle/issues/1008).
