interface AnalysisEvent {
  analysis?: "daily" | "weekly";
}

export const handler = async (event: AnalysisEvent): Promise<void> => {
  const kind = event.analysis ?? "daily";
  console.log(`Running ${kind} telemetry analysis`);
};
