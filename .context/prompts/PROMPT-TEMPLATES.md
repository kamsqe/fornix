# Fornix — Vibecoding Prompt Templates

> Copy-paste these prompts when starting a vibecoding session. Replace `{placeholders}` with actual values. Always attach the referenced context files.

---

## 1. Implement a Phase

> **When:** Starting a new phase from PHASES.md
> **Attach:** `.context/AGENTS.md` + domain agent file referenced in the phase

```
Implement Phase {N} from PHASES.md.

Here is what the phase requires:
{paste the phase section from PHASES.md}

Rules:
- Follow all principles from AGENTS.md strictly (zero `any`, Result<T,E> for errors, Zod schemas first, etc.)
- Write tests FIRST, then implementation (TDD)
- Use exact file paths from PHASES.md
- Run all verification steps listed in the phase and confirm they pass
- Do NOT implement anything from later phases
```

---

## 2. Create a New Block

> **When:** Building a new section/integration/feature/layout block
> **Attach:** `.context/AGENTS.md` + `.context/agents/blocks-agent.md`

```
Create a new {type} block called `{block-name}`.

Description: {what this block does}
Visual reference: {describe the look or link to inspiration}

Requirements:
- Follow the block file structure from blocks-agent.md exactly
- block.json must have schemaVersion: 1 and all required fields including ai metadata (whenToUse, whenNotToUse, pairsWith, contentSlots)
- ZERO hardcoded text in the .astro file — all visible strings must come from content collections via the content slot pattern
- Include default-content.json with realistic placeholder content
- Include schema.ts with Zod validation for the content shape
- CSS should use the palette CSS custom properties (--color-primary, --color-secondary, --color-accent, --color-background, --color-foreground)
- Test: block.json parses against BlockManifestSchema
- Test: scaffold with this block → astro check passes
```

---

## 3. Add a CLI Command / Flag

> **When:** Adding new CLI functionality
> **Attach:** `.context/AGENTS.md` + `.context/agents/cli-agent.md`

```
Add a new {command/flag} to the CLI: `{fornix command-name}` / `--{flag-name}`.

Purpose: {what it does}

Requirements:
- Use citty for command definition
- Use @clack/prompts for any interactive elements
- Follow error message pattern from cli-agent.md (what went wrong, why, how to fix)
- No filesystem operations in prompt modules — prompts produce config objects only
- Add --help text for the command/flag
- Write an E2E test that runs the compiled binary
```

---

## 4. Add a New Zod Schema

> **When:** Defining a new contract or extending an existing one
> **Attach:** `.context/AGENTS.md`

```
Create a Zod schema for `{SchemaName}` in `{file-path}`.

Shape:
{describe fields and types}

Requirements:
- Export both the Zod schema (e.g., `{SchemaName}Schema`) and the inferred TypeScript type (e.g., `type {SchemaName} = z.infer<typeof {SchemaName}Schema>`)
- Never define the type separately from the schema
- Add sensible defaults where appropriate using .default()
- Add validation constraints (min/max length, regex patterns, enum values)
- Write unit tests: valid input parses, each invalid field fails with descriptive error
- Run: pnpm typecheck && pnpm test:unit
```

---

## 5. Debug a Test Failure

> **When:** A test is failing and you need help understanding why
> **Attach:** `.context/AGENTS.md` + relevant domain agent

```
This test is failing:

File: {test file path}
Test name: "{test name}"
Error:
```
{paste error output}
```

Context: {what this test is supposed to verify}

Diagnose the root cause and fix it. Do NOT change the test expectation unless the test itself is wrong — fix the implementation. After fixing, run the full test suite to make sure nothing else broke.
```

---

## 6. Add a New AI Rule

> **When:** Adding deterministic logic to the rules engine
> **Attach:** `.context/AGENTS.md` + `.context/agents/ai-agent.md`

```
Add a new rule to the rules engine in `packages/create-fornix/src/ai/rules.ts`.

Rule: When the intent has `{signal}`, then `{action}`.

Requirements:
- Add to the rules table in ai-agent.md
- Rule must be deterministic (no AI needed)
- Rule must be idempotent (applying twice = same result)
- Write unit tests for: signal present → action applied, signal absent → no change
- Run: pnpm test:unit
```

---

## 7. Add Pre-Built Palettes

> **When:** Expanding the palette collection
> **Attach:** `.context/AGENTS.md` + `.context/agents/registry-agent.md`

```
Add {N} new pre-built palettes to the `{category}` category.

Requirements:
- Each palette is a JSON file in packages/fornix-registry/palettes/
- Must conform to PaletteSchema: { name (kebab-case), displayName, category, mode ('light'|'dark'), colors: { primary, secondary, accent, background, foreground } }
- Colors should be harmonious and follow the category's aesthetic (see registry-agent.md palette table)
- Colors as hex values
- No duplicate names with existing palettes
- Test: all palette JSON files validate against PaletteSchema
- Test: no duplicate names across the entire collection
```

---

## 8. Scaffold Pipeline Change

> **When:** Modifying how projects are generated
> **Attach:** `.context/AGENTS.md` + `.context/agents/scaffold-agent.md`

```
Modify the scaffold pipeline to {description of change}.

Requirements:
- scaffold() remains a pure function — no side effects, no env reads, no user prompts
- Config files must be generated via magicast (AST), not string templates
- Accept a filesystem abstraction (for memfs in tests)
- Update snapshot tests if the file tree changes
- Test with at least 2 configs: one minimal (static, no i18n) and one full (server, i18n, theme switcher)
- Run: pnpm test:integration
```

---

## 9. Resume Work / Context Handoff

> **When:** Starting a new session or switching to a different AI agent/IDE
> **Attach:** `.context/AGENTS.md` + `PHASES.md` + relevant domain agent

```
I'm continuing work on Fornix. Here's where I left off:

Last completed phase: Phase {N}
Current phase: Phase {N+1}
What's done so far in current phase: {brief description or "nothing yet"}

Files I've been working in:
- {list recent files}

Known issues:
- {any failing tests or blockers}

Continue from where I left off. Read PHASES.md for the current phase requirements. Follow all principles from AGENTS.md.
```

---

## 10. Fix an Integration Issue

> **When:** Two modules aren't working together correctly
> **Attach:** `.context/AGENTS.md` + both relevant domain agents

```
There's an integration issue between {module A} and {module B}.

Symptom: {what's going wrong}
Expected: {what should happen}

Files involved:
- {file A path}
- {file B path}

The contract between these modules is {ContractName} (defined in {schema file}). Check that both sides conform to the contract. If there's a mismatch, fix the implementation — do NOT change the contract unless it's genuinely wrong.
```

---

## 11. Add i18n Support to a Block

> **When:** Making an existing block i18n-compatible
> **Attach:** `.context/AGENTS.md` + `.context/agents/blocks-agent.md`

```
Make the `{block-name}` block fully i18n-compatible.

Requirements:
- Remove ALL hardcoded text from the .astro file
- Move all visible strings to content slots in block.json's ai.contentSlots
- Update default-content.json with proper content structure
- Component should read content from the content collection, keyed by current locale when i18n is enabled
- Use the t() helper or direct content collection query — never inline strings
- Verify with grep: no quoted string literals in the .astro file that are user-visible
- Test: scaffold with single locale → works
- Test: scaffold with 2 locales → locale-specific content files generated, astro check passes
```

---

## 12. Review and Refactor

> **When:** Code review or cleanup pass
> **Attach:** `.context/AGENTS.md`

```
Review {file or module path} for quality issues.

Check against AGENTS.md principles:
- [ ] Zero `any`, zero `as` casts, zero @ts-ignore
- [ ] All functions that can fail return Result<T, E>
- [ ] Types derived from Zod schemas (not defined separately)
- [ ] No barrel files, no magic strings, no auto-discovery
- [ ] Files match exports (kebab-case.ts exports camelCase)
- [ ] No abbreviations (configuration not cfg, dependencies not deps)
- [ ] No dead code, no commented-out code, no TODO without issue link

Fix any issues found. Run pnpm typecheck && pnpm test:unit after changes.
```

---

## Quick Reference: Which Agent to Attach

| Task | Attach These Files |
|------|-------------------|
| Any task | `.context/AGENTS.md` (always) |
| Scaffold changes | + `scaffold-agent.md` |
| Block creation | + `blocks-agent.md` |
| CLI work | + `cli-agent.md` |
| AI/LLM features | + `ai-agent.md` |
| Tests | + `testing-agent.md` |
| Registry/palettes | + `registry-agent.md` |
| MCP server | + `mcp-agent.md` |
| Phase implementation | + the domain agent listed in the phase header |
