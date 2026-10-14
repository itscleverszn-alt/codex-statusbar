// Run: node test.js  (builds a fake ~/.codex/sessions tree and checks the parser)
const fs = require('fs'), path = require('path'), os = require('os'), assert = require('assert');
const { readStatus, contextUsedPct } = require('./lib');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-sb-'));
const day = path.join(dir, '2026', '10', '14'); fs.mkdirSync(day, { recursive: true });
const future = Math.floor(Date.now() / 1000) + 3600, past = Math.floor(Date.now() / 1000) - 60;
const line = (o) => JSON.stringify({ timestamp: new Date().toISOString(), ...o });
const old = path.join(day, 'rollout-old.jsonl');
fs.writeFileSync(old, [
  line({ type: 'event_msg', payload: { type: 'token_count', info: null,
    rate_limits: { primary: { used_percent: 41.6, window_minutes: 300, resets_at: future },
                   secondary: { used_percent: 12.2, window_minutes: 10080, resets_at: past } } } }),
].join('\n'));
const cur = path.join(day, 'rollout-new.jsonl');
fs.writeFileSync(cur, [
  line({ type: 'session_meta', payload: { id: 'x' } }),
  line({ type: 'turn_context', payload: { model: 'gpt-5.5-codex', effort: 'high', cwd: '/tmp' } }),
  line({ type: 'event_msg', payload: { type: 'token_count', info: {
    total_token_usage: { total_tokens: 999999 }, last_token_usage: { total_tokens: 140000 }, model_context_window: 272000 },
    rate_limits: null } }),
].join('\n'));
fs.utimesSync(old, new Date(Date.now() - 10000), new Date(Date.now() - 10000));
const s = readStatus(dir);
assert.strictEqual(s.model, 'gpt-5.5-codex');
assert.strictEqual(s.effort, 'high');
assert.strictEqual(s.ctxPct, contextUsedPct(140000, 272000));
assert.strictEqual(s.ctxPct, 49);  // Codex would show "51% left"
assert.strictEqual(s.limits.fiveHour.pct, 42);   // fallback to older file
assert.strictEqual(s.limits.weekly.pct, 0);      // window already reset
assert.strictEqual(readStatus(path.join(dir, 'nope')), null);
console.log('ok', JSON.stringify(s));
