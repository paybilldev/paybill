import { FileStreamRotator } from '../src/transport/fileStreamRotator';
import * as crypto from 'crypto';
import { writeFileSync, remove, ensureFile, lstat, readdirSync } from 'fs-extra';
import { join } from 'path';
import { createChildProcess, sleep } from './util';
import { beforeEach, describe, expect, it } from "vitest";

describe('/test/stream-rotate.test.ts', () => {

  beforeEach(async () => {
    await remove(join(__dirname, 'logs'));
  });

  it('test every second', async () => {
    const rotator = new FileStreamRotator();
    const rotatingLogStream = rotator.getStream({
      filename: join(__dirname, 'logs/1s/testlog-%DATE%.log'),
      frequency: 'custom',
      dateFormat: 'YYYY-MM-DD.HH.mm',
      size: '50k',
      maxFiles: '5',
      auditFile: '/tmp/audit-1s.json',
      endStream: false,
      utc: true,
      extension: '.logs',
      auditHashType: 'sha256',
    });

    rotatingLogStream.on('error', function (err) {
      console.error(Date.now(), Date(), 'stream error', err);
    });

    rotatingLogStream.on('close', function () {
      console.log(Date.now(), Date(), 'stream closed');
    });

    rotatingLogStream.on('finish', function () {
      console.log(Date.now(), Date(), 'stream finished');
    });

    rotatingLogStream.on('rotate', function (oldFile, newFile) {
      console.log(Date.now(), Date(), 'stream rotated', oldFile, newFile);
    });

    rotatingLogStream.on('open', function (fd) {
      console.log(Date.now(), Date(), 'stream open', fd);
    });

    rotatingLogStream.on('new', function (newFile) {
      console.log(Date.now(), Date(), 'stream new', newFile);
    });

    await new Promise<void>((resolve) => {
      let counter = 0;
      const i = setInterval(() => {
        counter++;

        rotatingLogStream.write(Date() + ' Mon Jan 11 2026 ... New Balance’s long history of over 100 years\n');

        if (counter === 400) {
          clearInterval(i);
          console.log(Date() + '\tEND STREAM');
          rotatingLogStream.end('end\n');
          resolve();
          return;
        }

        rotatingLogStream.write(Date() + '\t');
        for (let y = 0; y < 400; y++) {
          rotatingLogStream.write('OK: ' + Date.now() + ' >> ');
        }
        rotatingLogStream.write('\n');
      }, 10);
    });
  });

  it('test minute-test', async () => {
    const rotator = new FileStreamRotator();
    const rotatingLogStream = rotator.getStream({
      filename: join(__dirname, 'logs/1m/testlog-%DATE%'),
      frequency: '1m',
      dateFormat: 'YYYY-MM-DD.HH.mm',
      size: '100k',
      maxFiles: '10',
      auditFile: '/tmp/audit.json',
      endStream: false,
      utc: true,
      extension: '.log',
      createSymlink: true,
      symlinkName: 'tail.log'
    });

    rotatingLogStream.on('error', function (err) {
      console.error(Date.now(), Date(), 'stream error', err);
    });

    rotatingLogStream.on('close', function () {
      console.log(Date.now(), Date(), 'stream closed');
    });

    rotatingLogStream.on('finish', function () {
      console.log(Date.now(), Date(), 'stream finished');
    });

    rotatingLogStream.on('rotate', function (oldFile, newFile) {
      console.log(Date.now(), Date(), 'stream rotated', oldFile, newFile);
    });

    rotatingLogStream.on('open', function (fd) {
      console.log(Date.now(), Date(), 'stream open', fd);
    });

    rotatingLogStream.on('new', function (newFile) {
      console.log(Date.now(), Date(), 'stream new', newFile);
    });

    rotatingLogStream.on('logRemoved', function (newFile) {
      console.log(Date.now(), Date(), 'stream logRemoved', newFile);
    });

    await new Promise<void>((resolve) => {
      let counter = 0;
      const i = setInterval(function () {
        counter++;
        rotatingLogStream.write(Date() + '\t' + 'testing 1234567890...\n');

        if (counter === 5000) {
          clearInterval(i);
          rotatingLogStream.end('end\n');
          resolve();
        }
      }, 10);
    });
  });

  it('should test large', async () => {
    const buffer: Buffer = await new Promise(resolve => {
      crypto.randomBytes(1048, (err, buffer) => resolve(buffer));
    });

    const token = buffer.toString('hex');
    const rotator = new FileStreamRotator();
    const logStream = rotator.getStream({
      filename: './logs/application-%DATE%',
      frequency: 'custom',
      maxFiles: 4,
      endStream: true,
      extension: ".log",
      createSymlink: true
    });

    let count = 0;
    const i = setInterval(() => {
      if (count > 300) {
        clearInterval(i);
        logStream.end("end");
        return;
      }
      count++;
      logStream.write(token + "\n");
    }, 10);
  });

  it('should test rotate log when file has limit size', async () => {
    const buffer: Buffer = await new Promise(resolve => {
      crypto.randomBytes(1048, (err, buffer) => resolve(buffer));
    });

    const logFile = join(__dirname, 'logs/test.log');
    const newLogFile = join(__dirname, 'logs/test.log.1');
    const token = buffer.toString('hex');
    await ensureFile(logFile);
    writeFileSync(logFile, token);

    const rotator = new FileStreamRotator();
    const logStream = rotator.getStream({
      filename: logFile,
      size: '2k',
      endStream: true,
    });

    let i = 100;
    while (i-- >= 0) logStream.write('hello world\n');

    logStream.end();
    await sleep();
    expect((await lstat(logFile)).size).toEqual(2096);
    expect((await lstat(newLogFile)).size).toEqual(1212);
  });

  it('should test rotate log when file has limit size2', async () => {
    const buffer: Buffer = await new Promise(resolve => {
      crypto.randomBytes(1000, (err, buffer) => resolve(buffer));
    });

    const logFile = join(__dirname, 'logs/test.log');
    const newLogFile = join(__dirname, 'logs/test.log.1');
    const token = buffer.toString('hex');
    await ensureFile(logFile);
    writeFileSync(logFile, token);

    const rotator = new FileStreamRotator();
    const logStream = rotator.getStream({
      filename: logFile,
      size: '2k',
      endStream: true,
    });

    let i = 100;
    while (i-- >= 0) logStream.write('hello world\n');

    logStream.end();
    await sleep();
    expect((await lstat(logFile)).size).toEqual(2060);
    expect((await lstat(newLogFile)).size).toEqual(1152);
  });

  it('should test write big data over limit', async () => {
    const buffer: Buffer = await new Promise(resolve => {
      crypto.randomBytes(400, (err, buffer) => resolve(buffer));
    });

    const logFile = join(__dirname, 'logs/test.log');
    const newLogFile = join(__dirname, 'logs/test.log.1');
    const token = buffer.toString('hex');
    await ensureFile(logFile);

    const rotator = new FileStreamRotator();
    const logStream = rotator.getStream({
      filename: logFile,
      size: '1k',
      endStream: true,
    });

    logStream.write(token);
    logStream.write(token);
    logStream.write(token);
    logStream.end();
    await sleep();

    expect((await lstat(logFile)).size).toEqual(1600);
    expect((await lstat(newLogFile)).size).toEqual(800);
  });

  it('should test rotate log when frequency set', async () => {
    const logFile = join(__dirname, 'logs/test.log');
    const rotator = new FileStreamRotator();
    const logStream = rotator.getStream({
      filename: logFile,
      frequency: '5s',
      dateFormat: 'YYYY-MM-DD-HHmmss',
      endStream: true,
    });

    for (let i = 0; i < 10; i++) {
      logStream.write('hello world\n');
      await sleep();
    }
    logStream.end();

    const files = readdirSync(join(__dirname, 'logs'));
    expect(files.length).toBeGreaterThanOrEqual(2);
  });

  it('should test rotate on size without date', function () {
    const rotator = new FileStreamRotator();
    const rotatingLogStream = rotator.getStream({
      filename: join(__dirname, 'logs/nodate/logfile'),
      size: '50k',
      maxFiles: '5',
      auditFile: join(__dirname, 'logs/audit-nodate.json'),
      endStream: false,
      extension: '.log'
    });

    rotatingLogStream.on('error', function (err) {
      console.error(Date.now(), Date(), 'stream error', err);
      throw err;
    });

    rotatingLogStream.on('close', function () {
      console.log(Date.now(), Date(), 'stream closed');
    });

    rotatingLogStream.on('finish', function () {
      console.log(Date.now(), Date(), 'stream finished');
    });

    rotatingLogStream.on('rotate', function (oldFile, newFile) {
      console.log(Date.now(), Date(), 'stream rotated', oldFile, newFile);
    });

    rotatingLogStream.on('open', function (fd) {
      console.log(Date.now(), Date(), 'stream open', fd);
    });

    rotatingLogStream.on('new', function (newFile) {
      console.log(Date.now(), Date(), 'stream new', newFile);
    });

    rotatingLogStream.on('addWatcher', function (newLog) {
      console.log(Date.now(), Date(), 'stream add watcher', newLog);
    });

    let counter = 0;
    let i = setInterval(function () {
      counter++;
      rotatingLogStream.write(Date() + ' Mon Jan 11 2026 ... New Balance’s long history of over 100 years\n');

      if (counter === 400) {
        clearInterval(i);
        console.log(Date() + '\tEND STREAM');
        rotatingLogStream.end('end\n');
        return;
      }

      rotatingLogStream.write(Date() + '\t');
      for (let y = 0; y < 400; y++) {
        rotatingLogStream.write('OK: ' + Date.now() + ' >> ');
      }
      rotatingLogStream.write('\n');
    }, 10);
  });
});
