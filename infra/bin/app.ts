import * as cdk from "aws-cdk-lib";
import * as path from "path";
import { TelemetryStack } from "../lib/telemetry-stack";
import { WebHostingStack } from "../lib/web-hosting-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

new WebHostingStack(app, "WebHostingStack", {
  env,
  websiteDistPath: path.join(__dirname, "..", "..", "apps", "web", "out"),
});

new TelemetryStack(app, "TelemetryStack", {
  env,
});
