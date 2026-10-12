### Fixed

- **`@reticlehq/server`: on Windows, `reticle init` could hang with no output while it waited for your dev server.** It reads the process list and the listening ports on every poll, and those commands had no time limit, so one stalled WMI query stopped `init` until something killed it. Each one now gives up after 15 seconds and the next poll tries again.
