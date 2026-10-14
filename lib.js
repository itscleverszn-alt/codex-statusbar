const fs = require('fs');
const path = require('path');
const os = require('os');

// Codex treats ~12k tokens (system prompt, tools) as always present; matches its own "% left" math.
const BASELINE_TOKENS = 12000;
const TAIL_BYTES = 2 * 1024 * 1024;

function sessionsDir() {
  const home = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  return path.join(home, 'sessions');
}

// Newest-first list of rollout files.
function rolloutFiles(dir) {
  const out = [];
  const walk = (d) => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.startsWith('rollout-') && e.name.endsWith('.jsonl')) {
        try { out.push({ p, m: fs.statSync(p).mtimeMs }); } catch {}
      }
    }
  };
  walk(dir);
  return out.sort((a, b) => b.m - a.m).map((f) => f.p);
}

function tailLines(file) {
  const size = fs.statSync(file).size;
  const start = Math.max(0, size - TAIL_BYTES);
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(size - start);
  fs.readSync(fd, buf, 0, buf.length, start);
  fs.closeSync(fd);
  const lines = buf.toString('utf8').split('\n');
  if (start > 0) lines.shift(); // first line may be cut off
  return lines;
}

// Scan one file from the end for the latest model, context usage and rate limits.
function scanFile(file) {
  const r = { model: null, effort: null, ctxPct: null, limits: null };
  const lines = tailLines(file);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i]) continue;
    let o;
    try { o = JSON.parse(lines[i]); } catch { continue; }
    const p = o.payload || {};
    if (o.type === 'turn_context' && !r.model && p.model) {
      r.model = p.model;
      r.effort = p.effort || null;
    } else if (o.type === 'event_msg' && p.type === 'token_count') {
      if (r.ctxPct === null && p.info && p.info.last_token_usage && p.info.model_context_window) {
        r.ctxPct = contextUsedPct(p.info.last_token_usage.total_tokens, p.info.model_context_window);
      }
      if (!r.limits && p.rate_limits) r.limits = pickLimits(p.rate_limits);
    }
    if (r.model && r.ctxPct !== null && r.limits) break;
  }
  return r;
}

function contextUsedPct(used, window) {
  if (window <= BASELINE_TOKENS) return 100;
  const eff = window - BASELINE_TOKENS;
  const u = Math.max(0, used - BASELINE_TOKENS);
  return Math.min(100, Math.max(0, Math.round((u / eff) * 100)));
}

// Identify 5h vs weekly by window length rather than primary/secondary order.
function pickLimits(rl) {
  const wins = [rl.primary, rl.secondary].filter((w) => w && typeof w.used_percent === 'number');
  if (!wins.length) return null;
  const out = { fiveHour: null, weekly: null };
  for (const w of wins) {
    const v = { pct: Math.round(w.used_percent), resetsAt: w.resets_at ? w.resets_at * 1000 : null };
    if (w.window_minutes && w.window_minutes > 24 * 60) out.weekly = v;
    else out.fiveHour = v;
  }
  return out;
}

// Current session = newest file. Limits fall back to the newest file that has them.
function readStatus(dir = sessionsDir()) {
  const files = rolloutFiles(dir);
  if (!files.length) return null;
  const s = scanFile(files[0]);
  for (let i = 1; !s.limits && i < Math.min(files.length, 10); i++) s.limits = scanFile(files[i]).limits;
  // A reset window that already passed means 0% used.
  if (s.limits) for (const k of ['fiveHour', 'weekly']) {
    const v = s.limits[k];
    if (v && v.resetsAt && v.resetsAt < Date.now()) v.pct = 0;
  }
  return s;
}

module.exports = { readStatus, contextUsedPct, pickLimits, sessionsDir };
