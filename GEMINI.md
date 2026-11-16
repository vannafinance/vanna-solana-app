# Instructions for Gemini / Antigravity agents

## Subagent Model Rule (MANDATORY)
- **Top-Level Orchestrator Only**: Always use Argon ONLY as the top-level orchestrator for reviewing and assigning tasks.
- **Subagent Model Specification**: Every `invoke_subagent` call MUST pass `Model: "flash"` (Gemini Flash).
- **Strict Prohibition**: NEVER spawn subagents with `Model: "inherit"` or Argon.

## Project Guidelines & Workflow
Read `AGENTS.md` first and follow it exactly. It points to `docs/HANDOFF.md`, `docs/NEXT_ALL_TRANSACTIONS.md` (including its
MANDATORY verification section) and `docs/CURRENT_TASK.md`. Work on git branch `claude/vanna-mobile`.
