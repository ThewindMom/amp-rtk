# Amp RTK Plugin

> Token-efficient shell command output for [Amp](https://ampcode.com) via [RTK](https://github.com/rtk-ai/rtk).

## Requirements

- [Amp](https://ampcode.com) installed (desktop app or CLI)
- [RTK](https://github.com/rtk-ai/rtk) binary on your `PATH` (see install below)

## What It Does

This plugin intercepts shell commands from Amp's AI agent and rewrites them to their RTK equivalents. RTK is a CLI proxy that filters and compacts command output before it reaches the LLM context — saving tokens, reducing API costs, and speeding up execution.

For example:
- `ls -la` → `rtk ls -la` (compact directory listing)
- `git status --short` → `rtk git status --short` (compact git output)
- `docker ps` → `rtk docker ps` (compact container list)

If RTK is unavailable or the command has no RTK equivalent, the original command passes through unchanged.

## Install RTK

```bash
cargo install rtk
# or download a release binary from https://github.com/rtk-ai/rtk/releases
# and place it in ~/.local/bin/
```

Verify with `rtk --version`. You should see something like `rtk 0.34.3`.

## Install the Plugin

1. Copy `amp-rtk.ts` into your project's `.amp/plugins/`:
   ```bash
   mkdir -p .amp/plugins
   cp amp-rtk.ts .amp/plugins/amp-rtk.ts
   ```

2. Reload plugins in Amp:
   - Open the **Command Palette** (`Cmd+Shift+P` / `Ctrl+Shift+P`)
   - Run `plugins: reload`

## Usage

Once installed, RTK rewriting is **automatic** and **transparent**. Every `Bash` tool call from Amp is intercepted and rewritten before execution.

### Manual Commands

Open the Command Palette and run:

- **RTK Status** — Show RTK version, path, and plugin state
- **RTK Toggle** — Enable/disable rewriting on demand

### How It Works

The plugin hooks into Amp's `tool.call` event. When a shell command is detected, it runs `rtk rewrite <command>` and replaces the command with the rewritten version. If RTK is unavailable or the rewrite fails, the original command passes through unchanged.

## Configuration

No configuration file is required. The plugin uses in-memory state:

- **Enabled by default** on every Amp session start
- **Toggle** via Command Palette (`RTK Toggle`)
- **No persistence** — state resets when Amp restarts

## Troubleshooting

### RTK not found
- Ensure `rtk` is in your `PATH`
- Check with `command -v rtk` and `rtk --version`

### Plugin not loading
- Verify the file is at `.amp/plugins/amp-rtk.ts`
- Run `plugins: reload` from the Command Palette
- Check Amp logs at `~/.cache/amp/logs/plugin-runtime.log` for errors

### Commands not being rewritten
- Check that RTK is enabled: run **RTK Status**
- Some commands may not have a valid rewrite; RTK returns the original in those cases

## License

MIT
