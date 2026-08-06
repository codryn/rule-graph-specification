# Requirements

The profile keeps prerequisite composition on CRGS core requirement groups.

- `group/all` models conjunctive feat prerequisites
- `group/any` is reserved for PF1e cases with alternate prerequisite paths
- `crgs.requirement.entity` models feat-to-feat dependencies
- core `fact` predicates model numeric thresholds such as ability scores, BAB, and class level

The profile also ships named requirement schemas for future profile-aware validation surfaces, even though the initial reference bundle prefers the existing CRGS core fact and entity requirement forms.
