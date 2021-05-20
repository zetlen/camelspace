const changeCase = require("change-case");

const validEnvVarNamePattern = /[A-Z][A-Z0-9_]+/;
const isValidEnvVarName = (s) => validEnvVarNamePattern.test(s);

// Gets the entire object if the namespace is the empty string.
function camelSpaceObject(obj, namespace) {
  const camelSpaced = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith(namespace) && isValidEnvVarName(key)) {
      camelSpaced[changeCase.camelCase(key.slice(namespace.length))] = value;
    }
  }
  return camelSpaced;
}

function snakeSpaceObject(obj, namespace) {
  const snakeSpaced = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = changeCase.constantCase(key);
    snakeSpaced[namespace + snakeKey] = value;
  }
  return snakeSpaced;
}

function camelspace(baseNs) {
  const parent = baseNs ? changeCase.constantCase(baseNs) + "_" : "";
  function transformer(scope) {
    if (!scope) {
      return transformer;
    }
    const child = changeCase.constantCase(scope);
    return camelspace(parent + child);
  }
  transformer.for = (
    scope,
    sections,
    /* istanbul ignore next: tests argue this */ envObj = process.env
  ) => {
    const space = transformer(scope);
    return sections.map((section) => space(section).fromEnv(envObj));
  };
  transformer.fromEnv = (obj) => camelSpaceObject(obj, parent);
  transformer.toEnv = (obj) => snakeSpaceObject(obj, parent);
  return transformer;
}

module.exports = camelspace("");

module.exports.of = (
  namespaces,
  /* istanbul ignore next: tests argue this */ envObj = process.env
) =>
  namespaces.reduce(
    (outEnv, namespace) => ({
      ...outEnv,
      [namespace]: camelspace(namespace).fromEnv(envObj),
    }),
    {}
  );
