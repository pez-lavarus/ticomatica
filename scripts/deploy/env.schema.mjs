export const envSchema = [
  {
    name: "REGION",
    description: "Default AWS region for infrastructure and deployments.",
    example: "us-east-1",
    required: "always",
    secret: false,
  },
  {
    name: "AWS_DEV_ROLE_ARN",
    description: "OIDC role ARN assumed by CI to deploy the dev stage.",
    example: "arn:aws:iam::123456789012:role/github-actions-dev",
    required: "optional",
    secret: true,
  },
  {
    name: "AWS_PROD_ROLE_ARN",
    description: "OIDC role ARN assumed by CI to deploy the prod stage.",
    example: "arn:aws:iam::123456789012:role/github-actions-prod",
    required: "prod-only",
    secret: true,
  },
];
