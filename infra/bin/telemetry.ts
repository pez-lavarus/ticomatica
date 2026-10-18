import * as cdk from "aws-cdk-lib";
import { TelemetryStack } from "../lib/telemetry-stack";

const app = new cdk.App();

new TelemetryStack(app, "TelemetryStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
