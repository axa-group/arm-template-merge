'use strict';

const util = require('util');
const fs = require('fs');
const cs = require('./lib/child-script');

const originalReadFile = fs.readFile;
const readFile = util.promisify(originalReadFile);

const cliPath = require.resolve('../bin/arm-template-merge');

describe('CLI', () => {
  let cwd;

  beforeEach(() => {
    jest.resetModules();
    cwd = process.cwd();
    process.chdir(__dirname);
  });

  afterEach(() => {
    process.chdir(cwd);
  });

  it('should be able to print out usage information', async () => {
    let res = await executeCli();

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/^Usage: arm-template-merge <input-template-pattern>... <output-template>/);
    expect(res.stderr).toBe('');
  });

  it('should print out usage information if less than 2 arguments are provided', async () => {
    let res = await executeCli('merged-template.json');

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/^Usage: arm-template-merge <input-template-pattern>... <output-template>/);
    expect(res.stderr).toBe('');
  });

  it('should show an error message if no input files were found', async () => {
    let res = await executeCli('./**/a-template-that-does-not-exist.json', 'merged-template.json');

    expect(res.exitCode).toBe(1);
    expect(res.stderr).toMatch(/^Error: No template files could be found\./);
    expect(res.stdout).toBe('');
  });

  it('should show an error message if an input file is not a JSON file', async () => {
    let rfn = mockFileRead(new Map([
      [ 'templates/website.json', 'This is NOT JSON!' ]
    ]));

    let res = await executeCli('templates/*.json', 'merged-template.json');

    rfn.mockRestore();

    expect(res.exitCode).toBe(1);
    expect(res.stderr).toMatch(/^Error:/);
  });

  it('should be able to merge template files into a new file', async() => {
    let wfn = mockWriteFile();

    let res = await executeCli('templates/*.json', 'merged-template.json');

    expect(res.exitCode).toBe(0);
    expect(res.stderr).toBe('');

    let inFiles = getInFiles(res.stdout);
    let outFile = getOutFile(res.stdout);

    expect(inFiles.sort()).toMatchObject([
      'templates/alertRules.json',
      'templates/autoscaleSettings.json',
      'templates/servicePlan.json',
      'templates/website.json'
    ]);

    expect(outFile).toBe('merged-template.json');

    expect(wfn).toHaveBeenCalledTimes(1);
    let [ outFilename, data ] = wfn.mock.calls[0];

    wfn.mockRestore();

    expect(outFilename).toBe('merged-template.json');
    expect(() => JSON.parse(data)).not.toThrow();
  });

  it.each([
    [ '$schema', null ],
    [ '$schema', 0 ],
    [ 'contentVersion', null ],
    [ 'contentVersion', 0 ]
  ])('should show an error message if a template has an invalid value for field "%s" (%o)', async (fld, value) => {
    let template = JSON.parse(await readFile('templates/website.json'));
    template[fld] = value;

    let rfn = mockFileRead(new Map([
      [ 'templates/website.json', JSON.stringify(template) ]
    ]));

    let res = await executeCli('templates/*.json', 'merged-template.json');

    rfn.mockRestore();

    expect(res.exitCode).toBe(1);
    expect(res.stderr).toMatch(`Error: Template 'templates/website.json' does not have a valid "${fld}" value.`);
  });
});

function mockFileRead(fileMap) {
  return jest.spyOn(fs, 'readFile').mockImplementation((...args) => {
    let body = fileMap.get(args[0]);

    if (!body) {
      return originalReadFile(...args);
    }

    let cb = args[args.length - 1];

    return cb(null, body);
  });
}

function mockWriteFile() {
  return jest.spyOn(fs, 'writeFile').mockImplementation((...args) => { args[args.length - 1](); });
}

function getInFiles(stdout) {
  let rx = /^Merging ARM template '(.*)'\.\.\.$/gm;

  let res = [];

  let m;
  while ((m = rx.exec(stdout)) != null) {
    res.push(m[1]);
  }

  return res;
}

function getOutFile(stdout) {
  let rx = /^Saved merged ARM template '(.*)'\.$/m;

  let m = rx.exec(stdout);
  
  return m ? m[1] : null;
}

async function executeCli(...args) {
  let res = cs.mockExec(cliPath, ...args);
  let done = await waitFor(() => typeof res.exitCode !== 'undefined' || res.err, 200, 2000);
  res.mockRestore();

  if (!done) {
    throw new Error('Timeout awaiting for CLI to finish execution.');
  }

  expect(res.err).toBeUndefined();

  return res;
}

async function waitFor(conditionFn, watchInterval, timeout) {
  return new Promise(resolve => {
    if (conditionFn()) {
      resolve(true);
      return;
    }

    let watchTimer = setInterval(() => {
      if (conditionFn()) {
        clearTimers();
        resolve(true);
      }
    }, watchInterval);
    
    let timeoutTimer = setTimeout(() => {
      clearTimers();
      resolve(false);
    }, timeout);

    function clearTimers() {
      clearInterval(watchTimer);
      clearTimeout(timeoutTimer);
    }
  });
}
