const path = require('path');
const util = require('util');
const fs = require('fs');
const mergeARMTemplates = require('../');

const readFile = util.promisify(fs.readFile);

describe('Merge', () => {
  it('should be able to merge a single template', async () => {
    const source = await readTestTemplate('website.json');

    const target = mergeARMTemplates({}, source);

    expect(target).toEqual(source);
  });

  it('should be able to merge multiple templates', async () => {
    let target = {};

    const sources = await Promise.all([
      'alertRules.json',
      'autoscaleSettings.json',
      'servicePlan.json',
      'website.json',
    ].map(filename => readTestTemplate(filename)));

    sources.forEach((source) => {
      target = mergeARMTemplates(target, source);
    });

    expect(target.resources).toHaveLength(6);

    sources.forEach((source) => {
      expect(target.$schema).toBe(source.$schema);
      expect(target.contentVersion).toBe(source.contentVersion);
      expect(target.apiProfile).toBe(source.apiProfile);
      expect(target.parameters).toMatchObject(source.parameters);
      expect(target.variables).toMatchObject(source.variables);
      expect(target.functions).toEqual(expect.arrayContaining(source.functions || []));
      expect(target.resources).toEqual(expect.arrayContaining(source.resources));
      expect(target.outputs).toMatchObject(source.outputs || {});
    });
  });

  it.each([
    ['$schema'],
    ['contentVersion'],
  ])('should throw an error if two templates have different values for field "%s"', async (fld) => {
    const template1 = await readTestTemplate('servicePlan.json');

    const template2 = await readTestTemplate('website.json');
    template2[fld] = `x${template2[fld]}`;

    const merge = () => mergeARMTemplates(template1, template2);

    expect(merge).toThrow(`Property "${fld}" cannot be merged. Source and target values are different.`);
  });

  it('should throw an error if two templates declare the same object property key with different values', async () => {
    const template1 = await readTestTemplate('servicePlan.json');

    const template2 = await readTestTemplate('website.json');
    template2.parameters.appName.defaultValue = 'dummy-app-name';

    const merge = () => mergeARMTemplates(template1, template2);

    expect(merge).toThrow('Property "parameters"."appName" cannot be merged. Source and target values are different.');
  });
});

async function readTestTemplate(filename) {
  const txt = await readFile(path.join(__dirname, 'templates', filename));
  return JSON.parse(txt);
}
