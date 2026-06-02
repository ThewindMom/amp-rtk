import type { PluginAPI } from "@ampcode/plugin";

const REWRITE_TIMEOUT_MS = 5000;

let sessionEnabled = true;
let unavailableNotified = false;

export default function (amp: PluginAPI) {
  amp.logger.log("[amp-rtk] plugin loaded");

  amp.on("tool.call", async (event, ctx) => {
    if (!sessionEnabled) return;

    const shell = amp.helpers.shellCommandFromToolCall(event);
    if (!shell || !shell.command) return;

    try {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), REWRITE_TIMEOUT_MS);

      const result = await amp.$`rtk rewrite ${shell.command}`;
      clearTimeout(timer);

      if (result.exitCode !== 0) return;

      const rewritten = result.stdout.trim();
      if (!rewritten || rewritten === shell.command) return;

      ctx.logger.log(`[amp-rtk] ${shell.command} → ${rewritten}`);
      return {
        action: "modify" as const,
        input: { ...event.input, command: rewritten },
      };
    } catch {
      if (!unavailableNotified) {
        ctx.logger.log("[amp-rtk] rtk not available — passing through");
        unavailableNotified = true;
      }
      return;
    }
  });

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
            `Session: ${state}`,
          ].join("\n")
        );
      } catch {
        await ctx.ui.notify("RTK is not installed or not on PATH", "error");
      }
    }
  );

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
        await ctx.ui.notify(`RTK is ${sessionEnabled ? "enabled" : "disabled"}`);
      }
    }
  );
}
