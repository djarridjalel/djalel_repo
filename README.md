# djalel_repo

## Ops Pulse — personal live dashboard

`ops-pulse.html` is a single-file, self-updating status dashboard.

- **Live:** https://claude.ai/code/artifact/6d7fd026-3299-40ef-b3e2-142f752dff2e
- **Tracking now (real data, polls in the background):**
  - **Deployments** — latest Vercel deploy state, branch, commit, and recent history for the `potfolio` project.
  - **Database health** — Supabase project status, Postgres version, table count, and open security advisories for `djarridjalel's Project`.
- **Sample data (clearly labeled, not live):** Calendar and Inbox cards are placeholder layouts — no calendar or email connector is available yet. Add one and these become real.

The page calls Vercel and Supabase directly through your connected claude.ai accounts each time it's opened, so it only shows live data when viewed as the published artifact (not from a static file on disk).