import { LoggerFactory } from '../src/factory';
import { type LoggerOptions } from '../src/interface';
import { Logger } from '../src/logger';
import { test, beforeEach, describe, expect } from "vitest";

describe('LoggerFactory', () => {
  let factory: LoggerFactory;
  let loggerOptions: LoggerOptions;

  beforeEach(() => {
    factory = new LoggerFactory();
    loggerOptions = {
      level: 'info',
      // Add other logger options as needed
    };
  });

  test('should create a logger', () => {
    const logger = factory.createLogger('test', loggerOptions);
    expect(logger).toBeInstanceOf(Logger);
  });

  test('should add a logger', () => {
    const logger = new Logger(loggerOptions);
    const addedLogger = factory.addLogger('test', logger);
    expect(addedLogger).toEqual(logger);
  });

  test('should get a logger', () => {
    factory.createLogger('test', loggerOptions);
    const logger = factory.getLogger('test');
    expect(logger).toBeInstanceOf(Logger);
  });

  test('should remove a logger', () => {
    factory.createLogger('test', loggerOptions);
    factory.removeLogger('test');
    const logger = factory.getLogger('test');
    expect(logger).toBeUndefined();
  });

  test('should close all loggers', () => {
    factory.createLogger('test1', loggerOptions);
    factory.createLogger('test2', loggerOptions);
    factory.close();
    const logger1 = factory.getLogger('test1');
    const logger2 = factory.getLogger('test2');
    expect(logger1).toBeUndefined();
    expect(logger2).toBeUndefined();
  });


  test('should get default logger config', () => {
    const appInfo = {
      pkg: {},
      name: 'testApp',
      baseDir: '/base/dir',
      appDir: '/app/dir',
      HOME: '/home/dir',
      root: '/root/dir',
      env: 'local',
    };

    const config = factory.getDefaultLoggerConfig(appInfo);

    expect(config).toBeDefined();
    expect(config.logger.default.dir).toEqual('/root/dir/logs/testApp');
    expect(config.logger.default.fileLogName).toEqual('paybill-app.log');
    expect(config.logger.default.errorLogName).toEqual('common-error.log');
    expect(config.logger.default.transports.console['autoColors']).toBeTruthy();
    expect(config.logger.default.transports.file.bufferWrite).toBeFalsy();
    expect(config.logger.default.transports.error.bufferWrite).toBeFalsy();
    expect(config.logger.clients.coreLogger.fileLogName).toEqual('paybill-core.log');
  });
});
