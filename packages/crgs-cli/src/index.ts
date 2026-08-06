#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020Module, { type ErrorObject } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import {
  BundleResolutionError,
  evaluate,
  resolveBundle,
  type Bundle,
  type EvaluationContext,
  type Profile,
  type ResolverIssue
} from "@codryn/crgs-core";
import {
  buildRuntimeGraph,
  type RuntimeGraph,
  type VirtualThresholdRuntimeNode
} from "@codryn/crgs-runtime";
import {
  getDefaultSchemaRoots,
  validateBundleDocument,
  type ValidationIssue
} from "@codryn/crgs-validator";

export interface CliCommandDescriptor {
  name: string;
  summary: string;
}

export interface CliValidationIssue {
  code: string;
  path: string;
  message: string;
  reference?: string;
  keyword?: string;
}

export interface CliValidationReport {
  path: string;
  kind: "bundle" | "profile";
  valid: boolean;
  issues: CliValidationIssue[];
}

export interface CharacterSubject {
  entityIds?: string[];
  facts?: Record<string, string | number | boolean>;
}

type SchemaValidator = ((value: unknown) => boolean) & {
  errors?: ErrorObject[];
};

interface AjvLike {
  addSchema(schema: unknown, key?: string): AjvLike;
  getSchema(key: string): SchemaValidator | undefined;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..", "..");
const schemaDir = join(repoRoot, "schemas");
const schemaRoots = getDefaultSchemaRoots(repoRoot);
const packageJsonPath = join(repoRoot, "packages", "crgs-cli", "package.json");
const profileSchemaId =
  "https://schemas.codryn.com/crgs/v0.2/profile/profile.schema.json";
const Ajv2020 = Ajv2020Module as unknown as new (options: {
  allErrors: boolean;
  strict: boolean;
  allowUnionTypes: boolean;
}) => AjvLike;
const addFormats = addFormatsModule as unknown as (instance: AjvLike) => void;
const cliVersion = readVersion();

export const commands: CliCommandDescriptor[] = [
  {
    name: "validate",
    summary:
      "Validate CRGS bundles and profiles against schemas and reference rules."
  },
  {
    name: "build",
    summary: "Validate a bundle input and write a normalized bundle artifact."
  },
  {
    name: "graph",
    summary:
      "Build a deterministic runtime graph artifact from a validated bundle."
  },
  {
    name: "evaluate",
    summary:
      "Evaluate a target entity against a character subject and report missing prerequisites."
  }
];

const ajv = createAjv();

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  if (command === undefined) {
    printHelp();
    return 1;
  }

  if (command === "--help" || command === "-h" || command === "help") {
    printHelp();
    return 0;
  }

  if (command === "--version" || command === "-v" || command === "version") {
    writeLine(cliVersion);
    return 0;
  }

  switch (command) {
    case "validate":
      return runValidateCommand(rest);
    case "build":
      return runBuildCommand(rest);
    case "graph":
      return runGraphCommand(rest);
    case "evaluate":
      return runEvaluateCommand(rest);
    default:
      writeLine(`Unknown command: ${command}`, true);
      writeLine("Run 'crgs --help' to see available commands.", true);
      return 1;
  }
}

async function runValidateCommand(args: string[]): Promise<number> {
  if (args.includes("--repo") || args.includes("--workspace")) {
    return runRepositoryValidation();
  }

  const input = args[0];
  if (!input) {
    console.error("Usage: crgs validate <path>");
    console.error("       crgs validate --repo");
    return 1;
  }

  const reports = validatePath(resolvePath(input));
  const valid = reports.every((report) => report.valid);
  writeJsonToStdout({ valid, reports });

  return valid ? 0 : 1;
}

function runRepositoryValidation(): number {
  const result = runCommand("npm", ["run", "validate:repo"], repoRoot);

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

function runCommand(command: string, args: string[], cwd: string) {
  if (process.platform === "win32") {
    return spawnSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/s", "/c", quoteForCmd([command, ...args])],
      {
        cwd,
        stdio: "inherit"
      }
    );
  }

  return spawnSync(command, args, {
    cwd,
    stdio: "inherit"
  });
}

function quoteForCmd(parts: string[]): string {
  return parts
    .map((part) =>
      /[\s"&|<>^()]/.test(part) ? `"${part.replace(/(["\\])/g, "\\$1")}"` : part
    )
    .join(" ");
}

async function runBuildCommand(args: string[]): Promise<number> {
  const input = args[0];
  const output = readOption(args.slice(1), "--output");

  if (!input || !output) {
    console.error("Usage: crgs build <path> --output <file>");
    return 1;
  }

  const bundlePath = resolveBundleInputPath(resolvePath(input));
  const bundle = loadBundle(bundlePath);
  validateBundleOrThrow(bundle);

  writeJsonFile(resolvePath(output), bundle);
  writeJsonToStdout({
    valid: true,
    input: bundlePath,
    output: resolvePath(output)
  });

  return 0;
}

async function runGraphCommand(args: string[]): Promise<number> {
  const input = args[0];
  const output = readOption(args.slice(1), "--output");

  if (!input || !output) {
    console.error("Usage: crgs graph <bundle> --output <file>");
    return 1;
  }

  const bundlePath = resolveBundleInputPath(resolvePath(input));
  const bundle = loadBundle(bundlePath);
  const resolved = validateBundleOrThrow(bundle);
  const graph = buildRuntimeGraph(resolved);

  writeJsonFile(resolvePath(output), graph);
  writeJsonToStdout({
    valid: graph.cycles.length === 0,
    input: bundlePath,
    output: resolvePath(output),
    cycles: graph.cycles
  });

  return graph.cycles.length === 0 ? 0 : 1;
}

async function runEvaluateCommand(args: string[]): Promise<number> {
  const bundleArg = readOption(args, "--bundle");
  const subjectArg = readOption(args, "--subject");
  const targetId = readOption(args, "--target");

  if (!bundleArg || !subjectArg || !targetId) {
    console.error(
      "Usage: crgs evaluate --bundle <bundle> --subject <subject> --target <entity-id>"
    );
    return 1;
  }

  const bundlePath = resolveBundleInputPath(resolvePath(bundleArg));
  const bundle = loadBundle(bundlePath);
  const resolved = validateBundleOrThrow(bundle);
  const subject = readJson(resolvePath(subjectArg)) as CharacterSubject;
  const targetEntity = resolved.index.byId.get(targetId);

  if (!targetEntity) {
    console.error(`Unknown target entity: ${targetId}`);
    return 1;
  }

  const context: EvaluationContext = {
    entityIndex: resolved.index,
    entityIds: subject.entityIds ?? [],
    facts: subject.facts ?? {}
  };
  const result = targetEntity.requirements
    ? evaluate(targetEntity.requirements, context)
    : { satisfied: true, evaluated: [], missing: [] };
  const graph = buildRuntimeGraph(resolved);
  const path = findPathToTarget(graph, subject, targetId);
  const unlockedEntities = findUnlockedEntities(graph, targetId);

  writeJsonToStdout({
    valid: result.satisfied,
    targetId,
    result,
    path,
    unlockedEntities
  });

  return result.satisfied ? 0 : 1;
}

function validatePath(inputPath: string): CliValidationReport[] {
  if (isDirectory(inputPath)) {
    const reports: CliValidationReport[] = [];

    for (const candidate of ["profile.json", "bundle.json"]) {
      const candidatePath = join(inputPath, candidate);
      if (pathExists(candidatePath)) {
        reports.push(validateDocument(candidatePath));
      }
    }

    if (reports.length === 0) {
      throw new Error(
        `No supported CRGS files found in directory: ${inputPath}`
      );
    }

    return reports;
  }

  return [validateDocument(inputPath)];
}

function validateDocument(inputPath: string): CliValidationReport {
  const value = readJson(inputPath);

  if (isBundleLike(value)) {
    try {
      validateBundleOrThrow(value);
      return {
        path: inputPath,
        kind: "bundle",
        valid: true,
        issues: []
      };
    } catch (error) {
      return {
        path: inputPath,
        kind: "bundle",
        valid: false,
        issues: mapCommandError(error)
      };
    }
  }

  if (isProfileLike(value)) {
    const validator = ajv.getSchema(profileSchemaId);
    if (!validator) {
      throw new Error(`Missing schema validator: ${profileSchemaId}`);
    }

    const valid = validator(value);
    return {
      path: inputPath,
      kind: "profile",
      valid: Boolean(valid),
      issues: valid ? [] : mapSchemaErrors(validator.errors ?? [])
    };
  }

  throw new Error(`Unsupported CRGS document: ${inputPath}`);
}

function validateBundleOrThrow(bundle: Bundle) {
  const validation = validateBundleDocument(bundle, { schemaRoots });
  if (!validation.valid) {
    throw new CliCommandError(mapValidationIssues(validation.issues));
  }

  try {
    return resolveBundle(bundle);
  } catch (error) {
    if (error instanceof BundleResolutionError) {
      throw new CliCommandError(mapResolverIssues(bundle, error.issues));
    }

    throw error;
  }
}

function createAjv(): AjvLike {
  const instance = new Ajv2020({
    allErrors: true,
    strict: true,
    allowUnionTypes: true
  });
  addFormats(instance);

  for (const schemaPath of collectJsonFiles(schemaDir)) {
    const schema = readJson(schemaPath) as Record<string, unknown>;
    if (typeof schema.$id === "string") {
      instance.addSchema(schema, schema.$id);
    }
  }

  return instance;
}

function readVersion(): string {
  const packageMetadata = readJson(packageJsonPath) as { version?: unknown };
  return typeof packageMetadata.version === "string"
    ? packageMetadata.version
    : "0.0.0";
}

function collectJsonFiles(directory: string, files: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectJsonFiles(path, files);
      continue;
    }

    if (entry.name.endsWith(".json")) {
      files.push(path);
    }
  }

  return files;
}

function mapSchemaErrors(errors: ErrorObject[]): CliValidationIssue[] {
  return errors.map((error) => ({
    code: "CRGS_SCHEMA_VALIDATION_ERROR",
    path: error.instancePath || "/",
    message: error.message ?? "Schema validation failed.",
    keyword: error.keyword
  }));
}

function mapResolverIssues(
  bundle: Bundle,
  issues: ResolverIssue[]
): CliValidationIssue[] {
  return issues.map((issue) => ({
    code: mapResolverIssueCode(issue.code),
    path: issue.path,
    message: issue.message,
    reference: readStringAtJsonPointer(bundle, issue.path)
  }));
}

function mapResolverIssueCode(code: ResolverIssue["code"]): string {
  switch (code) {
    case "DUPLICATE_ENTITY_ID":
      return "CRGS_DUPLICATE_ENTITY_ID";
    case "UNKNOWN_REFERENCED_ENTITY":
    case "INVALID_REQUIREMENT_TARGET":
    case "INVALID_RELATION_TARGET":
      return "CRGS_REFERENCE_NOT_FOUND";
    case "INVALID_PROFILE_NAMESPACE":
      return "CRGS_INVALID_PROFILE_NAMESPACE";
    case "UNSUPPORTED_REQUIREMENT_TYPE":
      return "CRGS_UNKNOWN_REQUIREMENT_TYPE";
  }
}

function mapValidationIssues(issues: ValidationIssue[]): CliValidationIssue[] {
  return issues.map((issue) => ({
    code: issue.code,
    path: issue.path,
    message: issue.message,
    keyword: issue.keyword
  }));
}

function readStringAtJsonPointer(
  value: unknown,
  pointer: string
): string | undefined {
  const segments = pointer
    .split("/")
    .slice(1)
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));

  let current: unknown = value;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current : undefined;
}

function findPathToTarget(
  graph: RuntimeGraph,
  subject: CharacterSubject,
  targetId: string
): string[] {
  const startNodeIds = new Set<string>(subject.entityIds ?? []);

  for (const node of graph.nodes) {
    if (
      node.kind === "virtual-threshold" &&
      isThresholdSatisfied(node, subject)
    ) {
      startNodeIds.add(node.id);
    }
  }

  if (startNodeIds.has(targetId)) {
    return [targetId];
  }

  const outgoing = new Map<string, string[]>();
  for (const edge of graph.edges.filter(
    (candidate) => candidate.type === "requires"
  )) {
    const nextTargets = outgoing.get(edge.source) ?? [];
    nextTargets.push(edge.target);
    outgoing.set(edge.source, nextTargets);
  }

  for (const targets of outgoing.values()) {
    targets.sort((left, right) => left.localeCompare(right));
  }

  const queue = [...startNodeIds].sort((left, right) =>
    left.localeCompare(right)
  );
  const previousByNode = new Map<string, string | null>();

  for (const nodeId of queue) {
    previousByNode.set(nodeId, null);
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    if (current === targetId) {
      return buildPath(previousByNode, current);
    }

    for (const next of outgoing.get(current) ?? []) {
      if (previousByNode.has(next)) {
        continue;
      }

      previousByNode.set(next, current);
      queue.push(next);
    }
  }

  return [];
}

function buildPath(
  previousByNode: Map<string, string | null>,
  targetId: string
): string[] {
  const path: string[] = [];
  let current: string | null | undefined = targetId;

  while (current !== null && current !== undefined) {
    path.push(current);
    current = previousByNode.get(current) ?? null;
  }

  return path.reverse();
}

function findUnlockedEntities(graph: RuntimeGraph, entityId: string): string[] {
  return graph.edges
    .filter((edge) => edge.type === "requires" && edge.source === entityId)
    .map((edge) => edge.target)
    .sort((left, right) => left.localeCompare(right));
}

function isThresholdSatisfied(
  node: VirtualThresholdRuntimeNode,
  subject: CharacterSubject
): boolean {
  const actualValue = subject.facts?.[node.fact];
  return typeof actualValue === "number" && actualValue >= node.value;
}

function isBundleLike(value: unknown): value is Bundle {
  return (
    hasProperty(value, "manifest") &&
    hasProperty(value, "entities") &&
    hasProperty(value, "relationships")
  );
}

function isProfileLike(value: unknown): value is Profile {
  return (
    hasProperty(value, "extensions") &&
    hasProperty(value, "specVersion") &&
    !hasProperty(value, "manifest")
  );
}

function hasProperty(
  value: unknown,
  key: string
): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && key in value;
}

function loadBundle(inputPath: string): Bundle {
  const value = readJson(inputPath);
  if (!isBundleLike(value)) {
    throw new Error(`Expected bundle document: ${inputPath}`);
  }

  return value;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJsonFile(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonToStdout(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function resolveBundleInputPath(inputPath: string): string {
  return isDirectory(inputPath) ? join(inputPath, "bundle.json") : inputPath;
}

function pathExists(path: string): boolean {
  try {
    readFileSync(path, "utf8");
    return true;
  } catch {
    return false;
  }
}

function isDirectory(path: string): boolean {
  try {
    return readdirSync(path, { withFileTypes: true }).length >= 0;
  } catch {
    return false;
  }
}

function resolvePath(path: string): string {
  return resolve(process.cwd(), path);
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function printHelp(): void {
  writeLine(`crgs ${cliVersion}`);
  writeLine("");
  writeLine("Usage: crgs <command> [options]");
  writeLine("");
  writeLine("Commands:");
  for (const command of commands) {
    writeLine(`  ${command.name.padEnd(8)} ${command.summary}`);
  }
  writeLine("");
  writeLine("Validation Modes:");
  writeLine(
    "  crgs validate <path>   Validate a bundle, profile, or profile directory."
  );
  writeLine(
    "  crgs validate --repo   Run the full repository validation pipeline."
  );
  writeLine("");
  writeLine("Options:");
  writeLine("  -h, --help     Show CLI usage.");
  writeLine("  -v, --version  Print CLI version.");
}

function writeLine(message: string, toStdErr = false): void {
  const stream = toStdErr ? process.stderr : process.stdout;
  stream.write(`${message}\n`);
}

function mapCommandError(error: unknown): CliValidationIssue[] {
  if (error instanceof CliCommandError) {
    return error.issues;
  }

  if (error instanceof Error) {
    return [
      {
        code: "CRGS_COMMAND_ERROR",
        path: "/",
        message: error.message
      }
    ];
  }

  return [
    {
      code: "CRGS_COMMAND_ERROR",
      path: "/",
      message: "Unknown command error."
    }
  ];
}

class CliCommandError extends Error {
  readonly issues: CliValidationIssue[];

  constructor(issues: CliValidationIssue[]) {
    super(issues.map((issue) => issue.message).join("; "));
    this.name = "CliCommandError";
    this.issues = issues;
  }
}

if (
  process.argv[1] &&
  realpathSync(resolve(process.argv[1])) ===
    realpathSync(fileURLToPath(import.meta.url))
) {
  void main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
