Helper library for using environment variables fluently and readably, so you can
use them for your app settings instead of nonstandardized config files.

Get neat groups of camelCased environment variables from a large, flat,
SCREAMING_SNAKE_CASED NodeJS `process.env` object.

![camelspace](https://user-images.githubusercontent.com/1643758/55430521-f73b0e80-5553-11e9-8aed-3c74e33f5a50.jpg)

If: 
```sh
# .env
BLUE_API_KEY=12345
BLUE_API_SECRET=abcdefghijklm
BLUE_ID=foo
RED_API_KEY=09876
RED_API_SECRET=zyxwvutsrqpon
RED_LOG_LEVEL=debug
```

Then instead of:

```js
blueClient({
  key: process.env.BLUE_API_KEY
  apiSecret: process.env.BLUE_API_SECRET,
  id: process.env.BLUE_ID
});

redClient({
  key: process.env.RED_API_KEY
  apiSecret: process.env.RED_API_SECRET,
  logLevel: process.env.RED_LOG_LEVEL
});
```

you can do

```js
const env = camelspace.of(['blue', 'red'], process.env);
blueClient(env.blue);
redClient(env.red);
```

And it handles arbitrary levels of nesting and what have you. OK, here's the long version.

# Contents

1. [Usage](#usage)
   1. [Managing Groups of App Settings with `camelspace.of()`](#managing-groups-of-app-settings-with-camelspaceof)
1. [Advanced Usage](#advanced-usage)
   1. [Scoped environment objects](#scoped-environment-objects)
   1. [Reversing the transform](#reversing-the-transform)
   1. [Unscoped transforming](#unscoped-transforming)
1. [API Reference](#api-reference)
   1. [`camelspace.of()`](#camelspaceof)
   1. [`camelspace(namespace)`](#camelspacenamespace)
      1. [`configFactory.fromEnv(env)`](#configfactoryfromenvenv)
      1. [`configFactory.toEnv(configObj)`](#configfactorytoenvconfigobj)
      1. [`configFactory.for(<section>, <subsections>, [env])`](#configfactoryforsection-subsections-env)
   1. [FAQ](#faq)
      1. [Why not just a JSON configuration file?](#why-not-just-a-json-configuration-file)
      1. [What are valid environment variable names?](#what-are-valid-environment-variable-names)
      1. [How does Camelspace validate?](#how-does-camelspace-validate)

# Usage

```sh
npm install camelspace
```

```js
import camelspace from 'camelspace';
```

Call `camelspace` with some strings to show it how your app settings are stored.
It will return a sanitized, readable, camel-cased object that helps you keep
your environment variables organized. There are three modes of usage:

- [`camelspace.of(namespaces)`](#camelspaceof) for splitting your enviroment into simple, named groups
- [`camelspace(namespace)`](#camelspace) for nested configurations based on a single root namespace

## Managing Groups of App Settings with `camelspace.of()`

A common environment need in a modern app is to juggle more than one credential for more than one external API. That's a lot of things called "API KEY"! The best solution is to namespace, and camelspace makes that easy.

Let's say you want to integrate with both Twitter and Slack. [The Twitter API client tells you it needs four environment variables to start up.](https://github.com/FeedHive/twitter-api-client/blob/d337cb870f5803aa419673c7ab0b99e9d48e8b7d/README.md#usage)

```js
const twitterClient = new TwitterClient({
  apiKey: '<YOUR-TWITTER-API-KEY>',
  apiSecret: '<YOUR-TWITTER-API-SECRET>',
  accessToken: '<YOUR-TWITTER-ACCESS-TOKEN>',
  accessTokenSecret: '<YOUR-TWITTER-ACCESS-TOKEN-SECRET>',
});
```

Meanwhile, Slack has its own credentials:

```js
const slackApp = new App({
  token: '<YOUR-SLACK-TOKEN>'
  signingSecret: '<SLACK-SIGNING-SECRET>'
});
```

You need environment variables for each of these. And you want to distinguish between similarly named credentials, so you do:

```sh
# .env`
TWITTER_CONSUMER_KEY='<YOUR-TWITTER-API-KEY>'
TWITTER_CONSUMER_SECRET='<YOUR-TWITTER-API-SECRET>'
TWITTER_ACCESS_TOKEN='<YOUR-TWITTEER-ACCESS-TOKEN>'
TWITTER_ACCESS_TOKEN_SECRET='<YOUR-TWITTER-ACCESS-TOKEN-SECRET>'

SLACK_TOKEN='<YOUR-SLACK-TOKEN>'
SLACK_SIGNING_SECRET='<SLACK-SIGNING-SECRET>'
```

And now, once you've pulled `.env` into your Node environment (using
[dotenv](https://npmjs.com/package/dotenv) perhaps?) you can create a client:

```js
// Plug the environment into the clients.
const twitterClient = new TwitterClient({
  apiKey: process.env.TWITTER_CONSUMER_KEY,
  apiSecret: process.env.TWITTER_CONSUMER_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});
const slackApp = new App({
  token: '<YOUR-SLACK-TOKEN>'
  signingSecret: '<SLACK-SIGNING-SECRET>'
});
```

This is verbose and error-prone.
Camelspace takes advantage of the capitalization patterns of JavaScript
variables and environment variables, and automates some of this for you.

```js
// Get a camelcased object of all env vars beginning with `TWITTER_`.
const { twitter } = camelspace.of(['twitter']);
// Use it for the config instead.
const twitterClient = new TwitterClient({
  apiKey: twitter.apiKey,
  apiSecret: twitter.apiSecret,
  accessToken: twitter.accessToken,
  accessTokenSecret: twitter.accessTokenSecret
});
// Get a camelcased object of all env vars beginning with `SLACK_`.
const { slack } = camelspace.of(['slack']);
// Use it for the config instead.
const slackApp = new App({
  token: slack.token,
  signingSecret: slack.signingSecret
});
```

Note that because we named our environment variables carefully so their
camelcased versions matched up with the constructor signatures, it can actually
get even simpler.

Which is when you really start to see the benefit:

```js
// Get a camelcased object of every section of environment relevant to your app.
const config = camelspace.of(['twitter', 'slack']);
const twitterClient = new TwitterClient(config.twitter);
const slackApp = new App(config.slack);
```

:warning: Note that **camelspace does no type coercion or validation**; that's
for other libraries to do. In particular, **camelsace does not validate
environment variables against your app's own configuration schema.** Definitely
use utilities like [envalid](https://npmjs.com/package/envalid) to validate
their types, docstrings, and defaults.

If you have more complex needs, such as nested configuration or multiple versions of the same app, then read on...

# Advanced Usage

The `camelspace()` function creates _config factory objects_, which can be
reused with different `env` objects, or recursively called to create more
specific configurators within a namespace.

A config factory object has methods: `.fromEnv()`, `.toEnv()` and `.for()`.

Call `configFactory.for` with a **root namespace**, a list of **configuration
sections**, and optionally an **environment object**. If you pass no third
argument, `configFactory.for` will use `process.env` as the environment object.

```js
const getAppConf = camelspace('myApp');
const [{ mode }] = getAppConf.for('indexer', ['cache']);
// This retrieves process.env.MY_APP_INDEXER_CACHE_MODE in a different style.

if (mode === 'redis') {
  // etc
}
```

This is more verbose than the fluent style, but it can aid in testability.

:information_source: _The following examples all use an environment generated from the [example environment variables from the FAQ](#what-are-valid-environment-variable-names)._

## Scoped environment objects

The `.fromEnv()` and `.toEnv()` methods return scoped objects
constrained to the root namespace of the factory.

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

## Reversing the transform

Turn a camelCased object back into an object of SCREAMING_SNAKE_CASE environment
variables by using `configFactory.toEnv(obj)`. You might need this to pass
environment variables to a child process, for example.

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

## Unscoped transforming

The `camelspace` default export is just a config factory whose namespace is the empty string `''`.

Call `camelspace.fromEnv()` with a `process.env` object (or any object with
`SCREAMING_SNAKE_CASE` properties). This returns an object representing the
whole environment, with all properties changes to `camelCase`. _(No
validation or type coercion is done on the values of the object; `camelspace`
only formats the object keys.)_

```js
const env = configFactory.fromEnv(process.env)
env.myAppCoreMode === 'test';
env.thirdPartyNullableBoolean === '';
env.port === undefined
```

The corresponding `camelspace.toEnv(env)` will turn a config object back into
environment variables, not limited by a scope prefix.

# API Reference

## `camelspace.of()`

| Parameter | Description |
| --------- | ----------- |
| `namespaces` | Array of camelCased prefixes for each section of env vars to collect. For instance, `['twitter', 'googleAnalytics']` would get all env vars starting with `TWITTER_`, and all env vars starting with `GOOGLE_ANALYTICS`. |
| `env` | _Optional, defaults to `process.env`_. If passed, camelcase will use this argument as the object of env vars to process, instead of `process.env`. |

Returns an object with keys matching the list of `namespaces`, and values matching camel cased versions of the env vars under each namespace.

**Example:**
```js
console.log(
  camelspace.of(
    ['twitter', 'googleAnalytics'],
    {
      GOOGLE_ANALYTICS_ACCOUNT_ID: 123456,
      TWITTER_USER: '@dril',
      TWITTER_API_KEY: 'abcdef',
      UNRELATED: 'foo'
    }
  )
);
```
```
{
  twitter: {
    user: '@dril',
    apiKey: 'abcdef'
  },
  googleAnalytics: {
    accountId: 123456
  }
}
```

Considering the underscores in env var names to be "levels", you can split out
your vars however you wish. For instance, camelspace will turn the same
environment into a different object if `google` is used instead:

```
{
  twitter: {
    user: '@dril',
    apiKey: 'abcdef'
  },
  google: {
    analyticsAccountId: 123456
  }
}
```

For more complex objects with deeper nesting, use the `camelspace()` factory.

## `camelspace(namespace)`

| Parameter   | Description                                                                                                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `namespace` | The camelcased prefix for all the env vars you want to use. For instance, `myAppCore` would limit to all varnames beginning with `MY_APP_CORE_`.  |

Returns a **config factory object** with `fromEnv`, `toEnv`, and `for` methods. The object is also
a callable function that can return another config factory, with a deeper scope.

### `configFactory.fromEnv(env)`

| Parameter | Description |
| --------- | ----------- |
| `envObj` | Object with SCREAMING_SNAKE_CASE keys, to use as the source of environment variables.

Returns an object of the variables whose names begin with the config factory's
namespace, and the values camelCased.


### `configFactory.toEnv(configObj)`

| Parameter | Description |
| --------- | ----------- |
| `configObj` | Object with camelCased keys, to use as the source of environment variables.

Returns an object with SCREAMING_SNAKE_CASE keys, whose properties all begin with the SCREAMING_SNAKE_CASE transofmration of the config factory's namespace.



### `configFactory.for(<section>, <subsections>, [env])`

| Parameter   | Description                                                                                                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `namespace` | The camelcased prefix for all the env vars you want to use. For instance, `myAppCore` would limit to all varnames beginning with `MY_APP_CORE_`.                                                                                                        |
| `sections`  | An array of strings, with each string representing a camelcased sub-namespace with the `namespace`. For instance, `['network']` would return a length-1 array whose first index was an object of all the env vars starting with `MY_APP_CORE_NETWORK_`. |
| `env`       | _Optional, defaults to `process.env`_. If passed, camelspace will use this object to lookup env vars, instead of the Node builtin `process.env`.

Returns an array of objects, of the same length as the **sections** argument.
Each section is an object whose keys are camelcased environment variable keys
with the namespace prefix removed, and whose values are the values of the
environment variables in the object. No coercion is done; the values are
exactly what exists in `process.env`, or whatever argument object was sent as
the third argument.

## FAQ

### Why not just a JSON configuration file?
We're supposed to configure well-designed apps with [environment variables](https://12factor.net/config), because they are simple, cross-platform, easy to combine and override, and separate from code. Using a JSON configuration file or an `.rc` configuration file invites a few antipatterns to come in and roost:

- File-based config implies inheritance-based config: a directory has an .rc file, which overrides the whole project's .rc file, which extends your home directory's .rc file. This works great for developer tools, but is _terrible_ for deployed software, because it makes runtime behavior highly dependent on the state of the filesystem. It can take a lot of debugging to realize that what's breaking your app is an .rc file in `/usr/share` or something else far away from your code.
- Eventually JSON config files become JS config files, and JS config files become basically scripts which build config objects, and then your config isn't declarative anymore.


### What are valid environment variable names?

Env vars should work everywhere, but truly cross-platform environments have some constraints.

```sh
# It's a flat dictionary with no namespacing or hierarchy.
MY_APP_CORE_MODE=test
MY_APP_CORE_TOKEN=ba6bd9a8e6da
MY_APP_CI_TOKEN=1730eb9867d
MY_APP_INDEXER_CACHE_MODE=redis
THIRD_PARTY_VAR='Who knows!'

# You can do ad-hoc namespacing, but is often ambiguous;
MY_APP_NET_SERVICES_REDIS_HOST=redis.local
MY_APP_NET_RETRIES=3

# All values are strings. How do you escape or validate?
THIRD_PARTY_NULLABLE_BOOLEAN=
HOST='a.url...maybe?!'
port=655E9🐘

# And they should be SCREAMING_SNAKE_CASE!
MY_APP_TELEMETRY_API_ENDPOINT=https://example.com
MY_APP_TELEMETRY_LOG_ENABLED=1
MY_APP_TELEMETRY_LOG_LEVEL=debug
```

Some operating systems may allow more flexible environment variables, but not all of them, and the point of using them is to be maximally portable. Escaping rules differ; shell syntax differs; some shells aren't case sensitive, and more. [The Open Group](http://pubs.opengroup.org/onlinepubs/000095399/basedefs/xbd_chap08.html) defines some restrictions here, but the easiest rule to remember is **ONLY_CAPITAL_ASCII_LETTERS_AND_UNDERSCORES_NO_FUNNY_BUSINESS**.

### How does Camelspace validate?

:warning: To pursue this ideal, `camelspace` will ignore any environment variables that don't match this format:

- First character **must** be `[A-Z]`
- Subsequent characters may be `[A-Z]`, `[0-9]`, or `_`

At the very least, to ensure cross-platform consistency, the incoming environment variables need to be formatted in this manner.
