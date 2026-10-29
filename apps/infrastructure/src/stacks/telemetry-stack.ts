import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { CfnSchedule } from "aws-cdk-lib/aws-scheduler";
import { resourcePrefix, type Stage } from "../config";

export interface TelemetryStackProps extends cdk.StackProps {
  readonly stage: Stage;
}

export class TelemetryStack extends cdk.Stack {
  public readonly analysisFunction: lambda.IFunction;

  constructor(scope: cdk.App, id: string, props: TelemetryStackProps) {
    super(scope, id, props);

    const prefix = resourcePrefix(props.stage);

    const logGroup = new logs.LogGroup(this, "TelemetryAnalysisLogGroup", {
      retention: logs.RetentionDays.ONE_MONTH,
    });

    this.analysisFunction = new lambda.Function(this, "TelemetryAnalysisFunction", {
      functionName: `${prefix}-telemetry-analysis`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromInline("exports.handler = async () => {};"),
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      logGroup,
      tracing: lambda.Tracing.ACTIVE,
      reservedConcurrentExecutions: props.stage === "prod" ? 1 : undefined,
    });

    const schedulerRole = new iam.Role(this, "SchedulerRole", {
      assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
    });

    this.analysisFunction.grantInvoke(schedulerRole);

    new CfnSchedule(this, "DailyAnalysisSchedule", {
      flexibleTimeWindow: { mode: "OFF" },
      scheduleExpression: "cron(0 6 * * ? *)",
      scheduleExpressionTimezone: "UTC",
      target: {
        arn: this.analysisFunction.functionArn,
        roleArn: schedulerRole.roleArn,
        input: JSON.stringify({ analysis: "daily" }),
      },
    });

    new CfnSchedule(this, "WeeklyAnalysisSchedule", {
      flexibleTimeWindow: { mode: "OFF" },
      scheduleExpression: "cron(0 6 ? * MON *)",
      scheduleExpressionTimezone: "UTC",
      target: {
        arn: this.analysisFunction.functionArn,
        roleArn: schedulerRole.roleArn,
        input: JSON.stringify({ analysis: "weekly" }),
      },
    });

    new cdk.CfnOutput(this, "AnalysisFunctionName", {
      value: this.analysisFunction.functionName,
      exportName: `${prefix}-analysis-function-name`,
    });
  }
}
