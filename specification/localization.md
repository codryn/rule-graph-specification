# Localization

## Rationale

Human-readable labels and descriptions should be localizable without changing the structural identity of graph data.

## Definition

`LocalizedText` contains a required `default` string and optional locale-specific `translations`.

## Example

```json
{
  "default": "Human",
  "translations": {
    "fr": "Humain"
  }
}
```

## Extension Points

- additional locales
- profile conventions for fallback behavior
- future support for richer localized content models

## Validation Rules

- `default` is required and non-empty
- translation keys must resemble language tags
- translations are supplemental and must not replace the required default value
