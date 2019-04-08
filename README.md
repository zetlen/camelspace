# camelspace

![camelspace](https://user-images.githubusercontent.com/1643758/55430521-f73b0e80-5553-11e9-8aed-3c74e33f5a50.jpg)

Your code is good, but it could be _great_ code, if it was [twelve-factor](https://12factor.net/) code. You're supposed to configure twelve-factor apps with [environment variables](https://12factor.net/config), because they are simple, cross-platform, easy to combine and override, and separate from code. Then again, actually _using_ them is all like:

```sh
# It's a flat dictionary with no namespacing or hierarchy.
MY_APP_CORE_MODE=test
MY_APP_CORE_TOKEN=ba6bd9a8e6da
MY_APP_CI_TOKEN=1730eb9867d
THIRD_PARTY_VAR='Who knows!'

# All values are strings, but it's unclear how to escape strings or validate other types.
THIRD_PARTY_NULLABLE_BOOLEAN=
HOST='a.url...maybe?!'
port=655E9🐘

# And they should be SCREAMING_SNAKE_CASE!
MY_APP_TELEMETRY_API_ENDPOINT=https://example.com
MY_APP_TELEMETRY_LOG_ENABLED=1
MY_APP_TELEMETRY_LOG_LEVEL=debug
```

Some operating systems may allow more flexible environment variables, but not all of them, and the point of using them is to be maximally portable. Escaping rules differ; shell syntax differs; some shells aren't case sensitive, and more. [The Open Group](http://pubs.opengroup.org/onlinepubs/000095399/basedefs/xbd_chap08.html) defines some restrictions here, but the easiest rule to remember is **ONLY_CAPITAL_ASCII_LETTERS_AND_UNDERSCORES_NO_FUNNY_BUSINESS**.

:warning: To pursue this ideal, `camelspace` will ignore any environment variables that don't match this format:

- First character **must** be `[A-Z]`
- Subsequent characters may be `[A-Z]`, `[0-9]`, or `_`

At the very least, to ensure cross-platform consistency, the incoming environment variables need to be formatted in this manner.

And furthermore, as the Open Group notes in the above link, environment variables all exist in one global namespace, so in order not to step on other variables, you usually want to add prefixes to the ones for your app, making them long.

So...you _should_ use environment variables for all your configuration, but it's not fun to use them in NodeJS code.
Definitely use utilities like [dotenv](https://npmjs.com/package/dotenv) to manage environment variables files and fallbacks, and [envalid](https://npmjs.com/package/envalid) to validate their types, docstrings, and defaults. But wouldn't it be nice if you could replace this:

```js
if (process.env.MY_APP_CORE_MODE === 'test') {
  mockSomething();
}
```

with...

```js
const { core } = camelspace('myApp', ['core'])(process.env);
if (core.mode === 'test') {
  mockSomething();
}
```

It would be nice, and it is nice, because with `camelspace` you can.

## Usage

Import or require the `camelspace()` function:

```js
import camelspace from 'camelspace';
/** OR **/
const camelspace = require('camelspace');
```

:information_source: _The following examples all use an environment generated from the example environment variables above._

### Basic

The main export of `camelspace` is a function which creates scoped
transformers (see below), but `camelspace()` itself is also a transformer for
an entire environment object. If you just want to camelcase the whole
environment, you can use `camelspace.fromEnv(process.env)`.

Call `camelspace.fromEnv()` with a `process.env` object (or any object with
`SCREAMING_SNAKE_CASE` properties). This returns an object representing the
whole environment, with all properties changes to `camelCase`. _(No
validation or type coercion is done on the values of the object; `camelspace`
only formats the object keys.)_

```js
const env = camelspace.fromEnv(process.env)
env.myAppCoreMode === 'test';
env.thirdPartyNullableBoolean === '';
env.port === undefined
```

Note that **camelspace does no type coercion or validation**; that's for other
libraries to do. Also, note that the `port` from the sample env above did not
make it into the formatted object, because its lower case meant it did not fit
the pattern for safe environment variables.

#### Basic reversal

Turn a camelCased object back into an object of SCREAMING_SNAKE_CASE environment
variables by using `camelspace.toEnv(obj)`. You might need this to pass
environment variables to a child process, for example.

### Scoped

Call the `camelspace()` function with a **scope prefix** to return an
object with `.fromEnv()` and `.toEnv()` methods which return scoped objects
based on prefixes. Use these transformers to extract the environment variables
relevant to your app and structure them as necessary.

#### Scope prefixes

A scope prefix can be either `camelCase` or `SNAKE_CASE`. It represents a prefix
for the subset of environment variables to select. To build complex objects,
simply compose transformer functions by calling them with further scope strings.

```js
const appConfig = camelspace('myApp'); // could be "MY_APP";
const appEnv = appConfig.fromEnv(process.env);
appEnv.coreMode === 'test';
appEnv.coreToken === 'ba6bd9a8e6da';
appEnv.ciToken === '1730eb9867d';

const coreConfig = appConfig('core'); // could be "CORE";
const coreEnv = coreConfig.fromEnv(process.env);
core.mode === 'test';
core.token === 'ba6bd9a8e6da';

// You could get the equivalent with the following, but that requires
// more modules to know the parent namespace, which is tigher coupling.
const coreConfig = camelspace('myAppCore');
const coreEnv = coreConfig.fromEnv(process.env);
core.mode === 'test';
core.token === 'ba6bd9a8e6da';
```

Transformers can compose arbitrarily deep.

```js
const telemetryLogEnv = camelspace('myApp')('telemetry')('log').fromEnv(
  process.env
);
telemetryLogEnv.enabled === '1'; // Note that camelspace does no type coercion.
telemetryLogEnv.level === 'debug';
```

#### Scoped reversal

A transform function has a method `.toEnv(camelSpacedObject)`, which does the
reverse operation `transformer.toEnv(object)` transforms any object returned
by the same transformer into a flat `SCREAMING_SNAKE_CASED` object with the
original prefix. For any transformer, `.fromEnv()` and `.toEnv()` are inverse
operations (barring the original `.fromEnv(process.env)`, which elides variables
outside the approved pattern and/or the given namespace.)

```js
const appConfig = camelSpace('myApp');
const appEnv = appConfig.fromEnv(process.env);
/** appEnv looks like:
 * {
 *   coreMode: "test",
 *   coreToken: "ba6bd9a8e6da",
 *   ciToken: "1730eb9867d"
 *   telemetryApiEndpoint: "https://example.com"
 *   telemetryLogEnabled: "1",
 *   telemetryLogLevel: "debug"
 * }
 */
const originalEnv = appConfig.toEnv(appEnv);
/** originalEnv looks like:
 * {
 *   MY_APP_CORE_MODE: "test",
 *   MY_APP_CORE_TOKEN: "ba6bd9a8e6da",
 *   MY_APP_CI_TOKEN: "1730eb9867d"
 *   MY_APP_TELEMETRY_API_ENDPOINT: "https://example.com"
 *   MY_APP_TELEMETRY_LOG_ENABLED: "1",
 *   MY_APP_TELEMETRY_LOG_LEVEL: "debug"
 * }
 */
```

:information_source: _(The `camelspace` default export is just a transformer whose namespace is the empty string `''`. If you call it with the empty string, it just returns itself. Zowie!)_

## Installation

With **npm** do:

```sh
npm install camelspace
```

With **yarn** do:

```sh
yarn add camelspace
```
