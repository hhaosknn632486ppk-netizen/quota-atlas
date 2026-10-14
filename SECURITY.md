# Security reporting / 安全反馈

This is an early beta. Only the latest published beta will be considered for fixes;
there is no promised response time or independent security certification.

**Do not put keys, tokens, cookies, authenticated responses, account identities,
or a complete application profile in a public issue.**

Use the repository's **Security → Advisories → Report a vulnerability** private
reporting entry when available. Describe the affected version, boundary crossed,
minimal synthetic reproduction and expected impact. Avoid real credentials.

If that entry is unavailable, open an issue titled **Request private security contact**
with no exploit details or sensitive attachments. Wait for a private channel before
sending details. No public email address or monitored response channel is implied.

维护者需要在公开仓库设置中启用 Private vulnerability reporting。
在此之前，公开 Issue 仅用于请求私下联系方式，不应包含漏洞细节或个人数据。
如果凭据已经泄漏，应在相关服务商处撤销或轮换；仅删除帖子不能撤销凭据。

## Maintainer handling

Confirm reports privately, reproduce using synthetic accounts/data, minimize access
to attachments, agree on disclosure, and publish a fix and release note when ready.
Enable dependency alerts, secret scanning/push protection and branch protection as
available. These server-side settings must be checked after the repository exists.

## Local storage

Saved API credentials use Electron safeStorage / Windows DPAPI with no plaintext
fallback. Browser sessions, snapshots and metadata remain sensitive local data.
Uninstall preserves the profile. DPAPI does not protect against all processes running
as the same Windows user. See PRIVACY.txt and docs/DEVELOPMENT.md.

## Local executable and installer inputs

Codex discovery accepts a real `codex.exe` only under supported OpenAI/Codex
client or official npm installation roots, checks canonical containment and rejects
executable symlinks, directory junctions and network paths. An environment override
selects within those roots; it cannot select an arbitrary program. Child process
arguments are fixed and no command shell is used. The installed client itself is
trusted; this check is not publisher-signature verification or a same-user sandbox.

The shortcut helper can only reconstruct an `.lnk` name under the current user's
Start Menu Programs directory. It has its own temporary profile and does not use a
caller-selected account-data directory. Other shortcut directories are unsupported.
