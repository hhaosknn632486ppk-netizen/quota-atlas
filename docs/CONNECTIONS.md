# Connection status and setup

The README table is the public verification matrix. A successful parser/fixture test
is not real-account validation. Connector labels describe development evidence,
not whether the current user is signed in or eligible for a promotion.

## Local accounts

Codex uses the installed client's read-only quota method. It needs a valid existing
login; the tool does not need a key pasted into the chat. WorkBuddy uses its local
authenticated client connection with a fixed read-only resource-summary request.
It needs a running compatible client. Neither returns every package's expiry.

Claude local and isolated web connectors are experimental. Custom third-party Claude
services are not official subscription accounts. Expired login should be renewed in
the official client. Do not paste OAuth tokens or cookies into issues.

## API versus web/subscription

DeepSeek uses its API balance endpoint; currency balances remain distinct from web
quota. Gemini needs the appropriate Google Cloud project and authorized quota/monitoring
access; an inference API key alone is not a complete project-usage credential. xAI
billing needs the relevant management access and team, separate from web subscription.
All three real-account API authorizations remain unverified in this beta.

Web-page observation is experimental and only accepts explicitly labelled usage values.
Unknown fields, incomplete daily usage and rate-limit caps must not become an invented
remaining balance. Provider UI and internal endpoints can change.

Detailed in-app instructions are in [CONNECTIONS.txt](../CONNECTIONS.txt), with current
provider documentation links. Verify current permissions in the provider's own console.

## Public announcements

Fixed official sources, rules pages and community feeds are polled while running.
Some direct sources may be inaccessible in a given network. Optional public X access
requires the user's own API permissions; it may incur charges and is off by default.

Account changes and announcements are distinct observations. A grant for researchers,
selected accounts or a claim-required voucher is not an automatic universal reset.
No source access or private/internal knowledge beyond public information is implied.
