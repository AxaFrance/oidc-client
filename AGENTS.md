# Agent instructions

- Always write code, comments, documentation, and responses in English.
- Keep changes focused and follow the existing TypeScript and pnpm conventions.
- Always keep the root and relevant package `README.md` files and `FAQ.md` up to
  date when changing behavior, configuration, APIs, or setup instructions.
  Document only verified behavior and clearly state limitations.
- Add or update tests for behavior changes.
- Before submitting or updating any pull request, run `pnpm lint-fix`,
  `pnpm lint`, `pnpm build`, `pnpm test:ci`, and `pnpm test:e2e`.
  Build validation and E2E tests are mandatory, including for documentation-only
  changes; all commands must pass before submission.
- Run `pnpm build` before the test suites. Run build and test commands
  sequentially because they share generated package artifacts.
