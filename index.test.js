const tap = require("tap");
const camelspace = require("./");
const { omit } = require("lodash");

const APP_CORE_ENV = {
  MY_APP_CORE_MODE: "test",
  MY_APP_CORE_TOKEN: "ba6bd9a8e6da"
};

const APP_ENV = Object.assign(
  {
    MY_APP_CI_TOKEN: "1730eb9867d",
    MY_APP_TELEMETRY_API_ENDPOINT: "https://example.com",
    MY_APP_TELEMETRY_LOG_ENABLED: "1",
    MY_APP_TELEMETRY_LOG_LEVEL: "debug"
  },
  APP_CORE_ENV
);

// Mix the app namespace with other stuff, for testability.
const MOCK_ENV = Object.assign(
  {
    THIRD_PARTY_VAR: "Who knows!",
    THIRD_PARTY_NULLABLE_BOOLEAN: "",
    HOST: "a.url...maybe?!",
    port: "655E9🐘"
  },
  APP_ENV
);

// Should not come over because it is lowercase and therefore not
// correctly formatted.
const SANITIZED_MOCK_ENV = omit(MOCK_ENV, "port");

const envCamel = {
  myAppCoreMode: "test",
  myAppCoreToken: "ba6bd9a8e6da",
  myAppCiToken: "1730eb9867d",
  thirdPartyVar: "Who knows!",
  thirdPartyNullableBoolean: "",
  host: "a.url...maybe?!",
  myAppTelemetryApiEndpoint: "https://example.com",
  myAppTelemetryLogEnabled: "1",
  myAppTelemetryLogLevel: "debug"
};

const appEnvCamel = {
  coreMode: "test",
  coreToken: "ba6bd9a8e6da",
  ciToken: "1730eb9867d",
  telemetryApiEndpoint: "https://example.com",
  telemetryLogEnabled: "1",
  telemetryLogLevel: "debug"
};

const coreEnvCamel = {
  mode: "test",
  token: "ba6bd9a8e6da"
};

const APP_ENV_NO_TELEMETRY_LOGGING = Object.assign({}, APP_ENV, {
  MY_APP_TELEMETRY_LOG_ENABLED: ""
});

tap.test(
  "the default export .fromEnv() camelCases everything",
  { autoend: true },
  t => {
    t.strictSame(camelspace.fromEnv(MOCK_ENV), envCamel);
  }
);

tap.test(
  "the default export .toEnv() SNAKE_CASES everything it parsed",
  { autoend: true },
  t => {
    const env = camelspace.fromEnv(MOCK_ENV);
    const RETURNED_ENV = camelspace.toEnv(env);
    t.strictSame(RETURNED_ENV, SANITIZED_MOCK_ENV);
    t.strictSame(camelspace.fromEnv(RETURNED_ENV), env);
  }
);

tap.test(
  "the default export with no arguments returns itself",
  { autoend: true },
  t => {
    const identity = camelspace();
    t.is(identity, camelspace);
    t.strictSame(identity.fromEnv(MOCK_ENV), envCamel);
  }
);

tap.test(
  "calling a transformer as a function returns a scoped transformer",
  { autoend: true },
  t => {
    const myAppConfig = camelspace("myApp");
    const appEnv = myAppConfig.fromEnv(MOCK_ENV);
    t.strictSame(appEnv, appEnvCamel);

    // mutate, just to show we can
    appEnv.telemetryLogEnabled = "";
    const BACK_TO_THE_ENV = myAppConfig.toEnv(appEnv);
    t.strictSame(BACK_TO_THE_ENV, APP_ENV_NO_TELEMETRY_LOGGING);
  }
);

tap.test(
  "calling a scoped transformer as a function returns a deeper scoped one",
  { autoend: true },
  t => {
    const myAppConfig = camelspace("myApp");
    const myCoreConfig = myAppConfig("core");
    const coreEnv = myCoreConfig.fromEnv(MOCK_ENV);
    t.strictSame(coreEnv, coreEnvCamel);
    const CORE_ENV = myCoreConfig.toEnv(coreEnv);
    t.strictSame(CORE_ENV, APP_CORE_ENV);
  }
);
