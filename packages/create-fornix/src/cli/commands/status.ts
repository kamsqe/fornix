import { defineCommand } from "citty";
import pc from "picocolors";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ── Types ────────────────────────────────────────────────

interface FornixManifest {
  readonly version: string;
  readonly createdAt: string;
  readonly createdWith?: string;
  readonly renderMode: string;
  readonly deployTarget: string;
  readonly database?: string;
  readonly locales?: ReadonlyArray<string>;
  readonly defaultLocale?: string;
  readonly palette?: string;
  readonly themeSwitcher?: boolean;
  readonly blocks: ReadonlyArray<{
    readonly name: string;
    readonly version: string;
    readonly variant: string;
    readonly installedAt: string;
  }>;
}

interface StatusArgs {
  readonly json: boolean;
  readonly verbose: boolean;
}

// ── Command Definition ───────────────────────────────────

export const statusCommand = defineCommand({
  meta: {
    name: "status",
    description: "Show current Fornix project configuration and installed blocks",
  },
  args: {
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
    verbose: {
      type: "boolean",
      description: "Show full configuration details",
      default: false,
    },
  },
  run({ args }) {
    const typedArgs = args as unknown as StatusArgs;
    const cwd = process.cwd();
    const manifestPath = join(cwd, "fornix.json");

    if (!existsSync(manifestPath)) {
      console.error(
        pc.red("✗ No fornix.json found in the current directory."),
      );
      console.error(
        pc.dim(
          "  Run this command from inside a Fornix project, or create one with: npx create-fornix",
        ),
      );
      process.exit(1);
    }

    let manifest: FornixManifest;
    try {
      const raw = readFileSync(manifestPath, "utf-8");
      manifest = JSON.parse(raw) as FornixManifest;
    } catch {
      console.error(pc.red("✗ Failed to parse fornix.json."));
      process.exit(1);
    }

    if (typedArgs.json) {
      console.log(JSON.stringify(manifest, null, 2));
      return;
    }

    printStatus(manifest, typedArgs.verbose);
  },
});

// ── Formatted Output ─────────────────────────────────────

function printStatus(manifest: FornixManifest, verbose: boolean): void {
  console.log();
  console.log(pc.bold("  📋 Fornix Project Status"));
  console.log();

  // ── Config section ──
  console.log(
    `  ${pc.dim("Render mode:")}  ${pc.bold(pc.cyan(manifest.renderMode))}`,
  );
  console.log(
    `  ${pc.dim("Deploy target:")} ${pc.bold(pc.cyan(manifest.deployTarget))}`,
  );

  if (manifest.palette) {
    console.log(
      `  ${pc.dim("Palette:")}      ${pc.bold(manifest.palette)}`,
    );
  }

  if (manifest.locales && manifest.locales.length > 0) {
    const localeStr = manifest.locales.join(", ");
    const defaultStr = manifest.defaultLocale
      ? ` ${pc.dim(`(default: ${manifest.defaultLocale})`)}`
      : "";
    console.log(
      `  ${pc.dim("Locales:")}      ${localeStr}${defaultStr}`,
    );
  }

  if (manifest.database && manifest.database !== "none") {
    console.log(
      `  ${pc.dim("Database:")}     ${manifest.database}`,
    );
  }

  if (manifest.themeSwitcher !== undefined) {
    console.log(
      `  ${pc.dim("Theme switcher:")} ${manifest.themeSwitcher ? "enabled" : "disabled"}`,
    );
  }

  if (verbose && manifest.createdWith) {
    console.log(
      `  ${pc.dim("Created with:")} ${manifest.createdWith}`,
    );
    console.log(
      `  ${pc.dim("Created at:")}   ${manifest.createdAt}`,
    );
  }

  // ── Blocks section ──
  console.log();
  console.log(
    `  ${pc.bold("Installed blocks")} ${pc.dim(`(${manifest.blocks.length})`)}`,
  );
  console.log();

  if (manifest.blocks.length === 0) {
    console.log(
      pc.dim("  No blocks installed. Add one with: fornix add <block>"),
    );
  } else {
    for (const block of manifest.blocks) {
      const variant =
        block.variant !== "default" ? pc.dim(` [${block.variant}]`) : "";
      console.log(
        `    ${pc.green("●")} ${pc.bold(block.name)}${variant} ${pc.dim(`v${block.version}`)}`,
      );

      if (verbose) {
        console.log(
          `      ${pc.dim("Installed:")} ${block.installedAt}`,
        );
      }
    }
  }

  console.log();
}
