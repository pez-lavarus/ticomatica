import * as cdk from "aws-cdk-lib";
import { REGION, PROJECT, resolveStage, stageSuffix } from "../src/config";
import { TelemetryStack } from "../src/stacks/telemetry-stack";
import { WebHostingStack } from "../src/stacks/web-hosting-stack";

const app = new cdk.App();

const stage = resolveStage(app.node.tryGetContext("stage"));

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? REGION,
};

cdk.Tags.of(app).add("Project", PROJECT);
cdk.Tags.of(app).add("Environment", stage);

new WebHostingStack(app, `WebHosting${stageSuffix(stage)}`, {
  env,
  stage,
});

new TelemetryStack(app, `Telemetry${stageSuffix(stage)}`, {
  env,
  stage,
});
