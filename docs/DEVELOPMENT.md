# Development

The app is Windows x64. Node.js 24 LTS runs tooling; the pinned Electron binary runs
the UI. `npm ci` installs exactly the development dependencies in `package-lock.json`.
There are no npm production dependencies in the shipped application.

## Layout

- `app/main.cjs`: Electron main process and constrained IPC.
- `app/preload.cjs`: isolated UI bridge; renderer has no Node access.
- `app/lib/`: quota adapters, conservative activity parsing, persistence and alerts.
- `app/ui/`: local HTML/CSS/JS, four languages, floating widget and demo data UI.
- `app/test/`: parser, state, credential, source and reminder unit tests.
- `scripts/`: setup, bounded publication checks, desktop and installer tests, packaging.
- `config/runtime.json`: pinned runtime URL and official SHA-256.
- `.cache/`: runtime archives, synthetic test profiles and temporary build files.
- `.local/`: actual source-run user data; always private.
- `dist/`: generated Windows and source ZIPs, checksums and build report.

## Commands

See the README command list. `npm run screenshots` runs isolated Electron checks and
refreshes `docs/images/` from built-in synthetic demo data. It never reads a real quota
or sends an OS notification. These checks do not prove actual provider authorization.

`npm run setup` needs official GitHub release access. For an offline archive already
obtained from a trusted source, set `QUOTA_ATLAS_RUNTIME_ARCHIVE` to that file for the
setup/build process. It must match the pinned official hash. The override is a local
archive path, never an alternate download URL. Do not disable hash checks.

Changing runtime requires verifying upstream checksums and updating the pinned config.
Do not ship `node_modules`; builds extract the verified original runtime ZIP afresh.
`npm run build` copies only an explicit application/document allowlist. Source builds
exclude dependencies, runtime, profiles, Git metadata and generated outputs.

The privacy gate checks paths, common credential patterns and JavaScript syntax. It
does not detect every secret or vulnerability. Review the actual Git staged file list
and source archive before publishing. Never add `.local` with `git add --force`.

## Trust boundaries

Public source fetches do not receive personal quota or API credentials. Provider
credentials are limited to the corresponding adapter. Local login and browser-session
access are deliberate connection features, not permissions for general file reading.
Treat announcement content as untrusted; render text safely and restrict opened URLs.
Session persistence and DPAPI reduce exposure but are not a same-user sandbox.

## CI scope

CI runs syntax/privacy/unit checks on Ubuntu and Windows, plus isolated Electron and
installer checks on Windows. The manual packaging workflow only builds artifacts;
it does not publish a GitHub Release or modify startup/notification settings.
No workflow has provider credentials. Jobs use read-only repository permissions.
Hosted workflows still require their first real GitHub run after the repository exists.

The publication gate also scans Git index contents, including staged content that differs
from the working copy. Force-tracked private profiles are rejected despite ignore rules.
