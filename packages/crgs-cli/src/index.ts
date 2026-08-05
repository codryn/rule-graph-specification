export interface CliCommandDescriptor {
  name: string;
  summary: string;
}

export const plannedCommands: CliCommandDescriptor[] = [
  {
    name: "validate",
    summary:
      "Validate CRGS bundles and profiles against core and profile schemas."
  },
  {
    name: "bundle",
    summary:
      "Bundle split schema assets for distribution and downstream tooling."
  },
  {
    name: "inspect",
    summary: "Inspect bundle structure and report profile dependencies."
  }
];
