/** Server-only rollout guard. A URL parameter can never enable V2. */
export function isSearchV2Enabled(environment: Readonly<Record<string, string | undefined>>): boolean {
  return environment.ASRIN_SEARCH_V2 === "1";
}
