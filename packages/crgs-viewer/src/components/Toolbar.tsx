import { Crosshair, FileJson, RotateCcw, Search, X } from "lucide-react";
import type { ChangeEvent } from "react";
import type { LayoutName } from "../types";

interface ToolbarProps {
  title: string;
  version: string;
  specVersion: string;
  valid: boolean;
  search: string;
  layout: LayoutName;
  language: string;
  languages: string[];
  onSearch(value: string): void;
  onLayout(value: LayoutName): void;
  onLanguage(value: string): void;
  onLoad(kind: "bundle" | "graph" | "subject", file: File): void;
  onReset(): void;
  onFit(): void;
  onClear(): void;
}

export function Toolbar(props: ToolbarProps) {
  const fileHandler =
    (kind: "bundle" | "graph" | "subject") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) props.onLoad(kind, file);
      event.target.value = "";
    };
  return (
    <header className="toolbar">
      <div className="brand-block">
        <span className="brand-mark">CRGS</span>
        <div>
          <strong>{props.title}</strong>
          <span>
            Bundle {props.version} · Spec {props.specVersion}
          </span>
        </div>
      </div>
      <label className="search-control">
        <Search size={16} />
        <span className="sr-only">Search entities</span>
        <input
          value={props.search}
          onChange={(event) => props.onSearch(event.target.value)}
          placeholder="Search entities"
        />
      </label>
      <div className="toolbar-controls">
        {(["bundle", "graph", "subject"] as const).map((kind) => (
          <label className="icon-text-button" key={kind} title={`Load ${kind}`}>
            <FileJson size={15} />
            Load {kind}
            <input
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={fileHandler(kind)}
            />
          </label>
        ))}
        <button title="Reset to example" onClick={props.onReset}>
          <RotateCcw size={16} />
          <span className="sr-only">Reset to example</span>
        </button>
        <select
          aria-label="Graph layout"
          value={props.layout}
          onChange={(event) => props.onLayout(event.target.value as LayoutName)}
        >
          <option value="hierarchical">Top to bottom</option>
          <option value="left-right">Left to right</option>
          <option value="compact">Compact</option>
          <option value="concentric">Concentric</option>
        </select>
        <select
          aria-label="Entity language"
          value={props.language}
          onChange={(event) => props.onLanguage(event.target.value)}
        >
          {props.languages.map((language) => (
            <option key={language}>{language}</option>
          ))}
        </select>
        <button title="Fit graph" onClick={props.onFit}>
          <Crosshair size={16} />
          <span className="sr-only">Fit graph</span>
        </button>
        <button title="Clear selection" onClick={props.onClear}>
          <X size={16} />
          <span className="sr-only">Clear selection</span>
        </button>
        <span className={`status-pill ${props.valid ? "valid" : "invalid"}`}>
          {props.valid ? "Valid" : "Issues"}
        </span>
      </div>
    </header>
  );
}
