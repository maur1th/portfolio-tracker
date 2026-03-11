import { readFileSync } from "fs";
import { join } from "path";

export interface TargetConfig {
  geography: Record<string, number>;
  marketCap: Record<string, number>;
}

export function loadTargets(): TargetConfig {
  const filePath = join(process.cwd(), "config", "targets.json");
  const raw = JSON.parse(readFileSync(filePath, "utf-8"));

  const geography: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw.geography ?? {})) {
    if (typeof value !== "number" || value < 0) {
      throw new Error(`Invalid geography target for "${key}": ${value}`);
    }
    geography[key] = value;
  }

  const marketCap: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw.marketCap ?? {})) {
    if (typeof value !== "number" || value < 0) {
      throw new Error(`Invalid marketCap target for "${key}": ${value}`);
    }
    marketCap[key] = value;
  }

  return { geography, marketCap };
}
