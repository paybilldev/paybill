<p align="center">
  <a href="https://paybill.dev" target="_blank">
    <picture>
      <!-- Dark mode -->
      <source srcset="https://paybill.dev/logo-wordmark--dark.png" media="(prefers-color-scheme: dark)" />
      <!-- Light mode (default) -->
      <img src="https://paybill.dev/logo-wordmark--light.png" width="180" alt="Logo" />
    </picture>
  </a>
</p>

**Paybill** builds foundational platforms for **modern SaaS systems** and **safe AI-driven applications**.

We focus on **control, predictability, and security** — enabling platforms and agents to operate within clearly defined boundaries rather than unchecked automation.

# @paybilldev/logger

[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@paybilldev/logger.svg?style=flat)](https://nodejs.org/en/download/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/paybilldev/paybill)

[npm-image]: https://img.shields.io/npm/v/@paybilldev/logger.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@paybilldev/logger
[download-image]: https://img.shields.io/npm/dm/@paybilldev/logger.svg?style=flat-square
[download-url]: https://npmjs.org/package/@paybilldev/logger

@paybilldev/logger is a log module for midway project.

## Required

Node.js >= v18

## Install

```bash
$ npm install @paybilldev/logger --save
```

## Create Logger

```ts
import { loggers } from '@paybilldev/logger';

const logger = loggers.createLogger('logger', {
  // some logger options
})
```


## Create With Transport

Create logger with console and file transports instance.

```typescript
import { loggers, ConsoleTransport, FileTransport } from '@paybilldev/logger';

const logger = loggers.createLogger('logger', {
  transports: {
    console: new ConsoleTransport(),
    file: new FileTransport({
      dir: '...',
      fileLogName: 'app.log',
    }),
  }
})
```

Create console logger.

```typescript
const logger = loggers.createLogger('consoleLogger', {
  transports: {
    console: new ConsoleTransport(),
  }
})
```

Create logger with options mode.

```typescript
const logger = loggers.createLogger('consoleLogger', {
  transports: {
    console: {
      autoColors: true,
    },
    file: {
      dir: '...',
      fileLogName: 'app.log',
    }
  }
})
```



## Logger Output Method

```ts
logger.debug('debug info');
logger.info('%d ms', Date.now() - start);
logger.warn('warning!');
logger.error(new Error('my error'));
logger.write('abcde');
```



## Logger Level

log level is divided into the following categories, and the log level decreases sequentially (the larger the number, the lower the level):

```ts
const levels = {
  none: 0,
  error: 1,
  trace: 2,
  warn: 3,
  info: 4,
  verbose: 5,
  debug: 6,
  silly: 7,
  all: 8,
}
```

Set level for all transports

```typescript
const logger = loggers.createLogger('logger', {
  // ...
  level: 'warn',
});

// not output
logger.debug('debug info');

// not output
logger.info('debug info');
```



## Format and ContextFormat

Add logger format and context format.

```typescript
const logger = loggers.createLogger('logger', {
  // ...
  format: info => {
    return `${info.timestamp} ${info.message}`;
  },
  contextFormat: info => {
    return `${info.timestamp} [${info.ctx.traceId}] ${info.message}`;
  }
});
```

info is a default metadata, include some properties.



## Tranports

The actual behavior of the log output we call the transport.The log library has four built-in default Transports.

* `ConsoleTransport` Output message to stdout and stderr with color.
* `FileTransport` Output message to file and rotate by self.
* `ErrorTransport` Inherit `FileTransport` and only output error message.
* `JSONTransport` Inherit `FileTransport` and output json format.

The above Transports are all registered by default and can be configured by the name when registering.

```typescript
const logger = loggers.createLogger('consoleLogger', {
  transports: {
    console: {/*...options*/},
    file: {/*...options*/},
    error: {/*...options*/},
    json: {/*...options*/},
  }
});
```



## Implement a new Transport

Inherit Transport abstract class and implement `log` and `close` method.

```typescript
import { Transport, ITransport } from '@paybilldev/logger';

export interface CustomTransportOptions {
  // ...
}

export class CustomTransport extends Transport<CustomTransportOptions> implements ITransport {
  log(level: LoggerLevel | false, meta: LogMeta, ...args) {
    // save file or post to remote server
  }
  
  close() {}
}
```

Register class to `TransportManager` before used.

```typescript
import { TransportManager } from '@paybilldev/logger';

TransportManager.set('custom', CustomTransport);
```

And you can configure it in your code.

```typescript
const logger = loggers.createLogger('consoleLogger', {
  transports: {
    custom: {/*...options*/}
  }
});
```
