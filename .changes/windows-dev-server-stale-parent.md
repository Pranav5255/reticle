### Fixed

- **`@reticlehq/server`: on Windows, `reticle init` could watch a port that was not your dev server's.** Windows keeps a dead parent's pid on its children and reuses pids, so when the dev server's shell drew a recycled pid, the process-tree walk adopted an unrelated, older service and took its port, such as sshd's 22. `init` then printed "watching http://localhost:22" and waited out its window for a page that was never coming. The walk now reads each process's creation time and ignores a "child" older than the parent it names.
