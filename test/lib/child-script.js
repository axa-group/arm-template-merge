'use strict';

const util = require('util');

/* eslint no-console: off */

function mockExec(scriptPath, ...args) {
  let argv = process.argv;
  process.argv = [ argv[0], scriptPath, ...args ];

  let log = new ConsoleOutHook('log');
  let error = new ConsoleOutHook('error');
  let exitCode = new ExitCodeHook();

  let res = {
    get stdout() { return log.output; },
    get stderr() { return error.output; },
    get exitCode() { return exitCode.value; },
    err: undefined,
    mockRestore: () => {
      process.argv = argv;
      log.mockRestore();
      error.mockRestore();
      exitCode.mockRestore();
    }
  };

  try {
    require(scriptPath);
  } catch (err) {
    res.err = err;
  }

  return res;
}

function ConsoleOutHook(method) {
  this.output = '';

  let old = console[method];
  console[method] = (format, ...param) => {
    this.output += util.format(format, ...param) + '\n';
  };

  this.mockClear = function() {
    this.output = '';
  };

  this.mockRestore = function() {
    console[method] = old;
  };
}

function ExitCodeHook() {
  this.value = undefined;
  
  Object.defineProperty(process, 'exitCode', {
    get: () => undefined,
    set: (v) => this.value = v,
    configurable: true,
    enumerable: true
  });
  
  this.mockRestore = function() {
    delete process.exitCode;
  };
}

module.exports = {
  mockExec
};
