# codex-statusbar

A VS Code status bar for OpenAI Codex, similar to Claude Code's status line. Each item has its own color:

```
ctx 49%   5h 42%   wk 12%   gpt-5.5-codex high
```

| Item | Meaning | Color |
|---|---|---|
| `ctx` | How full the current thread's context window is (same math as Codex's own "% left") | green under 50%, yellow 50–79%, red at 80% and up |
| `5h` | 5-hour usage limit used | same |
| `wk` | Weekly usage limit used | same |
| model | Model and reasoning effort of the latest session | purple |

Hover any item for details and reset times. When `ctx` turns red, start a new thread.

It reads Codex's local session logs (`~/.codex/sessions/`, or `$CODEX_HOME/sessions/`) every 5 seconds. Nothing leaves your machine, and it has no dependencies.

## Install (paste this repo link into Codex)

Paste this into Codex:

> Install the VS Code extension from https://github.com/itscleverszn-alt/codex-statusbar. Follow the "Instructions for Codex" section in its README exactly.

## Instructions for Codex

1. **Download the packaged extension** to a temp folder:
   `curl -fsSL https://raw.githubusercontent.com/itscleverszn-alt/codex-statusbar/main/codex-statusbar.vsix -o /tmp/codex-statusbar.vsix`
   (Windows PowerShell: `Invoke-WebRequest <same URL> -OutFile $env:TEMP\codex-statusbar.vsix`)
2. **Find the editor CLI** for the editor the user is in. It's `code` for VS Code, `cursor` for Cursor, and `windsurf` for Windsurf. If `code` isn't on PATH on macOS, use `"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"`.
3. **Install it:** `<cli> --install-extension /tmp/codex-statusbar.vsix --force`
4. **Verify:** `<cli> --list-extensions | grep -i codex-statusbar` should print `itscleverszn.codex-statusbar`.
5. **Don't change anything else.** Leave settings, other extensions and Codex config alone.
6. **Tell the user** to run **Developer: Reload Window** from the Command Palette (Cmd/Ctrl+Shift+P). The four items appear at the bottom right. They show `--` until the first Codex message in a session.

If the install command is blocked by the sandbox, ask the user to approve it, or give them the command to run in a terminal.

## Notes

- The usage limits come from Codex's own logs. Some extension versions log them as unavailable ([openai/codex#47615](https://github.com/openai/codex/issues/47615)). If so, `5h`/`wk` fall back to the most recent session that has them, or show `--`.
- **Codex CLI (terminal) users:** the CLI has a built-in footer instead. Run `/statusline`, or set `tui.status_line` in `~/.codex/config.toml`.

## Uninstall

`code --uninstall-extension itscleverszn.codex-statusbar`, or remove it from the Extensions panel.

## Develop

`node test.js` runs the parser tests. `npx @vscode/vsce package --no-dependencies -o codex-statusbar.vsix` rebuilds the package.
