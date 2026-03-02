# Fornix — Vibecoding Instructions

> The definitive guide for developing Fornix with AI coding agents. Covers session workflow, context management, error recovery, and multi-agent/IDE strategies.

---

## Before Your First Session

### Prerequisites Checklist

```bash
# Verify everything works
cd ~/Desktop/projects/fornix
pnpm typecheck    # → 0 errors
pnpm build        # → 2 packages built
node -v           # → v20+
pnpm -v           # → v9+
```

### Know Your Files

| File | Purpose | When to Use |
|------|---------|-------------|
| `.context/AGENTS.md` | Constitution — principles, contracts, architecture | **EVERY session** |
| `.context/agents/{domain}-agent.md` | Domain-specific rules and patterns | When working on that domain |
| `PHASES.md` | 54-phase implementation plan with verification | When implementing features |
| `.context/prompts/PROMPT-TEMPLATES.md` | Copy-paste prompts for common tasks | Starting any coding task |

---

## Session Workflow

### Starting a Session

```
1. Open PHASES.md → find the next unchecked phase
2. Copy Prompt Template #1 from PROMPT-TEMPLATES.md
3. Fill in the phase number and paste the phase details
4. Attach: .context/AGENTS.md + the domain agent referenced in the phase header
5. Send the prompt to your AI agent
```

### During a Session

**DO:**
- Let the agent write tests FIRST, then implementation (TDD — principle 7)
- Run verification steps listed in the phase BEFORE marking it done
- Commit after each completed phase: `git commit -m "feat(scope): phase N — description"`
- If the agent generates code that violates AGENTS.md principles, stop and correct it immediately

**DON'T:**
- Don't skip phases — they're dependency-ordered
- Don't let the agent work on multiple phases at once
- Don't accept code with `any`, `as` casts, or `@ts-ignore`
- Don't accept hardcoded text strings in `.astro` files
- Don't let the agent generate config files via string concatenation (must use magicast)

### Ending a Session

```bash
# 1. Run full checks
pnpm typecheck && pnpm test:unit && pnpm test:integration

# 2. Commit your work
git add -A
git commit -m "feat(scope): phase N — description"
git push origin main

# 3. Update PHASES.md — mark completed phases with [x]
# 4. Note which phase you stopped at (for resume prompt)
```

---

## Switching Between Models / AI IDEs

### Context Handoff Protocol

When switching from one AI agent/IDE to another (e.g., Cursor → Claude → Windsurf → Gemini), use **Prompt Template #9** ("Resume Work"):

```
I'm continuing work on Fornix. Here is where I left off:

Last completed phase: Phase {N}
Current phase: Phase {N+1}
What's done so far in current phase: {brief description or "nothing yet"}

Files I've been working in:
- {list recent files}

Known issues:
- {any failing tests or blockers}

Continue from where I left off. Read PHASES.md for the current phase requirements.
Follow all principles from AGENTS.md.
```

### What to Attach Per IDE

| IDE | How to Attach Context |
|-----|----------------------|
| **Cursor** | Add `.context/AGENTS.md` + domain agent to `.cursor/rules/`. Or use `@file` mentions in chat |
| **Claude (Gemini Antigravity)** | Reference files with `@` mentions in the prompt |
| **Windsurf** | Add context files as "Knowledge" or paste into conversation |
| **Copilot Chat** | Use `#file` references to attach context |
| **Aider** | Use `--read` flag: `aider --read .context/AGENTS.md --read .context/agents/scaffold-agent.md` |
| **Any other** | Paste the contents of AGENTS.md + domain agent directly into the prompt |

### Model-Specific Tips

| Model | Strengths | Watch Out For |
|-------|-----------|---------------|
| **Claude** | Best at following long context files. Excellent for architecture-heavy phases (schemas, pipeline design) | May over-engineer simple tasks |
| **GPT-4 / o-series** | Great at structured output, Zod schemas, test gen | Can hallucinate imports; verify `pnpm typecheck` |
| **Gemini** | Strong at large file comprehension, refactoring | May be less precise with complex TypeScript generics |
| **DeepSeek** | Cost-effective for boilerplate-heavy phases (blocks, palettes) | Needs explicit instructions; less reliable with subtle patterns |
| **Local (Ollama)** | Free, private, works offline | Slower; limit to small, well-defined phases |

### Golden Rule for Switching

> **The code is the source of truth, not the conversation history.** Always start a new agent session by having it READ the current codebase state, not by summarizing what the previous agent did.

---

## Error Recovery Scenarios

### Scenario 1: Test Failure After Implementation

```
Use Prompt Template #5 (Debug Test Failure).
Paste the exact error output.
Tell the agent: "Fix the implementation, not the test."
```

### Scenario 2: Agent Violates AGENTS.md Principles

Common violations to catch:
- Uses `any` or `as` cast → "Remove the type assertion and fix the underlying type issue"
- Puts hardcoded text in `.astro` → "Move this text to a content collection entry"
- String-concatenates a config file → "Use magicast for AST-based config generation"
- Skips error handling → "This function can fail. Return `Result<T, E>` instead of throwing"
- Creates barrel file → "We don't use barrel files. Use direct imports (principle 9)"

**Recovery prompt:**
```
This code violates principle {N} from AGENTS.md: "{principle text}".
Fix it to comply. Specifically: {what's wrong and what it should be}.
```

### Scenario 3: Agent Goes Off-Track (Wrong Phase / Scope Creep)

```
Stop. You're implementing beyond the scope of Phase {N}.
Phase {N} only requires: {list deliverables from PHASES.md}.
Revert any changes that aren't in this list and focus only on what's specified.
```

### Scenario 4: Build/Typecheck Fails

```bash
# First, identify what broke
pnpm typecheck 2>&1 | head -40

# Then give the agent the error
```
```
pnpm typecheck is failing with these errors:
{paste errors}

Fix all type errors. Do not use `any` or `as` casts. Fix the actual types.
```

### Scenario 5: Agent Doesn't Know the Codebase

When an agent seems confused about the project structure:
```
Read these files first before making any changes:
1. .context/AGENTS.md — project constitution
2. .context/agents/{relevant}-agent.md — domain rules
3. {the specific file you want it to edit}

Now, with this context, {your actual request}.
```

### Scenario 6: Pnpm Install Fails (Network Issues)

```bash
# Option 1: Force IPv4
export NODE_OPTIONS="--dns-result-order=ipv4first"
pnpm install

# Option 2: Use mirror registry
pnpm install --registry https://registry.npmmirror.com

# Option 3: Switch DNS temporarily
networksetup -setdnsservers Wi-Fi 1.1.1.1 1.0.0.1
pnpm install
networksetup -setdnsservers Wi-Fi empty
```

### Scenario 7: Merge Conflict After Multiple Agents

If two sessions touched the same files:
```bash
git status                    # See conflicts
git diff --name-only HEAD~2   # See what changed recently
```
Then tell the agent:
```
There's a merge conflict in {file}. Here's the diff:
{paste git diff output}

The correct resolution is: {describe which version to keep or how to merge}.
```

---

## Phase Progression Cheat Sheet

### Which Phases Can Be Parallelized?

Within each tier, some phases are independent. Here's what you can run in **parallel sessions**:

| Parallel Group | Phases | Why |
|---------------|--------|-----|
| Schemas | 1, 2 (then 3, 4, 5 after) | BlockManifest and PaletteRegistry are independent |
| Scaffold generators | 10, 11 (after 9) | Astro config and Tailwind/palette config are independent |
| CLI commands | 28, 29, 30, 31 (after 27) | Each command is independent |
| Block batches | 39, 40, 41, 42, 43, 44 (after 25) | Each batch is independent |

### Phases That Should NEVER Be Rushed

| Phase | Why |
|-------|-----|
| **3 (ResolvedConfig)** | Every module depends on this schema. Get it right |
| **7 (Dependency Resolver)** | Core algorithm — needs thorough testing |
| **15 (Pipeline Assembly)** | Integration point — if this breaks, everything breaks |
| **32 (Rules Engine)** | Must be 100% deterministic and tested |

---

## Quality Gates

Run these checks after each phase and NEVER skip them:

```bash
# After every phase
pnpm typecheck        # 0 errors

# After Tier 1 phases (schemas)
pnpm test:unit        # All pass

# After Tier 2+ phases (scaffold, CLI)
pnpm test:unit        # All pass
pnpm test:integration # All pass

# After Tier 3+ phases (CLI with E2E)
pnpm test:e2e         # All pass

# Before pushing
pnpm typecheck && pnpm test:unit && pnpm test:integration
```

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────┐
│  FORNIX VIBECODING QUICK REF                     │
├──────────────────────────────────────────────────┤
│                                                  │
│  ALWAYS ATTACH: .context/AGENTS.md               │
│  + domain agent for your current work            │
│                                                  │
│  START: Copy prompt template → fill → send       │
│  CHECK: pnpm typecheck && pnpm test:unit         │
│  COMMIT: git commit -m "feat(scope): phase N"    │
│  SWITCH: Use Prompt Template #9 (Resume)         │
│                                                  │
│  NEVER: any, as, @ts-ignore, hardcoded text,     │
│         barrel files, string concatenation for   │
│         configs, skipped phases                  │
│                                                  │
│  IF STUCK: Prompt Template #5 (Debug)            │
│  IF OFF-TRACK: "Stop. Phase N only requires..."  │
│  IF CONFUSED: "Read these files first: ..."      │
│                                                  │
└──────────────────────────────────────────────────┘
```
