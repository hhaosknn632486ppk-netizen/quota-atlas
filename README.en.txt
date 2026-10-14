Quota Atlas 0.8.2 - Windows 10 / 11 x64 beta candidate

Install and start
Extract the entire ZIP into an ordinary local folder. Keep app, runtime and all scripts together.
Run install.cmd to verify files, install for the current user and create a Start menu shortcut.
Open Quota Atlas from the Start menu. The compact floating window appears first.
For portable use, run start.cmd in the extracted folder.
This beta is unsigned. Compare its ZIP SHA-256 with a checksum from a trusted source.
Hashes check integrity; they do not authenticate an attacker who changes both files and hashes.

Floating window
Drag its top area to move it, use the pin for always-on-top and the arrow to expand it.
Open the detailed panel for accounts, events and settings. Closing the widget hides it
in the tray. Use the tray menu to quit. Choose the primary account in Settings.
Percentages, points and currency balances retain their own units.

Accounts
Codex and WorkBuddy can read supported quota from an existing local signed-in client.
Real accounts have been verified on the development computer.
Claude local detection and isolated web sign-in are implemented; a real official
subscription account has not been verified in this release.
DeepSeek, Gemini and Grok web/subscription and API accounts are shown separately.
Their API connectors have fixture tests; real-account validation is outstanding.
Web-page extraction is experimental. Unknown quota stays unknown. Manual records
are available. See CONNECTIONS.txt and SUPPORT.txt for requirements and limitations.

Events and notifications
Cards distinguish resets, grants, vouchers, claims and plan restrictions, with known
 times and actions. Follow-up stages of the same identified event share a card.
Historical events are quiet on first launch. Uncertain eligibility stays explicit;
trusted direct announcements may trigger an optional watch notification.
An observed balance increase does not establish that a particular campaign caused it.
Choose followed providers, uncertain-event alerts and quiet hours in Settings.
Polling runs while the app is open and online. Quit, sleep and inaccessible sources
can delay discovery. Source connection states are visible in Settings.

Check Windows notifications
After installing, open Settings > Send test notification. The result distinguishes
a Windows display receipt, failure, an unconfirmed request and app-level suppression.
A display receipt does not prove you saw a banner. Windows settings and Do Not Disturb
can affect banners. The app does not change these system preferences for you.

Languages
Choose Simplified Chinese, English, Japanese, Korean or system language in Settings.
Original announcements remain in their original language.

Update and uninstall
Extract a new full release and run its update.cmd. Existing data and settings are kept
separately; old program versions remain. There is no online updater.
Run uninstall.cmd from an installed version to remove verified versions and their
matching shortcut. Uninstall preserves account data. To erase it, quit the app
and remove that data directory yourself.

Local data and privacy
Portable data is in .local beside the launcher. Installed data defaults to
LocalAppData/QuotaAtlas/data. Initial installation can migrate this app's portable
profile; updates do not overwrite an existing installed profile.
Optional saved API keys use Windows encryption. Web sign-in uses a local isolated session.
The release ZIP excludes developer accounts, credentials, sessions, logs and test data.
Start at login is off by default. See PRIVACY.txt for network and storage details.

This candidate is intended for a small beta. Wider real-account, notification-banner
and independent-machine validation remain outstanding. Report the app and Windows
versions and steps. Do not share keys, cookies, tokens or the complete data directory.
