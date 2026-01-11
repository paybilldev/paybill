import type {
  ContextLoggerOptions,
  ILogger,
  LoggerFactoryOptions,
  LoggerOptions,
} from './interface';
import { Logger } from './logger';
import * as util from 'util';
import { join } from 'path';
import { isDevelopmentEnvironment } from './util';
const debug = util.debuglog('paybill:debug');

export class LoggerFactory extends Map<string, ILogger> {
  constructor(protected factoryOptions: LoggerFactoryOptions = {}) {
    super();
  }

  createLogger(
    name: string,
    options: LoggerOptions
  ): ILogger {
    if (!this.has(name)) {
      debug('[logger]: Create logger "%s" with options %j', name, options);
      const logger = new Logger(
        Object.assign(options, this.factoryOptions)
      );
      this.addLogger(name, logger);
      return logger;
    }

    return this.getLogger(name);
  }

  addLogger(name: string, logger: ILogger, errorWhenReplace = true) {
    if (!errorWhenReplace || !this.has(name)) {
      if (this.get(name) !== logger) {
        if (logger['onClose']) {
          logger['onClose'](() => {
            this.delete(name);
          });
        }
        if (logger['on']) {
          (logger as any).on('close', () => this.delete(name));
        }
        this.set(name, logger as Logger);
      }
    } else {
      throw new Error(`logger id ${name} has duplicate`);
    }
    return this.get(name);
  }

  getLogger(name: string) {
    return this.get(name);
  }

  removeLogger(name: string) {
    const logger = this.get(name);
    logger?.['close']();
    this.delete(name);
  }

  get(name) {
    return super.get(name);
  }

  /**
   * Closes a `Logger` instance with the specified `name` if it exists.
   * If no `name` is supplied then all Loggers are closed.
   * @param {?string} name - The id of the Logger instance to close.
   * @returns {undefined}
   */
  close(name?: string) {
    if (name) {
      return this.removeLogger(name);
    }

    Array.from(this.keys()).forEach(key => this.removeLogger(key));
  }

  getDefaultLoggerConfig(appInfo: {
    pkg: Record<string, any>;
    name: string;
    baseDir: string;
    appDir: string;
    HOME: string;
    root: string;
    env: string;
  }) {
    const isDevelopment = isDevelopmentEnvironment(appInfo.env);
    const logRoot = process.env['LOGGER_WRITEABLE_DIR'] ?? appInfo.root;

    if (!logRoot) {
      throw new Error(
        'Logger requires a root path during initialization, but it was provided empty. Please set it manually in the "logger.default.dir" configuration.'
      );
    }

    return {
      logger: {
        default: {
          fileLogName: 'paybill-app.log',
          errorLogName: 'common-error.log',
          dir: join(logRoot, 'logs', appInfo.name),
          auditFileDir: '.audit',
          transports: {
            console: isDevelopment
              ? {
                  autoColors: isDevelopment,
                }
              : false,
            file: {
              bufferWrite: !isDevelopment,
            },
            error: {
              bufferWrite: !isDevelopment,
            },
          },
        },
        clients: {
          coreLogger: {
            fileLogName: 'paybill-core.log',
          },
          appLogger: {},
        },
      },
    };
  }

  createContextLogger(
    ctx: any,
    appLogger: ILogger,
    options: ContextLoggerOptions = {}
  ): ILogger {
    return (appLogger as Logger).createContextLogger(ctx, options);
  }
}
