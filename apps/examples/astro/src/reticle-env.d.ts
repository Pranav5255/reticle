// The pairing token travels in <meta name="reticle-pairing-*">, not vite.define
// (that channel does not reach Astro's client pipeline on 7.2+) and not window
// globals (is:inline + define:vars can skip the injection).
interface Window {
  __RETICLE_TOKEN__?: string;
  __RETICLE_ROOT__?: string;
}
