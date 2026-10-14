const vscode = require('vscode');
const { readStatus } = require('./lib');

const COLORS = { green: '#4EC9B0', yellow: '#DCDCAA', red: '#F44747', model: '#C586C0', dim: '#808080' };
const level = (pct) => (pct >= 80 ? COLORS.red : pct >= 50 ? COLORS.yellow : COLORS.green);
const resetText = (v) => (v && v.resetsAt ? `resets ${new Date(v.resetsAt).toLocaleString()}` : '');

function activate(context) {
  const mk = (prio) => {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, prio);
    context.subscriptions.push(item);
    return item;
  };
  const ctx = mk(104), five = mk(103), week = mk(102), model = mk(101);

  const setPct = (item, label, v, tip) => {
    if (!v && v !== 0) { item.text = `${label} --`; item.color = COLORS.dim; item.tooltip = tip + ' (no data yet)'; return; }
    const pct = typeof v === 'number' ? v : v.pct;
    item.text = `${label} ${pct}%`;
    item.color = level(pct);
    item.tooltip = `${tip}: ${pct}% used ${typeof v === 'object' ? resetText(v) : ''}`.trim();
  };

  const refresh = () => {
    let s = null;
    try { s = readStatus(); } catch {}
    if (!s) {
      ctx.text = 'Codex: no sessions'; ctx.color = COLORS.dim; ctx.show();
      [five, week, model].forEach((i) => i.hide());
      return;
    }
    setPct(ctx, 'ctx', s.ctxPct, 'Context window used (start a new thread when this gets high)');
    setPct(five, '5h', s.limits && s.limits.fiveHour, '5-hour usage limit');
    setPct(week, 'wk', s.limits && s.limits.weekly, 'Weekly usage limit');
    model.text = s.model ? `${s.model}${s.effort ? ' ' + s.effort : ''}` : 'model --';
    model.color = COLORS.model;
    model.tooltip = 'Codex model (latest session)';
    [ctx, five, week, model].forEach((i) => i.show());
  };

  refresh();
  const timer = setInterval(refresh, 5000);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });
}

function deactivate() {}

module.exports = { activate, deactivate };
