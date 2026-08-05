export interface ValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function createUnimplementedResult(surface: string): ValidationResult {
  return {
    valid: false,
    issues: [
      {
        path: "/",
        message: `${surface} validation is not implemented in the package scaffold yet. Use the repository toolchain instead.`,
        severity: "warning"
      }
    ]
  };
}
