const util = require('util');

/* eslint no-console: off */

function mockExec(scriptPath, ...args) {
  const argv = process.argv; /* eslint-disable-line prefer-destructuring */
  process.argv = [argv[0], scriptPath, ...args];

  const log = new ConsoleOutHook('log');
  const error = new ConsoleOutHook('error');
  const exitCode = new ExitCodeHook();

  const res = {
    get stdout() { return log.output; },
    get stderr() { return error.output; },
    get exitCode() { return exitCode.value; },
    err: undefined,
    mockRestore: () => {
      process.argv = argv;
      log.mockRestore();
      error.mockRestore();
      exitCode.mockRestore();
    },
  };

  try {
    require(scriptPath); /* eslint-disable-line global-require, import/no-dynamic-require */
  } catch (err) {
    res.err = err;
  }

  return res;
}

function ConsoleOutHook(method) {
  this.output = '';

  const old = console[method];
  console[method] = (format, ...param) => {
    this.output += util.format(`${format}\n`, ...param);
  };

  this.mockClear = function mockClear() {
    this.output = '';
  };

  this.mockRestore = function mockRestore() {
    console[method] = old;
  };
}

function ExitCodeHook() {
  this.value = undefined;

  Object.defineProperty(process, 'exitCode', {
    get: () => undefined,
    set: (v) => { this.value = v; },
    configurable: true,
    enumerable: true,
  });

  this.mockRestore = function mockRestore() {
    delete process.exitCode;
  };
}

module.exports = {
  mockExec,
};
