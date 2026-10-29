export function niceTicks(min: number, max: number, targetCount = 8): number[] {
  if (min === max) return [min];
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];

  const range = Math.abs(max - min);
  const rawStep = range / Math.max(1, targetCount);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let step: number;
  if (normalized < 1.5) step = 1;
  else if (normalized < 3) step = 2;
  else if (normalized < 7) step = 5;
  else step = 10;
  step *= magnitude;

  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  const epsilon = step * 1e-9;
  for (let value = start; value <= max + epsilon; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }
  return ticks;
}

export function niceStep(min: number, max: number, targetCount = 8): number {
  if (min === max) return 1;
  const rawStep = Math.abs(max - min) / Math.max(1, targetCount);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let step: number;
  if (normalized < 1.5) step = 1;
  else if (normalized < 3) step = 2;
  else if (normalized < 7) step = 5;
  else step = 10;
  return step * magnitude;
}