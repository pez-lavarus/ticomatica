import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { resourcePrefix, type Stage } from "../config";

export interface WebHostingStackProps extends cdk.StackProps {
  readonly stage: Stage;
}

export class WebHostingStack extends cdk.Stack {
  public readonly websiteBucket: s3.IBucket;
  public readonly distribution: cloudfront.IDistribution;

  constructor(scope: cdk.App, id: string, props: WebHostingStackProps) {
    super(scope, id, props);

    const prefix = resourcePrefix(props.stage);
    const isProd = props.stage === "prod";

    this.websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
      bucketName: `${prefix}-web`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
    });

    const urlRewriteFunction = new cloudfront.Function(this, "UrlRewriteFunction", {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    request.uri = uri + '.html';
  }
  return request;
}
`),
    });

    this.distribution = new cloudfront.Distribution(this, "WebsiteDistribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [
          {
            function: urlRewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
        },
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    new cdk.CfnOutput(this, "WebsiteUrl", {
      value: `https://${this.distribution.distributionDomainName}`,
      exportName: `${prefix}-website-url`,
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: this.distribution.distributionId,
      exportName: `${prefix}-distribution-id`,
    });

    new cdk.CfnOutput(this, "WebsiteBucketName", {
      value: this.websiteBucket.bucketName,
      exportName: `${prefix}-website-bucket`,
    });
  }
}
