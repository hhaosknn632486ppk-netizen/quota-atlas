# Contributing

Start with `npm ci`, `npm run setup`, and `npm run demo`. Use synthetic profiles
and fixtures for development. Never commit personal state or real API responses.

Before a pull request, run `npm run check`, `npm test`, and on Windows
`npm run test:desktop`. Installer changes also require `npm run test:installer`;
packaging changes require build and package verification.

Explain the user-visible behavior and relevant checks. New provider adapters need
clear channel/plan boundaries, unknown/error handling, fixed credential destinations,
and an honest verification label. Do not treat a request limit as a known subscription
balance. Do not infer campaign causation from a numeric increase.

Use focused changes and preserve all four language entries. Add meaningful tests
for changed behavior or security boundaries. Keep runtime/UI dependencies minimal.
Run demo screenshots through `npm run screenshots`; never substitute an actual
account screenshot in public documentation.

Contributions are made under the project's MIT license. Third-party code or assets
must retain their applicable license and provenance. Be respectful and describe
reproducible facts. Security reports follow SECURITY.md, not ordinary public issues.
