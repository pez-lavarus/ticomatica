export const PROJECT = "ticomatica";
export const REGION = "us-east-1";

export type Stage = "dev" | "staging" | "prod";

const STAGE_SUFFIX: Record<Stage, string> = {
  dev: "Dev",
  staging: "Staging",
  prod: "Prod",
};

export function resolveStage(input: string | undefined): Stage {
  switch (input) {
    case "prod":
    case "production":
      return "prod";
    case "staging":
      return "staging";
    default:
      return "dev";
  }
}

export function stageSuffix(stage: Stage): string {
  return STAGE_SUFFIX[stage];
}

export function resourcePrefix(stage: Stage): string {
  return `${PROJECT}-${stage}`;
}
