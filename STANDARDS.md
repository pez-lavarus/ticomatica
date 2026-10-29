# Project Standards

Generic, reusable conventions for the monorepo's toolchain, infrastructure,
and deployment. Copy this file into the root of a new project and follow it
when creating packages, stacks, resources, or workflows. It is written to be
followed by human and AI contributors alike.

A project-specific `AGENTS.md` (or equivalent) takes precedence over this
file when they conflict.

Placeholders used throughout:

- `{project}` — project scope name, lowercase kebab-case (e.g. `my-app`).
- `{stage}` — deployment stage: `dev` | `staging` | `prod`.
- `{region}` — default AWS region (e.g. `us-east-1`).

---

## 1. Toolchain

- **Node.js** — current LTS (22 at time of writing). Pinned in CI.
- **pnpm** — the only package manager. Pin the exact version in
  `package.json` (`packageManager`) and in CI (`pnpm/action-setup` with `version`).
- **TypeScript** — always used; version managed via a workspace catalog.
- **AWS CDK v2** — all infrastructure is defined as code. Never `aws` CLI
  resource creation for anything that should be reproducible.

Rules:

- Use `pnpm install --frozen-lockfile` in every CI step — never `pnpm install`.
- Commit `pnpm-lock.yaml`.
- `.npmrc` conventions: `save-exact=true`, `auto-install-peers=true`,
  `strict-peer-dependencies=false`.

---

## 2. Monorepo Layout (pnpm)

`pnpm-workspace.yaml` defines:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- **`apps/*`** — deployable units (web frontend, lambdas, infrastructure).
- **`packages/*`** — shared libraries.
- **Catalogs** — group dependency versions in `pnpm-workspace.yaml` and
  reference them as `"<dep>": "catalog:<name>"` instead of pinning versions inline.
- **`allowBuilds`** — whitelist native/postinstall dependencies (e.g. `esbuild`, `sharp`).
- Internal dependencies are always `workspace:*`.

### Naming

- Package name = `@{project}/<name>`; `<name>` matches the directory.
- Scope all shared code under the same `@{project}` scope.
- Scripts follow a consistent shape: `build`, `test`, `typecheck`, and
  deployable packages add `package` (bundle) and `deploy` where relevant.

---

## 3. TypeScript

- One shared `tsconfig.base.json` at the root; every package `extends` it.
- Baseline compiler options:
  - `target: ES2022`
  - `module` / `moduleResolution: NodeNext`
  - `strict: true`, `isolatedModules: true`
  - `declaration` + `declarationMap` + `sourceMap`
  - `types: ["node"]` (packages add their own, e.g. `jest`)
- Infrastructure tsconfig: `composite: true`, `rootDir: "."`, `outDir: "dist"`.

---

## 4. AWS CDK

### Layout

- Infrastructure lives in a dedicated workspace app (`apps/infrastructure`).
- `bin/app.ts` — entry point; builds the `App` and instantiates stacks.
- `cdk.json` — runs the compiled entry (e.g. `node dist/bin/app.js`) and holds
  default `context` (e.g. `stage`).
- `src/config.ts` — stage resolution + config builders (single source of truth
  for stage-aware settings).
- `src/stacks/<Concern>Stack.ts` — one stack per concern.

### Stage handling

- Stage is passed via CDK context: `cdk deploy --all --context stage=<stage>`.
- Normalize input in a `resolveStage()` helper (`prod`/`production` → `prod`,
  `staging` → `staging`, anything else → `dev`).
- Map stage to a display suffix used in stack IDs: `dev → Dev`,
  `staging → Staging`, `prod → Prod`.

### Naming

- **Physical resource names**: lowercase kebab-case `{project}-{stage}-{resource}`
  (e.g. `my-app-dev-api`).
- **CDK construct IDs**: PascalCase (e.g. `ApiLambda`, `WebBucket`).
- **Stack IDs**: `{Concern}{StageSuffix}` (e.g. `ApiDev`, `ApiProd`).
- Derive every physical name from a `resourcePrefix(stage)` helper returning
  `{project}-{stage}`.
- Do not hardcode the project name or stage in resource strings — always route
  through `resourcePrefix()`.

### Stack decomposition

- **One stack per concern.** Split by lifecycle/dependency boundary, not
  arbitrarily. Pass resources between stacks as constructor props (typed
  interfaces such as `IFunction`, `ITable`, `IBucket`), never by hardcoded name
  or `from*` lookup except for pre-existing external resources.
- Order stacks so dependencies are expressed through props; avoid cross-stack
  cycles (move the coupling to a post-deploy step if a cycle is unavoidable).
- Each `Stack` class exposes the resources others need as `public readonly`
  fields.

### Cross-stack outputs

- Expose values to external consumers (CI, other tooling) via `CfnOutput` with
  `exportName: {prefix}-{name}`.
- Consume those outputs from CloudFormation stack outputs in CI rather than
  hardcoding them.

### Global conventions

- Tag the app: `Project = {project}`, `Environment = {stage}` (`Tags.of(app)`).
- **Removal policy**: `prod` → `RETAIN`; `staging`/`dev` → `DESTROY`.
- **Security defaults**: S3 `S3_MANAGED` encryption + `BlockPublicAccess.BLOCK_ALL`
  + `enforceSSL: true`; SQS/SNS `enforceSSL: true`.
- **Least privilege**: use scoped grants (`.grantReadData()`,
  `.grantReadWriteData()`, `.grantPublish()`) rather than broad hand-written IAM.
- **Runtime**: pin the Node runtime to the project's version; enable X-Ray
  tracing; apply reserved concurrency only in `prod`.
- **Lambda deploy pattern**: CDK deploys functions with placeholder inline code;
  real code is pushed via `aws lambda update-function-code` in CI (keeps
  infrastructure and function-code deploys independent).

---

## 5. Environment Variables & Secrets

- Maintain a **single source of truth** schema file (e.g.
  `scripts/deploy/env.schema.mjs`) listing every variable with name,
  description, example, requirement level, and a `secret` flag.
- Document variables in `.env.example` and keep it in sync with the schema.
- Local files `.env`, `.env.dev`, `.env.prod` are **gitignored** (`.env` and `.env.*`).
- Mark secrets (`secret: true`) so they are masked in logs and never committed.
- Classify each variable by requirement: `always` | `prod-only` | `optional`,
  and validate the required set per stage during preflight.
- Secrets in CI are injected via GitHub Actions secrets/environments; values
  resolve at runtime and never enter the repo.

---

## 6. CI/CD

### Auth

- Authenticate to AWS via **OIDC** (`aws-actions/configure-aws-credentials@v4`
  with `role-to-assume`) — no long-lived access keys.

### Pipeline shape

- **CI** (PR + push to integration/default branches): install → typecheck →
  test → build → CDK synth.
- **Deploy** (`workflow_dispatch`, environment-gated): infrastructure first,
  then function code, then frontend.

### Deploy job graph

1. **Infra** — `cdk deploy --all --context stage=<stage> --require-approval never`.
2. **Function code** (needs infra) — matrix over deployable functions: bundle →
   `aws lambda update-function-code`. In `prod`, `--publish` and update/create
   the `live` alias for rolling control.
3. **Frontend** (needs infra) — capture any backend URL from stack outputs →
   build → upload to S3 → invalidate CDN.

### Static frontend upload (three passes)

- HTML: `public,max-age=0,must-revalidate`.
- Hashed assets (JS/CSS/images): `public,max-age=31536000,immutable`.
- Data files: short-lived cache (e.g. `public,max-age=3600`).
- Finish with a CDN invalidation on `/*`.

### Deploy logic reuse

- Keep deploy logic in shared step modules invoked by both a local interactive
  helper and the CI entry point, so behavior is defined in exactly one place.
- Centralize region, tool versions, deploy order, and function-name builders in
  a single config module.

---

## 7. Testing

- Root `pnpm test` runs all workspace tests.
- Default framework: **jest** + **ts-jest** for packages and CDK stacks
  (snapshot/assertion tests in `apps/infrastructure/test/**/*.test.ts`).
- **vitest** is acceptable where faster unit runs are preferred.
- Keep integration tests behind a separate script (`test:integration`) so unit
  runs stay fast and deterministic.

---

## 8. Lambda Packaging

- Bundle with `tsup`; zip with `archiver` via a small script
  (`scripts/zip-bundle.mjs`).
- Artifact: `dist/lambda.zip`.
- `package` script builds workspace dependencies first, then bundles, then zips
  (e.g. `pnpm --filter ...@{project}/<name> build && pnpm zip`).

---

## 9. Git & Branching

- Default branch: `main`; integration branch: `dev`.
- CI runs on PRs and pushes to `dev`/`main`.
- Production deploy is manual (`workflow_dispatch`) and gated by the `prod`
  environment.
