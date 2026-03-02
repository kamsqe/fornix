import { describe, it, expect } from "vitest";
import { BlockManifestSchema } from "../../src/schemas/block-manifest";

// ── Fixtures ──────────────────────────────────────────────

const validMinimalManifest = {
  schemaVersion: 1,
  name: "hero-gradient",
  version: "1.0.0",
  type: "section" as const,
  description: "A gradient hero section with headline and CTA",
  category: "hero",
  tags: ["hero", "gradient", "landing"],
  dependencies: {},
  requires: [],
  conflicts: [],
  envVars: [],
  variants: ["default"],
  slots: [],
  files: [
    {
      source: "hero-gradient.astro",
      destination: "src/components/sections/hero-gradient.astro",
    },
  ],
};

const validFullManifest = {
  ...validMinimalManifest,
  name: "auth-better-auth",
  type: "integration" as const,
  description: "Authentication via Better Auth with session handling",
  category: "auth",
  tags: ["auth", "login", "session"],
  dependencies: { "better-auth": "^1.0.0", "drizzle-orm": "^0.30.0" },
  requires: ["db-d1"],
  conflicts: ["auth-clerk"],
  requiredMode: "server" as const,
  envVars: [
    {
      name: "AUTH_SECRET",
      description: "Secret key for signing sessions",
      required: true,
    },
  ],
  variants: ["default", "magic-link"],
  slots: ["login-form", "signup-form"],
  files: [
    {
      source: "middleware.ts",
      destination: "src/middleware/auth.ts",
      condition: "renderMode !== 'static'",
    },
    {
      source: "login.astro",
      destination: "src/pages/login.astro",
    },
  ],
  ai: {
    whenToUse: "User needs authentication, login, or user accounts",
    whenNotToUse: "Static sites with no user interaction",
    pairsWith: ["db-d1", "layout-dashboard"],
    contentSlots: {
      loginHeading: {
        type: "string" as const,
        description: "Heading for the login page",
        maxLength: 100,
        example: "Welcome back",
      },
      features: {
        type: "array" as const,
        description: "List of auth features to highlight",
        minItems: 1,
        maxItems: 5,
        items: {
          title: { type: "string" },
          description: { type: "string" },
        },
      },
    },
  },
};

// ── Tests ─────────────────────────────────────────────────

describe("BlockManifestSchema", () => {
  // ── Happy Path ──

  it("parses a valid minimal manifest successfully", () => {
    const result = BlockManifestSchema.safeParse(validMinimalManifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("hero-gradient");
      expect(result.data.schemaVersion).toBe(1);
      expect(result.data.type).toBe("section");
    }
  });

  it("parses a valid full manifest with all optional fields", () => {
    const result = BlockManifestSchema.safeParse(validFullManifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ai?.whenToUse).toContain("authentication");
      expect(result.data.requiredMode).toBe("server");
      expect(result.data.requires).toContain("db-d1");
      expect(result.data.conflicts).toContain("auth-clerk");
      expect(result.data.files).toHaveLength(2);
      expect(result.data.files[0].condition).toBe(
        "renderMode !== 'static'"
      );
    }
  });

  // ── Missing Required Fields ──

  it("fails when name is missing", () => {
    const { name: _, ...withoutName } = validMinimalManifest;
    const result = BlockManifestSchema.safeParse(withoutName);
    expect(result.success).toBe(false);
  });

  it("fails when schemaVersion is missing", () => {
    const { schemaVersion: _, ...withoutVersion } = validMinimalManifest;
    const result = BlockManifestSchema.safeParse(withoutVersion);
    expect(result.success).toBe(false);
  });

  it("fails when type is missing", () => {
    const { type: _, ...withoutType } = validMinimalManifest;
    const result = BlockManifestSchema.safeParse(withoutType);
    expect(result.success).toBe(false);
  });

  it("fails when description is missing", () => {
    const { description: _, ...withoutDescription } = validMinimalManifest;
    const result = BlockManifestSchema.safeParse(withoutDescription);
    expect(result.success).toBe(false);
  });

  // ── Invalid Type ──

  it("fails with invalid type value", () => {
    const result = BlockManifestSchema.safeParse({
      ...validMinimalManifest,
      type: "widget",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid type values", () => {
    for (const type of ["section", "integration", "feature", "layout"]) {
      const result = BlockManifestSchema.safeParse({
        ...validMinimalManifest,
        type,
      });
      expect(result.success).toBe(true);
    }
  });

  // ── Name Validation ──

  it("rejects uppercase characters in name", () => {
    const result = BlockManifestSchema.safeParse({
      ...validMinimalManifest,
      name: "HeroGradient",
    });
    expect(result.success).toBe(false);
  });

  it("rejects special characters in name", () => {
    const result = BlockManifestSchema.safeParse({
      ...validMinimalManifest,
      name: "hero_gradient!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects names starting with a number", () => {
    const result = BlockManifestSchema.safeParse({
      ...validMinimalManifest,
      name: "1-hero",
    });
    expect(result.success).toBe(false);
  });

  it("rejects names starting with a hyphen", () => {
    const result = BlockManifestSchema.safeParse({
      ...validMinimalManifest,
      name: "-hero",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid kebab-case names", () => {
    for (const name of ["hero", "hero-gradient", "pricing-table-v2", "a"]) {
      const result = BlockManifestSchema.safeParse({
        ...validMinimalManifest,
        name,
      });
      expect(result.success).toBe(true);
    }
  });

  // ── Files Validation ──

  it("validates files array requires source and destination", () => {
    const result = BlockManifestSchema.safeParse({
      ...validMinimalManifest,
      files: [{ source: "foo.astro" }], // missing destination
    });
    expect(result.success).toBe(false);
  });

  it("validates files array rejects empty source", () => {
    const result = BlockManifestSchema.safeParse({
      ...validMinimalManifest,
      files: [{ source: "", destination: "src/foo.astro" }],
    });
    expect(result.success).toBe(false);
  });

  it("validates files array rejects empty destination", () => {
    const result = BlockManifestSchema.safeParse({
      ...validMinimalManifest,
      files: [{ source: "foo.astro", destination: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts files with optional condition field", () => {
    const result = BlockManifestSchema.safeParse({
      ...validMinimalManifest,
      files: [
        {
          source: "middleware.ts",
          destination: "src/middleware/auth.ts",
          condition: "renderMode !== 'static'",
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.files[0].condition).toBe(
        "renderMode !== 'static'"
      );
    }
  });

  // ── Description Length ──

  it("rejects description longer than 200 characters", () => {
    const result = BlockManifestSchema.safeParse({
      ...validMinimalManifest,
      description: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("accepts description at exactly 200 characters", () => {
    const result = BlockManifestSchema.safeParse({
      ...validMinimalManifest,
      description: "x".repeat(200),
    });
    expect(result.success).toBe(true);
  });

  // ── Version Validation ──

  it("accepts valid semver versions", () => {
    for (const version of ["1.0.0", "0.1.0", "10.20.30"]) {
      const result = BlockManifestSchema.safeParse({
        ...validMinimalManifest,
        version,
      });
      expect(result.success).toBe(true);
    }
  });

  // ── requiredMode ──

  it("accepts valid requiredMode values", () => {
    for (const requiredMode of ["static", "hybrid", "server"]) {
      const result = BlockManifestSchema.safeParse({
        ...validMinimalManifest,
        requiredMode,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid requiredMode", () => {
    const result = BlockManifestSchema.safeParse({
      ...validMinimalManifest,
      requiredMode: "dynamic",
    });
    expect(result.success).toBe(false);
  });

  // ── Optional fields default correctly ──

  it("does not require ai field", () => {
    const result = BlockManifestSchema.safeParse(validMinimalManifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ai).toBeUndefined();
    }
  });

  it("does not require requiredMode field", () => {
    const result = BlockManifestSchema.safeParse(validMinimalManifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredMode).toBeUndefined();
    }
  });

  // ── envVars validation ──

  it("validates envVars items have name and description", () => {
    const result = BlockManifestSchema.safeParse({
      ...validMinimalManifest,
      envVars: [{ name: "API_KEY" }], // missing description and required
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid envVars", () => {
    const result = BlockManifestSchema.safeParse({
      ...validMinimalManifest,
      envVars: [
        {
          name: "API_KEY",
          description: "The API key for external service",
          required: true,
        },
        {
          name: "DEBUG",
          description: "Enable debug mode",
          required: false,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.envVars).toHaveLength(2);
    }
  });

  // ── AI contentSlots validation ──

  it("validates ai.contentSlots type values", () => {
    const result = BlockManifestSchema.safeParse({
      ...validMinimalManifest,
      ai: {
        whenToUse: "test",
        whenNotToUse: "test",
        pairsWith: [],
        contentSlots: {
          heading: {
            type: "invalid",
            description: "A heading",
          },
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid ai.contentSlots types", () => {
    for (const type of ["string", "number", "boolean", "array", "object"]) {
      const result = BlockManifestSchema.safeParse({
        ...validMinimalManifest,
        ai: {
          whenToUse: "test",
          whenNotToUse: "test",
          pairsWith: [],
          contentSlots: {
            heading: { type },
          },
        },
      });
      expect(result.success).toBe(true);
    }
  });
});
