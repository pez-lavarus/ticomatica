import * as cdk from "aws-cdk-lib";
import * as path from "path";
import { TelemetryStack } from "../lib/telemetry-stack";
import { WebHostingStack } from "../lib/web-hosting-stack";

const app = new cdk.App();

const stage = app.node.tryGetContext("stage") ?? "dev";

if (stage !== "dev" && stage !== "prod") {
  throw new Error(`Unknown stage "${stage}". Expected "dev" or "prod".`);
}

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const stackProps: cdk.StackProps = {
  env,
  tags: { stage },
};

new WebHostingStack(app, `WebHostingStack-${stage}`, {
  ...stackProps,
  websiteDistPath: path.join(__dirname, "..", "..", "apps", "web", "out"),
});

new TelemetryStack(app, `TelemetryStack-${stage}`, stackProps);
