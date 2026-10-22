# Examen Matemáticas

A pnpm monorepo for the Ticomatica web app and its AWS infrastructure (static hosting + telemetry).

## Structure

```
examen-matematicas/
├── apps/
│   ├── web/              Next.js 16 assessment app (@ticomatica/web)
│   └── infrastructure/   AWS CDK stacks: web hosting + telemetry (@ticomatica/infrastructure)
├── tsconfig.base.json    shared TypeScript baseline
└── pnpm-workspace.yaml   workspace, catalogs, and build allowlist
```

## Prerequisites

- Node.js 22+
- pnpm 11

## Getting Started

```bash
pnpm install
pnpm dev            # run the web app
```

## Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `pnpm dev`           | Start the web dev server                 |
| `pnpm build`         | Build all workspace packages             |
| `pnpm lint`          | Lint the web app                         |
| `pnpm typecheck`     | Type-check all workspace packages        |
| `pnpm test`          | Run all workspace unit tests             |
| `pnpm infra:synth`   | Synthesize the CDK CloudFormation stack  |
| `pnpm infra:diff`    | Show CDK stack diff                      |
| `pnpm infra:deploy`  | Deploy the CDK stack                     |

## Infrastructure

`apps/infrastructure` defines two AWS CDK stacks, deployed per stage
(`dev` / `prod`):

- **WebHostingStack**: static S3 bucket behind CloudFront (HTTPS, URL rewriting
  for extensionless routes, 404 handling). The frontend is uploaded from CI in
  three cache-controlled passes rather than by CDK.
- **TelemetryStack**: a scheduled Lambda that runs telemetry analysis on a daily
  and a weekly cadence via EventBridge Scheduler. The stack deploys a placeholder
  function; the real function code is bundled and pushed via
  `aws lambda update-function-code` in CI. The analysis logic is a placeholder;
  wire it to your chosen event source and storage (e.g. S3 + Athena) when ready.

The `stage` is passed via CDK context (`-c stage=dev|prod`, default `dev`) and
suffixes the stack names, so `dev` and `prod` are isolated deployments.

```bash
cd apps/infrastructure
pnpm cdk bootstrap                 # once per account/region
pnpm synth:dev
pnpm synth:prod
pnpm deploy:dev
pnpm deploy:prod
```

## Deployment

Deploys are manual, run from the **Actions** tab with the `CI` workflow and a
`stage` input (`dev` or `prod`). Each stage is gated by a same-named GitHub
environment (`dev` / `prod`) whose OIDC role ARNs are stored as
`AWS_DEV_ROLE_ARN` and `AWS_PROD_ROLE_ARN`. The deploy pipeline runs
infrastructure first, then function code, then the frontend.
