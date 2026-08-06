# CRGS Reference Viewer

`@codryn/crgs-viewer` is a read-only browser application for inspecting, validating, and debugging CRGS bundles and generated runtime graphs. It is intended for specification authors and dataset maintainers, not as a character builder or graph editor.

## Architecture

The viewer uses the CRGS packages as its semantic boundary:

```text
CRGS bundle
  -> @codryn/crgs-validator schema validation
  -> @codryn/crgs-core resolution and evaluation
  -> @codryn/crgs-runtime deterministic graph generation
  -> viewer graph adaptation
  -> Cytoscape rendering with ELK directed layouts
```

The viewer does not implement schema validation, requirement semantics, reference resolution, or runtime graph generation. Cytoscape-specific data and layout coordinates remain inside the viewer and never mutate the loaded source document.

## Supported Inputs

- CRGS bundle JSON
- generated CRGS runtime graph JSON
- subject JSON containing `entityIds` and/or `facts`

The Example RPG bundle loads automatically at startup. Use the toolbar to load another local document or reset the application to the example.

Files are processed locally in your browser and are not uploaded. The viewer has no backend, authentication, remote API, or storage requirement.

## Local Development

From the repository root:

```bash
npm install
npm run dev --workspace @codryn/crgs-viewer
```

The development server prints the local URL. The initial screen loads `profiles/example/bundle.json`; no file selection is required.

Other package commands are:

```bash
npm run build --workspace @codryn/crgs-viewer
npm run test --workspace @codryn/crgs-viewer
npm run lint --workspace @codryn/crgs-viewer
```

## Current Limitations

- The bundled schema registry includes core schemas and the Example RPG profile schemas. A local bundle that references schemas not bundled into the application reports missing schema validators; remote schemas are never fetched.
- Path inspection shows one shortest dependency path while preserving the target's complete nested requirement expression alongside it. It is not a planning or rules-advice engine.
- The viewer is designed for several hundred nodes, not very large datasets.
- Source documents, graph coordinates, and preferences are not persisted.
- Editing, exporting, hosted collaboration, and game-specific presentation are intentionally excluded.
