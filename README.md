# Examen Matemáticas

A pnpm monorepo for the Ticomatica web app and its AWS infrastructure (static hosting + telemetry).

## Structure

```
examen-matematicas/
├── apps/
│   └── web/        Next.js 16 assessment app (@ticomatica/web)
└── infra/          AWS CDK stacks: web hosting + telemetry (@ticomatica/infra)
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
| `pnpm build`         | Build the web app for production         |
| `pnpm lint`          | Lint the web app                         |
| `pnpm typecheck`     | Type-check web and infra packages        |
| `pnpm test`          | Run web unit tests                       |
| `pnpm infra:synth`   | Synthesize the CDK CloudFormation stack  |
| `pnpm infra:diff`    | Show CDK stack diff                      |
| `pnpm infra:deploy`  | Deploy the CDK stack                     |

## Infrastructure

`infra/` defines two AWS CDK stacks:

- **WebHostingStack**: static S3 bucket behind CloudFront (HTTPS, URL rewriting
  for extensionless routes, 404 handling).
- **TelemetryStack**: a scheduled Lambda that runs telemetry analysis on a daily
  and a weekly cadence via EventBridge Scheduler. The analysis logic is a
  placeholder; wire it to your chosen event source and storage (e.g. S3 +
  Athena) when ready.

Deployment is handled by the `deploy` job in `.github/workflows/ci.yml` on
pushes to `main`, using GitHub OIDC to assume an AWS role.

```bash
cd infra
pnpm cdk bootstrap   # once per account/region
pnpm cdk synth
pnpm cdk deploy --all
```
