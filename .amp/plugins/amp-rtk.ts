import type { PluginAPI } from "@ampcode/plugin";

// How long to wait for rtk rewrite before giving up and passing the original
// command through unchanged.
const REWRITE_TIMEOUT_MS = 5000;

// In-memory toggle: enabled by default, resets when Amp restarts.
let sessionEnabled = true;

// Warn once per outage so the user isn't spammed if rtk is missing.
let unavailableNotified = false;

export default function (amp: PluginAPI) {
  amp.logger.log("[amp-rtk] plugin loaded");

  // Intercept every Bash tool call and rewrite the command through RTK.
  amp.on("tool.call", async (event, ctx) => {
    if (!sessionEnabled) return;

    // Only act on Bash/shell tool calls.
    const shell = amp.helpers.shellCommandFromToolCall(event);
    if (!shell || !shell.command) return;

    try {
      // Run "rtk rewrite <command>" via Bun's shell API.
      // amp.$ uses tagged template literals; the shell command is escaped
      // automatically by Bun.
      const result = await amp.$`rtk rewrite ${shell.command}`;

      if (result.exitCode !== 0) return;

      const rewritten = result.stdout.trim();
      // If RTK returns nothing or the same command, no rewrite needed.
      if (!rewritten || rewritten === shell.command) return;

      ctx.logger.log(`[amp-rtk] ${shell.command} → ${rewritten}`);

      // Tell Amp to run the tool with the modified command instead.
      return {
        action: "modify" as const,
        input: { ...event.input, command: rewritten },
      };
    } catch {
      // RTK is missing or failed. Warn once, then silently pass through.
      if (!unavailableNotified) {
        ctx.logger.log("[amp-rtk] rtk not available — passing through");
        unavailableNotified = true;
      }
      return;
    }
  });

  // Show RTK version, binary path, and whether rewriting is enabled.
  amp.registerCommand(
    "rtk-status",
    {
      title: "RTK Status",
      category: "amp-rtk",
      description: "Show RTK version, path, and plugin state",
    },
    async (ctx) => {
      try {
        const version = await amp.$`rtk --version`;
        const path = await amp.$`command -v rtk`;
        const state = sessionEnabled ? "enabled" : "disabled";
        await ctx.ui.notify(
          [
            `RTK version: ${version.stdout.trim()}`,
            `Path: ${path.stdout.trim()}`,
            `Rewriting: ${state}`,
          ].join("\n")
        );
      } catch {
        await ctx.ui.notify("RTK is not installed or not on PATH", "error");
      }
    }
  );

  // Enable, disable, or check the current plugin state.
  amp.registerCommand(
    "rtk-toggle",
    {
      title: "RTK Toggle",
      category: "amp-rtk",
      description: "Enable or disable RTK command rewriting",
    },
    async (ctx) => {
      const choice = await ctx.ui.select({
        title: "RTK Control",
        message: "Choose an action:",
        options: [
          { label: "Enable", value: "enable" },
          { label: "Disable", value: "disable" },
          { label: "Show Status", value: "status" },
        ],
      });

      if (choice === "enable") {
        sessionEnabled = true;
        unavailableNotified = false;
        await ctx.ui.notify("RTK rewriting enabled");
      } else if (choice === "disable") {
        sessionEnabled = false;
        await ctx.ui.notify("RTK rewriting disabled");
      } else if (choice === "status") {
        await ctx.ui.notify(`RTK rewriting is ${sessionEnabled ? "enabled" : "disabled"}`);
      }
    }
  );
}