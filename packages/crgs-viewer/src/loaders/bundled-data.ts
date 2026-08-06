import exampleBundle from "../../../../profiles/example/bundle.json";
import exampleSubject from "../../../../examples/characters/example-hero.json";
import type { Bundle } from "@codryn/crgs-core";
import type { SubjectDocument } from "../types";

const schemaModules = import.meta.glob(
  [
    "../../../../schemas/**/*.json",
    "../../../../profiles/example/schemas/**/*.json"
  ],
  { eager: true, import: "default" }
) as Record<string, unknown>;

export const bundledSchemas = Object.values(schemaModules);
export const bundledExample = exampleBundle as Bundle;
export const bundledSubject = exampleSubject as SubjectDocument;
