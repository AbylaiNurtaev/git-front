# AGENTS.md

## Development rules

- NEVER run `npm run build` after each small change
- ALWAYS use `npm run dev` for development
- Do not perform production builds unless explicitly asked by the user
- Prefer visual verification in the running dev server over repeated builds
- Run a build only when the user explicitly asks for it or when a final verification is truly necessary
- Prefer fast iteration over full builds

## Project commands

- Dev: `npm run dev`
- Build: `npm run build` (only for deployment)
