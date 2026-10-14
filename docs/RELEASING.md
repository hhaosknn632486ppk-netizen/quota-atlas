# Release checklist

## Before public visibility

- Review the source file list and run `npm run check` and `npm test`.
- Confirm MIT authorization and retain runtime/dependency license notices.
- Use synthetic screenshots, no local profiles or live account screenshots.
- Reproduce setup, desktop checks and build from a clean source copy.
- Review dependency audit results and unresolved verification gaps.

## Once the GitHub repository exists

- Confirm the intended owner/name and visibility before uploading.
- Enable **Private vulnerability reporting**; verify the Security reporting entry.
- Enable secret scanning/push protection and dependency alerts as available.
- Enable Actions and review the first actual CI run; add branch protection/rulesets
  appropriate to the account. Do not claim these server settings were done locally.
- Use Issues templates. Do not invite users to upload whole profiles or raw responses.

## Build a beta

1. Update root/app versions, title and changelog; run all relevant checks.
2. Run `npm run build`, `npm run verify:package`, `npm run test:package`, and `npm run release:source`.
3. Review `dist` ZIPs, checksums, included notices and build report.
4. Run the actual Windows package on an independent machine/user when available.
5. Manually create a **Pre-release** for the reviewed version. Upload the Windows ZIP,
   source ZIP and `.sha256` files to Releases, not to Git history.
6. Include unsigned status, supported Windows architecture, verification matrix,
   failed source coverage and notification limitations in the release notes.

The manual GitHub packaging workflow produces downloadable workflow artifacts only.
No automatic publication, provider credentials, signing certificate or update server
is configured. Code signing and secure update delivery remain future work.

## Real-world validation still needed

Controlled native notification tests reported display and presence in Windows history;
a human-visible banner/click and a live announcement-to-personal-alert chain remain
unverified. Observe these during beta without manufacturing a real provider activity.
Also validate real API accounts, source access, overnight sleep and network recovery.
Record original publish time, discovery time, eligibility interpretation, request time
and OS receipt separately; never infer human reading from an OS receipt.
