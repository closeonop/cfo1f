// Node test harness only: Next normally resolves aliases and the server-only marker.
const Module = require("node:module");
const path = require("node:path");
const compiled = path.resolve(__dirname, "../artifacts/assistant-check");
const fromProject = Module.createRequire(path.resolve(__dirname, "../package.json"));
const resolve = Module._resolveFilename;
const load = Module._load;
Module._resolveFilename = function (request, ...args) {
  if (request.startsWith("@/")) return resolve.call(this, path.join(compiled, request.slice(2)), ...args);
  try { return resolve.call(this, request, ...args); }
  catch (error) { if (!request.startsWith(".") && !path.isAbsolute(request)) return fromProject.resolve(request); throw error; }
};
Module._load = function (request, ...args) {
  if (request === "server-only") return {};
  return load.call(this, request, ...args);
};
