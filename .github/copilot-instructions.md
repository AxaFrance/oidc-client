# GitHub Copilot – Instructions for this project

## 🧰 Tech stack

This project is a **pnpm monorepo** made up of the following packages:

- `packages/oidc-client` — vanilla OIDC client
- `packages/react-oidc` — React bindings
- `packages/oidc-client-service-worker` — OIDC service worker

Main language: **TypeScript**. Package manager: **pnpm**.

---

## ✅ Mandatory steps before stopping

> **You must never stop before all the following steps have completed successfully.**

### 1. Auto-fix lint issues

```bash
pnpm lint-fix
```

### 2. Verify no lint errors remain

```bash
pnpm lint
```

> If errors remain after lint-fix, **you must fix them manually** in the code, then re-run `pnpm lint` until zero errors are reported.

### 3. Run all unit tests

```bash
pnpm test:ci
```

> If tests fail, **you must fix the code or the tests** depending on the root cause, then re-run until all tests are green.

### 4. Final build (optional but recommended)

```bash
pnpm build
```

---

## 🧼 Clean Code principles to follow

### Naming
- Variable, function, class and file names must be **clear, descriptive and in English**.
- Avoid obscure abbreviations (`tmp`, `cb`, `d`, `val`…) except established conventions (`e` for event, `i` for index).
- Booleans must start with `is`, `has`, `can`, `should`.

### Functions
- One function = **one single responsibility**.
- No more than **3–4 parameters** per function. Use an object if needed.
- Prefer **pure functions** and **immutability**.
- Avoid undocumented side effects.

### TypeScript
- **Explicit typing** is mandatory for function parameters and return values.
- No `any` unless absolutely necessary (and with an explanatory comment).
- Use TypeScript **utility types** (`Partial`, `Readonly`, `Pick`, `Omit`…) where appropriate.
- Prefer `interface` for public contracts and `type` for unions/intersections.

### Code structure
- Respect **separation of concerns**: business logic separated from display logic.
- No dead code left commented out in files.
- `TODO` comments must include clear context (e.g. `// TODO: [#123] Refactor once API is stable`).

### Tests
- Every new function or behaviour must be **covered by a unit test**.
- Tests must be **readable and expressive**: `describe` / `it` with natural English sentences.
- Do not duplicate tested logic inside assertions.
- Use mocks/stubs sparingly and always clean them up (`afterEach`, `vi.restoreAllMocks()`).

### Imports
- Imports must be **ordered**: third-party libraries → internal packages → local files.
- Use **named imports** rather than default imports whenever possible.
- No unused imports.

### Comments
- Code must be **self-documenting**: if you need a comment to explain **what** the code does, refactor the code instead.
- Comments explain the **why**, not the **what**.
- Public functions and types must be documented with **JSDoc**.

---

## 🔁 Expected workflow

```
1. Write or modify the code
2. pnpm lint-fix          → automatic fixes
3. pnpm lint              → verification (fix manually if errors remain)
4. pnpm test:ci           → all tests must pass (fix if failures)
5. pnpm build             → verify the build does not break
```

> 🚫 **Never submit or stop if any step fails.**
