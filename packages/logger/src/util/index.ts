import type { LoggerLevel, LoggerOptions } from '../interface';
import { DefaultLogLevels } from '../constants';
import * as fs from 'fs';
import { dirname, basename } from 'path';
import * as crypto from 'crypto';
import * as path from 'path';
import * as os from 'os';

export function isEnableLevel(
  inputLevel: LoggerLevel | false,
  baseLevel: LoggerLevel
) {
  if (!inputLevel || !baseLevel) {
    return true;
  }
  return DefaultLogLevels[inputLevel] <= DefaultLogLevels[baseLevel];
}

/**
 * Returns frequency metadata for minute/hour rotation
 * @param type
 * @param num
 * @returns {*}
 * @private
 */
export function checkNumAndType(type, num) {
  if (typeof num === 'number') {
    switch (type) {
      case 's':
      case 'm':
        if (num < 0 || num > 60) {
          return false;
        }
        break;
      case 'h':
        if (num < 0 || num > 24) {
          return false;
        }
        break;
    }
    return { type: type, digit: num };
  }
}

/**
 * Returns frequency metadata for defined frequency
 * @param freqType
 * @returns {*}
 * @private
 */
export function checkDailyAndTest(freqType) {
  switch (freqType) {
    case 'custom':
    case 'daily':
      return { type: freqType, digit: undefined };
    case 'test':
      return { type: freqType, digit: 0 };
  }
  return false;
}

/**
 * Check and make parent directory
 * @param pathWithFile
 */
export function mkDirForFile(pathWithFile) {
  const _path = path.dirname(pathWithFile);
  _path.split(path.sep).reduce((fullPath, folder) => {
    fullPath += folder + path.sep;
    if (!fs.existsSync(fullPath)) {
      try {
        fs.mkdirSync(fullPath);
      } catch (e) {
        if (e.code !== 'EEXIST') {
          throw e;
        }
      }
    }
    return fullPath;
  }, '');
}

/**
 * Create symbolic link to current log file
 * @param {String} logfile
 * @param {String} name Name to use for symbolic link
 */
export function createCurrentSymLink(logfile, name) {
  const symLinkName = name || 'current.log';
  const logPath = dirname(logfile);
  const logfileName = basename(logfile);
  const current = logPath + '/' + symLinkName;
  try {
    const stats = fs.lstatSync(current);
    if (stats.isSymbolicLink()) {
      fs.unlinkSync(current);
      fs.symlinkSync(logfileName, current);
    }
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      try {
        fs.symlinkSync(logfileName, current);
      } catch (e) {
        console.error(
          new Date().toLocaleString(),
          '[FileStreamRotator] Could not create symlink file: ',
          current,
          ' -> ',
          logfileName
        );
      }
    }
  }
}

/**
 * Removes old log file
 * @param file
 * @param file.hash
 * @param file.name
 * @param file.date
 * @param file.hashType
 */
export function removeFile(file) {
  if (
    file.hash ===
    crypto
      .createHash(file.hashType)
      .update(file.name + 'LOG_FILE' + file.date)
      .digest('hex')
  ) {
    try {
      if (fs.existsSync(file.name)) {
        fs.unlinkSync(file.name);
      }
    } catch (e) {
      console.error(
        new Date().toLocaleString(),
        '[FileStreamRotator] Could not remove old log file: ',
        file.name
      );
    }
  }
}

export function isValidFileName(filename) {
  // eslint-disable-next-line no-control-regex
  return !/["<>|:*?\\/\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f]/g.test(
    filename
  );
}

export function isValidDirName(dirname) {
  // eslint-disable-next-line no-control-regex
  return !/["<>|\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f]/g.test(
    dirname
  );
}

export function getMaxSize(size) {
  if (size && typeof size === 'string') {
    const _s = size.toLowerCase().match(/^((?:0\.)?\d+)([k|m|g])$/);
    if (_s) {
      return size;
    }
  } else if (size && Number.isInteger(size)) {
    const sizeK = Math.round(size / 1024);
    return sizeK === 0 ? '1k' : sizeK + 'k';
  }

  return null;
}

export function throwIf(options, ...args) {
  Array.prototype.slice.call(args, 1).forEach(name => {
    if (options[name]) {
      throw new Error('Cannot set ' + name + ' and ' + args[0] + ' together');
    }
  });
}

export function debounce(func: () => void, wait: number, immediate?) {
  let timeout, args, context, timestamp, result;
  if (null == wait) wait = 100;

  function later() {
    const last = Date.now() - timestamp;

    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last);
    } else {
      timeout = null;
      if (!immediate) {
        result = func.apply(context, args);
        context = args = null;
      }
    }
  }

  const debounced: any = (...args) => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    context = this;
    timestamp = Date.now();
    const callNow = immediate && !timeout;
    if (!timeout) timeout = setTimeout(later, wait);
    if (callNow) {
      result = func.apply(context, args);
      context = args = null;
    }

    return result;
  };

  debounced.clear = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  debounced.flush = () => {
    if (timeout) {
      result = func.apply(context, args);
      context = args = null;

      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

export const isDevelopmentEnvironment = env => {
  return ['local', 'test', 'unittest'].includes(env);
};

const oldEnableOptionsKeys: {
  [key: string]: true;
} = {
  enableConsole: true,
  disableConsole: true,
  enableFile: true,
  enableError: true,
  enableJSON: true,
  disableFile: true,
  disableError: true,
};

/**
 * @param unknownLoggerOptions
 */
export function formatLoggerOptions(
  unknownLoggerOptions: LoggerOptions
): LoggerOptions {
  if (
    Object.keys(unknownLoggerOptions).some(key => oldEnableOptionsKeys[key])
  ) {
    const newOptions = { transports: {} } as LoggerOptions;

    for (const key of Object.keys(unknownLoggerOptions)) {
      if (!oldEnableOptionsKeys[key]) {
        newOptions[key] = unknownLoggerOptions[key];
      }
    }
    if (
      newOptions.transports['console'] &&
      (unknownLoggerOptions['enableConsole'] === false ||
        unknownLoggerOptions['disableConsole'] === true)
    ) {
      newOptions.transports['console'] = false;
    }

    if (
      newOptions.transports['file'] &&
      (unknownLoggerOptions['enableFile'] === false ||
        unknownLoggerOptions['disableFile'] === true)
    ) {
      newOptions.transports['file'] = false;
    }

    if (
      newOptions.transports['error'] &&
      (unknownLoggerOptions['enableError'] === false ||
        unknownLoggerOptions['disableError'] === true)
    ) {
      newOptions.transports['error'] = false;
    }

    if (
      newOptions.transports['json'] &&
      unknownLoggerOptions['enableJSON'] === false
    ) {
      newOptions.transports['json'] = false;
    }

    return newOptions;
  }

  return unknownLoggerOptions as LoggerOptions;
}

/**
 * Bubbles events to the proxy
 * @param emitter
 * @param proxy
 * @constructor
 */
export function BubbleEvents(emitter, proxy) {
  emitter.on('close', () => {
    proxy.emit('close');
  });
  emitter.on('finish', () => {
    proxy.emit('finish');
  });
  emitter.on('error', err => {
    proxy.emit('error', err);
  });
  emitter.on('open', fd => {
    proxy.emit('open', fd);
  });
}

export function isWin32() {
  return os.platform() === 'win32';
}

/**
 * @param date
 */
export function getFormatDate(date: Date) {
  function pad(num, size = 2) {
    const s = num + '';
    return s.padStart(size, '0');
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  const millisecond = date.getMilliseconds();

  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(
    second
  )}.${pad(millisecond, 3)}`;
}
