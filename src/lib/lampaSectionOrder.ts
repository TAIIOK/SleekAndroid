/** Keep Lampa rails in the enabled-endpoint order from home settings (site LampaKindSections). */
export function orderLampaSectionsByEndpoints<T extends { endpoint: string }>(
  sections: T[],
  endpoints: string[],
): T[] {
  const byEndpoint = new Map(sections.map((section) => [section.endpoint, section]));
  return endpoints
    .map((endpoint) => byEndpoint.get(endpoint))
    .filter((section): section is T => Boolean(section));
}
