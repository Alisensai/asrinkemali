/** Server-only switch; request parameters cannot enable recommendation rendering. */
export function areRecommendationsEnabled(environment: Readonly<Record<string, string | undefined>>): boolean {
  return environment.ASRIN_RECOMMENDATIONS === "1";
}
