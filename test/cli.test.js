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
    const res = await executeCli();

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/^Usage: arm-template-merge <input-template-pattern>... <output-template>/);
    expect(res.stderr).toBe('');
  });

  it('should print out usage information if less than 2 arguments are provided', async () => {
    const res = await executeCli('merged-template.json');

    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/^Usage: arm-template-merge <input-template-pattern>... <output-template>/);
    expect(res.stderr).toBe('');
  });

  it('should show an error message if no input files were found', async () => {
    const res = await executeCli('./**/a-template-that-does-not-exist.json', 'merged-template.json');

    expect(res.exitCode).toBe(1);
    expect(res.stderr).toMatch(/^Error: No template files could be found\./);
    expect(res.stdout).toBe('');
  });

  it('should show an error message if an input file is not a JSON file', async () => {
    const rfn = mockFileRead(new Map([
      ['templates/website.json', 'This is NOT JSON!'],
    ]));

    const res = await executeCli('templates/*.json', 'merged-template.json');

    rfn.mockRestore();

    expect(res.exitCode).toBe(1);
    expect(res.stderr).toMatch(/^Error: Template 'templates\/website.json' could not be parsed:/);
  });

  it('should be able to merge template files into a new file', async () => {
    const wfn = mockWriteFile();

    const res = await executeCli('templates/*.json', 'merged-template.json');

    expect(res.exitCode).toBe(0);
    expect(res.stderr).toBe('');

    const inFiles = getInFiles(res.stdout);
    const outFile = getOutFile(res.stdout);

    expect(inFiles.sort()).toMatchObject([
      'templates/alertRules.json',
      'templates/autoscaleSettings.json',
      'templates/servicePlan.json',
      'templates/website.json',
    ]);

    expect(outFile).toBe('merged-template.json');

    expect(wfn).toHaveBeenCalledTimes(1);
    const [outFilename, data] = wfn.mock.calls[0];

    wfn.mockRestore();

    expect(outFilename).toBe('merged-template.json');
    expect(() => JSON.parse(data)).not.toThrow();
  });

  it('should be able to read template files with a UTF-8 BOM', async () => {
    const utf8BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

    const files = [
      'templates/alertRules.json',
      'templates/autoscaleSettings.json',
      'templates/servicePlan.json',
      'templates/website.json',
    ];

    const bufs = await Promise.all(files.map((file) => readFile(file)));

    const mockFiles = new Map();

    for (let i = 0; i < files.length; i += 1) {
      const buf = Buffer.concat([utf8BOM, bufs[i]]);
      mockFiles.set(files[i], buf);
    }

    const rfn = mockFileRead(mockFiles);
    const wfn = mockWriteFile();

    const res = await executeCli('templates/*.json', 'merged-template.json');

    rfn.mockRestore();

    expect(res.exitCode).toBe(0);
    expect(res.stderr).toBe('');

    expect(wfn).toHaveBeenCalledTimes(1);
    const [outFilename, data] = wfn.mock.calls[0];

    wfn.mockRestore();

    expect(outFilename).toBe('merged-template.json');
    expect(() => JSON.parse(data)).not.toThrow();
  });

  it.each([
    ['$schema', null],
    ['$schema', 0],
    ['contentVersion', null],
    ['contentVersion', 0],
  ])('should show an error message if a template has an invalid value for field "%s" (%o)', async (fld, value) => {
    const template = JSON.parse(await readFile('templates/website.json'));
    template[fld] = value;

    const rfn = mockFileRead(new Map([
      ['templates/website.json', JSON.stringify(template)],
    ]));

    const res = await executeCli('templates/*.json', 'merged-template.json');

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

    if (typeof body === 'string') {
      body = Buffer.from(body, 'utf8');
    }

    const cb = args[args.length - 1];

    return cb(null, body);
  });
}

function mockWriteFile() {
  return jest.spyOn(fs, 'writeFile').mockImplementation((...args) => { args[args.length - 1](); });
}

function getInFiles(stdout) {
  const rx = /^Merging ARM template '(.*)'\.\.\.$/gm;

  const res = [];

  let m = rx.exec(stdout);
  while (m != null) {
    res.push(m[1]);
    m = rx.exec(stdout);
  }

  return res;
}

function getOutFile(stdout) {
  const rx = /^Saved merged ARM template '(.*)'\.$/m;

  const m = rx.exec(stdout);

  return m ? m[1] : null;
}

async function executeCli(...args) {
  const res = cs.mockExec(cliPath, ...args);
  const done = await waitFor(() => typeof res.exitCode !== 'undefined' || res.err, 200, 2000);
  res.mockRestore();

  if (!done) {
    throw new Error('Timeout awaiting for CLI to finish execution.');
  }

  expect(res.err).toBeUndefined();

  return res;
}

async function waitFor(conditionFn, watchInterval, timeout) {
  return new Promise((resolve) => {
    if (conditionFn()) {
      resolve(true);
      return;
    }

    const watchTimer = setInterval(() => {
      if (conditionFn()) {
        clearTimers();
        resolve(true);
      }
    }, watchInterval);

    const timeoutTimer = setTimeout(() => {
      clearTimers();
      resolve(false);
    }, timeout);

    function clearTimers() {
      clearInterval(watchTimer);
      clearTimeout(timeoutTimer);
    }
  });
}
