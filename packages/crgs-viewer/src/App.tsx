import { useMemo, useRef, useState } from "react";
import type { Entity } from "@codryn/crgs-core";
import type { RuntimeGraph } from "@codryn/crgs-runtime";
import { bundledExample, bundledSchemas } from "./loaders/bundled-data";
import {
  availableLanguages,
  buildEntitySummaries,
  evaluateEntity,
  filterEntities,
  findDependencyPath,
  loadViewerDocument,
  parseJsonDocument
} from "./services/viewer-service";
import type {
  Diagnostic,
  EvaluationState,
  LayoutName,
  PathResult,
  SubjectDocument
} from "./types";
import { DiagnosticsPanel } from "./components/DiagnosticsPanel";
import { EntityBrowser } from "./components/EntityBrowser";
import { EntityInspector } from "./components/EntityInspector";
import { EntityTable } from "./components/EntityTable";
import { EvaluationPanel } from "./components/EvaluationPanel";
import { GraphCanvas, type GraphCanvasHandle } from "./components/GraphCanvas";
import { RawJsonView } from "./components/RawJsonView";
import { RequirementTree } from "./components/RequirementTree";
import { Toolbar } from "./components/Toolbar";

type MainView = "graph" | "entities" | "requirements" | "diagnostics" | "raw";
type BottomView = "diagnostics" | "evaluation" | "path";

export default function App() {
  const [language, setLanguage] = useState("en");
  const [document, setDocument] = useState(() =>
    loadViewerDocument(bundledExample, bundledSchemas)
  );
  const [subject, setSubject] = useState<SubjectDocument>();
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [namespaceFilter, setNamespaceFilter] = useState("");
  const [flags, setFlags] = useState(new Set<string>());
  const [layout, setLayout] = useState<LayoutName>("hierarchical");
  const [mainView, setMainView] = useState<MainView>("graph");
  const [bottomView, setBottomView] = useState<BottomView>("diagnostics");
  const [evaluation, setEvaluation] = useState<EvaluationState>();
  const [pathStart, setPathStart] = useState("");
  const [path, setPath] = useState<PathResult>();
  const [notice, setNotice] = useState("Example RPG bundle loaded.");
  const graphRef = useRef<GraphCanvasHandle>(null);
  const summaries = useMemo(
    () => buildEntitySummaries(document, language),
    [document, language]
  );
  const filtered = useMemo(
    () =>
      filterEntities(summaries, {
        search,
        type: typeFilter,
        namespace: namespaceFilter,
        flags
      }),
    [summaries, search, typeFilter, namespaceFilter, flags]
  );
  const selectedEntity = document.bundle.entities.find(
    (entity) => entity.id === selectedId
  );
  const selectedNode = document.graph.nodes.find(
    (node) => node.id === selectedId
  );
  const selectedEdge = document.graph.edges.find(
    (edge) => edge.id === selectedEdgeId
  );
  const allTypes = [
    ...new Set(summaries.map((summary) => summary.entity.type))
  ].sort();
  const allNamespaces = [
    ...new Set(summaries.map((summary) => summary.namespace))
  ].sort();
  const evaluationIds =
    evaluation?.result.missing.flatMap((item) =>
      item.entityId ? [item.entityId] : []
    ) ?? [];

  function selectEntity(id: string) {
    setSelectedId(id);
    setSelectedEdgeId(undefined);
    setEvaluation(undefined);
    setMainView((current) =>
      current === "diagnostics" || current === "raw" ? "graph" : current
    );
    requestAnimationFrame(() => graphRef.current?.center(id));
  }

  function clearSelection() {
    setSelectedId(undefined);
    setSelectedEdgeId(undefined);
    setEvaluation(undefined);
    setPath(undefined);
  }

  async function loadFile(kind: "bundle" | "graph" | "subject", file: File) {
    try {
      const input = parseJsonDocument(await file.text());
      if (kind === "bundle") {
        const next = loadViewerDocument(input, bundledSchemas, language);
        setDocument(next);
        clearSelection();
        setNotice(
          `${file.name} loaded with ${next.diagnostics.length} diagnostic(s).`
        );
      } else if (kind === "graph") {
        if (!isRuntimeGraph(input))
          throw new Error("The selected file is not a generated CRGS graph.");
        const next = loadViewerDocument(
          document.bundle,
          bundledSchemas,
          language,
          input
        );
        setDocument(next);
        clearSelection();
        setNotice(`${file.name} graph loaded.`);
      } else {
        if (!isSubject(input))
          throw new Error("The selected file is not a CRGS subject document.");
        setSubject(input);
        setEvaluation(undefined);
        setBottomView("evaluation");
        setNotice(`${file.name} subject loaded.`);
      }
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "File loading failed."
      );
    }
  }

  function reset() {
    setLanguage("en");
    setDocument(loadViewerDocument(bundledExample, bundledSchemas));
    setSubject(undefined);
    clearSelection();
    setSearch("");
    setFlags(new Set());
    setNotice("Example RPG bundle restored.");
  }
  function switchLanguage(next: string) {
    setLanguage(next);
    setDocument(loadViewerDocument(document.bundle, bundledSchemas, next));
  }
  function toggleFlag(flag: string) {
    setFlags((current) => {
      const next = new Set(current);
      if (next.has(flag)) next.delete(flag);
      else next.add(flag);
      return next;
    });
  }
  function runEvaluation() {
    if (!selectedEntity || !subject) return;
    setEvaluation({
      entityId: selectedEntity.id,
      result: evaluateEntity(document.bundle, selectedEntity, subject)
    });
    setBottomView("evaluation");
  }
  function inspectDiagnostic(diagnostic: Diagnostic) {
    if (diagnostic.entityId) selectEntity(diagnostic.entityId);
    else if (diagnostic.elementId) {
      setSelectedEdgeId(diagnostic.elementId);
      setSelectedId(undefined);
    }
  }
  function runPath() {
    if (!pathStart || !selectedId) return;
    setPath(findDependencyPath(document.graph, pathStart, selectedId));
    setBottomView("path");
  }

  return (
    <div className="app-shell">
      <Toolbar
        title={document.bundle.manifest.title}
        version={document.bundle.manifest.datasetVersion}
        specVersion={document.bundle.specVersion}
        valid={document.validationValid}
        search={search}
        layout={layout}
        language={language}
        languages={availableLanguages(document.bundle)}
        onSearch={setSearch}
        onLayout={setLayout}
        onLanguage={switchLanguage}
        onLoad={loadFile}
        onReset={reset}
        onFit={() => graphRef.current?.fit()}
        onClear={clearSelection}
      />
      <nav className="view-tabs" aria-label="Data views">
        {(
          [
            "graph",
            "entities",
            "requirements",
            "diagnostics",
            "raw"
          ] as MainView[]
        ).map((view) => (
          <button
            key={view}
            className={mainView === view ? "active" : ""}
            onClick={() => setMainView(view)}
          >
            {view === "raw" ? "Raw bundle" : capitalize(view)}
          </button>
        ))}
      </nav>
      <main className="workspace">
        <EntityBrowser
          entities={filtered}
          selectedId={selectedId}
          type={typeFilter}
          namespace={namespaceFilter}
          flags={flags}
          allTypes={allTypes}
          allNamespaces={allNamespaces}
          onType={setTypeFilter}
          onNamespace={setNamespaceFilter}
          onFlag={toggleFlag}
          onSelect={selectEntity}
        />
        <section className="main-view panel">
          {mainView === "graph" && (
            <>
              <GraphCanvas
                ref={graphRef}
                graph={document.graph}
                layout={layout}
                selectedId={selectedId}
                selectedEdgeId={selectedEdgeId}
                pathNodeIds={path?.nodeIds ?? []}
                pathEdgeIds={path?.edgeIds ?? []}
                evaluationIds={evaluationIds}
                onSelectNode={selectEntity}
                onSelectEdge={(id) => {
                  setSelectedEdgeId(id);
                  setSelectedId(undefined);
                }}
                onClear={clearSelection}
              />
              <div className="legend">
                <span>
                  <i className="entity-dot" />
                  Entity
                </span>
                <span>
                  <i className="virtual-dot" />
                  Virtual requirement
                </span>
                <span>
                  <i className="invalid-dot" />
                  Invalid / cycle
                </span>
                <span>
                  <i className="edge-line" />
                  Prerequisite
                </span>
                <span>
                  <i className="relation-line" />
                  Relationship
                </span>
              </div>
            </>
          )}
          {mainView === "entities" && (
            <EntityTable
              entities={filtered}
              selectedId={selectedId}
              onSelect={selectEntity}
            />
          )}
          {mainView === "requirements" && (
            <div className="requirements-overview">
              <h2>Requirement expressions</h2>
              {filtered
                .filter((summary) => summary.entity.requirements)
                .map((summary) => (
                  <article
                    key={summary.entity.id}
                    className={
                      selectedId === summary.entity.id ? "selected-article" : ""
                    }
                  >
                    <button
                      className="link-button"
                      onClick={() => selectEntity(summary.entity.id)}
                    >
                      <strong>{summary.label}</strong>{" "}
                      <code>{summary.entity.id}</code>
                    </button>
                    <RequirementTree
                      expression={summary.entity.requirements!}
                      onSelect={selectEntity}
                    />
                  </article>
                ))}
            </div>
          )}
          {mainView === "diagnostics" && (
            <DiagnosticsPanel
              diagnostics={document.diagnostics}
              onSelect={inspectDiagnostic}
            />
          )}
          {mainView === "raw" && (
            <div className="raw-bundle">
              <h2>Raw bundle</h2>
              <RawJsonView value={document.bundle} title="Bundle JSON" />
            </div>
          )}
        </section>
        <EntityInspector
          bundle={document.bundle}
          graph={document.graph}
          entity={selectedEntity}
          node={selectedNode}
          edge={selectedEdge}
          language={language}
          onSelect={selectEntity}
        />
      </main>
      <section className="bottom-panel panel">
        <div className="bottom-tabs">
          {(["diagnostics", "evaluation", "path"] as BottomView[]).map(
            (view) => (
              <button
                key={view}
                className={bottomView === view ? "active" : ""}
                onClick={() => setBottomView(view)}
              >
                {capitalize(view)}
                {view === "diagnostics" && ` (${document.diagnostics.length})`}
              </button>
            )
          )}
        </div>
        {bottomView === "diagnostics" && (
          <DiagnosticsPanel
            diagnostics={document.diagnostics}
            onSelect={inspectDiagnostic}
          />
        )}
        {bottomView === "evaluation" && (
          <EvaluationPanel
            entity={selectedEntity}
            subject={subject}
            evaluation={evaluation}
            onEvaluate={runEvaluation}
            onSelect={selectEntity}
          />
        )}
        {bottomView === "path" && (
          <PathPanel
            entities={document.bundle.entities}
            start={pathStart}
            target={selectedEntity}
            path={path}
            subject={subject}
            onStart={setPathStart}
            onRun={runPath}
            onSelect={selectEntity}
          />
        )}
      </section>
      <p className="privacy">
        Files are processed locally in your browser and are not uploaded.
      </p>
      <div className="sr-only" aria-live="polite">
        {notice}
      </div>
      <div className="toast" aria-hidden="true">
        {notice}
      </div>
    </div>
  );
}

function PathPanel({
  entities,
  start,
  target,
  path,
  subject,
  onStart,
  onRun,
  onSelect
}: {
  entities: Entity[];
  start: string;
  target?: Entity;
  path?: PathResult;
  subject?: SubjectDocument;
  onStart(id: string): void;
  onRun(): void;
  onSelect(id: string): void;
}) {
  const owned = new Set(subject?.entityIds ?? []);
  return (
    <section className="diagnostic-content">
      <div className="diagnostic-header">
        <div>
          <span className="eyebrow">Dependency traversal</span>
          <h2>Path inspector</h2>
        </div>
        <div className="path-controls">
          <label>
            Start
            <select
              value={start}
              onChange={(event) => onStart(event.target.value)}
            >
              <option value="">Select start</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.label.default}
                </option>
              ))}
            </select>
          </label>
          <span>→</span>
          <strong>{target?.label.default ?? "Select a target"}</strong>
          <button
            className="primary-button"
            disabled={!start || !target}
            onClick={onRun}
          >
            Find path
          </button>
        </div>
      </div>
      {path &&
        (path.found ? (
          <>
            <ol className="path-list">
              {path.nodeIds.map((id) => (
                <li key={id}>
                  <button className="link-button" onClick={() => onSelect(id)}>
                    {id}
                  </button>
                  <span className={owned.has(id) ? "satisfied" : "missing"}>
                    {owned.has(id) ? "Already satisfied" : "Required branch"}
                  </span>
                </li>
              ))}
            </ol>
            {target?.requirements && (
              <div className="branch-view">
                <div className="branch-legend">
                  <span>Required branch: all</span>
                  <span>Alternative branch: any</span>
                  <span>Already satisfied / missing shown above</span>
                </div>
                <RequirementTree
                  expression={target.requirements}
                  onSelect={onSelect}
                />
              </div>
            )}
          </>
        ) : (
          <p>
            No dependency path connects the selected entities. Explicit
            relationship edges are not treated as prerequisites.
          </p>
        ))}
    </section>
  );
}

function isRuntimeGraph(value: unknown): value is RuntimeGraph {
  if (!value || typeof value !== "object") return false;
  const graph = value as Partial<RuntimeGraph>;
  return (
    Array.isArray(graph.nodes) &&
    Array.isArray(graph.edges) &&
    Array.isArray(graph.cycles)
  );
}
function isSubject(value: unknown): value is SubjectDocument {
  if (!value || typeof value !== "object") return false;
  const subject = value as SubjectDocument;
  return (
    (subject.entityIds === undefined || Array.isArray(subject.entityIds)) &&
    (subject.facts === undefined || typeof subject.facts === "object")
  );
}
function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}
