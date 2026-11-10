# Session rules

All skills are turned off by default to save tokens (`.claude/settings.json` → `skillOverrides`).

At the start of every session, after reading the user's first request and understanding the task:
1. Read `.claude/skills-catalog.md` and pick the skills (if any) the task needs.
2. Ask the user (AskUserQuestion) which of those to turn on, before doing the task.
3. Turn on the approved ones by setting them to `"on"` in `.claude/settings.json` `skillOverrides`, then ask the user to run `/config` or restart so they load.
4. Do not commit those temporary "on" changes; restore them to `"off"` when the task is done.
