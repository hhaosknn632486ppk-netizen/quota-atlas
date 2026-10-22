# Changelog

## 0.8.3 — activity-source reliability beta

- Separate upstream snapshot checks from the last announcement date, avoiding false stale warnings when a healthy source has no new announcements.
- Verify news articles individually so one unavailable article does not block alerts from other verified articles; retain stale cache and retry-after limits for failed articles.
- Bound each article request independently so slow requests do not consume the time available to every later article.
- Read publication timestamps from article time elements and either metadata attribute order.
- Support xAI's marked article sections without treating navigation, arbitrary page sections or footer promotions as article content.
- Keep separators around discarded HTML blocks so text fragments cannot reassemble into tags or misleading activity keywords.
- Show upstream check times, verified article counts and explicit access-denied reasons in all four languages.
- Keep genuinely stale or undated feeds out of alerts and back off repeated unsuccessful checks.
- Add official xAI API and consumer usage documentation as change monitors. These do not replace news coverage or imply a new quota grant.

## 0.8.2 — public beta preparation

- Add an independent source layout, MIT license and third-party notices.
- Pin development dependencies and the official Electron runtime checksum.
- Provide portable setup, demo, checks, desktop tests and release/source builds.
- Add bounded source privacy checks, package verification and GitHub workflows.
- Show tested versus experimental connection labels in all four UI languages.
- Document verification scope, privacy, contribution and private security reporting.
- Generate public screenshots exclusively from synthetic demo data.

## 0.8.1 — local release validation

- Add explicit notification tests and native display/failure receipts.
- Verify Windows PowerShell installation, version upgrades and data-preserving removal.
- Build a clean application ZIP without developer accounts or browser sessions.

An entry records development work; it does not mean a public release already exists.
