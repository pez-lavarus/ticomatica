import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import { CfnSchedule } from "aws-cdk-lib/aws-scheduler";

export class TelemetryStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const logGroup = new logs.LogGroup(this, "TelemetryAnalysisLogGroup", {
      retention: logs.RetentionDays.ONE_MONTH,
    });

    const analysisFunction = new NodejsFunction(this, "TelemetryAnalysisFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: "lib/lambda/telemetry-analysis.ts",
      handler: "handler",
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      logGroup,
    });

    const schedulerRole = new iam.Role(this, "SchedulerRole", {
      assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
    });

    analysisFunction.grantInvoke(schedulerRole);

    new CfnSchedule(this, "DailyAnalysisSchedule", {
      flexibleTimeWindow: { mode: "OFF" },
      scheduleExpression: "cron(0 6 * * ? *)",
      scheduleExpressionTimezone: "UTC",
      target: {
        arn: analysisFunction.functionArn,
        roleArn: schedulerRole.roleArn,
        input: JSON.stringify({ analysis: "daily" }),
      },
    });

    new CfnSchedule(this, "WeeklyAnalysisSchedule", {
      flexibleTimeWindow: { mode: "OFF" },
      scheduleExpression: "cron(0 6 ? * MON *)",
      scheduleExpressionTimezone: "UTC",
      target: {
        arn: analysisFunction.functionArn,
        roleArn: schedulerRole.roleArn,
        input: JSON.stringify({ analysis: "weekly" }),
      },
    });

    new cdk.CfnOutput(this, "AnalysisFunctionName", {
      value: analysisFunction.functionName,
    });
  }
}
