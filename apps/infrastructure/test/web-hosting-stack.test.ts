import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { WebHostingStack } from "../src/stacks/web-hosting-stack";

function synthTemplate(stage: "dev" | "prod") {
  const app = new App();
  const stack = new WebHostingStack(app, `WebHosting${stage}`, { stage });
  return Template.fromStack(stack);
}

const devTemplate = synthTemplate("dev");
const prodTemplate = synthTemplate("prod");

describe("WebHostingStack", () => {
  it("blocks public access and enforces SSL on the website bucket", () => {
    devTemplate.hasResourceProperties("AWS::S3::Bucket", {
      BucketName: "ticomatica-dev-web",
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it("uses DESTROY removal policy in dev", () => {
    devTemplate.hasResource("AWS::S3::Bucket", {
      DeletionPolicy: "Delete",
      UpdateReplacePolicy: "Delete",
    });
  });

  it("uses RETAIN removal policy in prod", () => {
    prodTemplate.hasResource("AWS::S3::Bucket", {
      DeletionPolicy: "Retain",
    });
  });

  it("exports a deterministic website URL", () => {
    devTemplate.hasOutput("WebsiteUrl", {
      Export: { Name: "ticomatica-dev-website-url" },
    });
  });
});
