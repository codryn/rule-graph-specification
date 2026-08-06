export function RawJsonView({
  value,
  title = "Raw JSON"
}: {
  value: unknown;
  title?: string;
}) {
  return (
    <details className="raw-json">
      <summary>{title}</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}
