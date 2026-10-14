'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const key = value => process.platform === 'win32' ? value.toLowerCase() : value;

function codexRoots() {
  const home = os.homedir();
  const drive = path.parse(home).root;
  const roots = [
    path.join(home, 'AppData', 'Local', 'OpenAI', 'Codex', 'bin'),
    path.join(home, 'AppData', 'Roaming', 'npm', 'node_modules', '@openai'),
    path.join(home, 'AppData', 'Local', 'Programs', 'Codex'),
    path.join(drive, 'Program Files', 'nodejs', 'node_modules', '@openai'),
  ];
  const store = path.join(drive, 'Program Files', 'WindowsApps');
  try {
    for (const entry of fs.readdirSync(store, { withFileTypes: true })) {
      if (entry.isDirectory() && /^OpenAI\.Codex_[a-zA-Z0-9_.-]+$/.test(entry.name)) {
        roots.push(path.join(store, entry.name));
      }
    }
  } catch {}
  return roots;
}

function resolveCodexCandidate(input, roots = codexRoots()) {
  if (typeof input !== 'string' || !path.isAbsolute(input) || input.includes('\0') ||
      input.startsWith('\\\\') || input.startsWith('//') ||
      path.basename(input).toLowerCase() !== 'codex.exe') return null;
  const candidate = path.resolve(input);
  for (const root of roots) {
    const base = path.resolve(root);
    if (!key(candidate).startsWith(key(base) + path.sep)) continue;
    try {
      const realBase = fs.realpathSync(base);
      const real = fs.realpathSync(candidate);
      if (!key(real).startsWith(key(realBase) + path.sep) ||
          path.basename(real).toLowerCase() !== 'codex.exe' || !fs.statSync(real).isFile()) continue;
      // Refuse directory junctions and executable symlinks, including the configured root.
      let current = candidate;
      while (key(current) !== key(path.dirname(base))) {
        if (fs.lstatSync(current).isSymbolicLink()) return null;
        const parent = path.dirname(current);
        if (parent === current) return null;
        current = parent;
      }
      return real;
    } catch {}
  }
  return null;
}

function resolveShortcutPath(requested, programs) {
  if (typeof requested !== 'string' || !path.isAbsolute(requested)) return null;
  const name = path.basename(requested);
  if (!/^[a-zA-Z0-9 ._-]+\.lnk$/.test(name)) return null;
  const target = path.join(path.resolve(programs), name);
  return key(path.resolve(requested)) === key(target) ? target : null;
}

function discoverCodexCandidates(roots = codexRoots()) {
  const found = new Set();
  let visited = 0;
  for (const root of roots) {
    function walk(dir, depth) {
      if (depth > 7 || visited > 4096) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        if (++visited > 4096) return;
        // Filesystem discovery supplies candidates. Environment/PATH values only select them.
        const name = path.basename(entry.name);
        if (name !== entry.name || name === '.' || name === '..' || entry.isSymbolicLink()) continue;
        const candidate = path.join(dir, name);
        if (entry.isFile() && name.toLowerCase() === 'codex.exe') {
          const accepted = resolveCodexCandidate(candidate, [root]);
          if (accepted) found.add(accepted);
        } else if (entry.isDirectory()) walk(candidate, depth + 1);
      }
    }
    walk(root, 0);
  }
  return [...found].sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function selectCodexCandidate(preferred, candidates) {
  if (typeof preferred !== 'string' || !path.isAbsolute(preferred)) return null;
  const selected = candidates.find(candidate => key(candidate) === key(path.resolve(preferred)));
  return selected || null;
}

module.exports = { codexRoots, resolveCodexCandidate, resolveShortcutPath, discoverCodexCandidates, selectCodexCandidate };
