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
