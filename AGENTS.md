# Agent instructions

- Always write code, comments, documentation, and responses in English.
- Keep changes focused and follow the existing TypeScript and pnpm conventions.
- Always keep the root and relevant package `README.md` files and `FAQ.md` up to
  date when changing behavior, configuration, APIs, or setup instructions.
  Document only verified behavior and clearly state limitations.
- Add or update tests for behavior changes.
- Before submitting, run `pnpm lint-fix`, `pnpm lint`, and `pnpm test:ci`.
  Run `pnpm build` when changing code or build configuration.
