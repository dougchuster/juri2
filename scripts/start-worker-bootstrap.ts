import "dotenv/config";
import Module from "node:module";
import path from "node:path";

const nodeRequire = Module.createRequire(__filename);
const serverOnlyPath = nodeRequire.resolve("server-only");
const moduleCache = nodeRequire.cache as NodeJS.Dict<NodeJS.Module>;
const moduleDirectory = path.dirname(serverOnlyPath);

moduleCache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
  children: [],
  path: moduleDirectory,
  paths: [],
  isPreloading: false,
  parent: null,
  require: nodeRequire,
} as NodeJS.Module;

void import("../src/worker/index");
