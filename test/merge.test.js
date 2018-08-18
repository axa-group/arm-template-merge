'use strict';

const path = require('path');
const util = require('util');
const fs = require('fs');
const mergeARMTemplates = require('../');

const readFile = util.promisify(fs.readFile);

describe('Merge', () => {
  it('should be able to merge a single template', async () => {
    let source = await readTestTemplate('website.json');

    let target = mergeARMTemplates({}, source);

    expect(target).toEqual(source);
  });

  it('should be able to merge multiple templates', async () => {
    let target = {};

    let sources = await Promise.all([
      'alertRules.json',
      'autoscaleSettings.json',
      'servicePlan.json',
      'website.json'
    ].map(filename => readTestTemplate(filename)));

    for (let source of sources) {
      target = mergeARMTemplates(target, source);
    }

    expect(target.resources).toHaveLength(6);

    for (let source of sources) {
      expect(target.$schema).toBe(source.$schema);
      expect(target.contentVersion).toBe(source.contentVersion);
      expect(target.apiProfile).toBe(source.apiProfile);
      expect(target.parameters).toMatchObject(source.parameters);
      expect(target.variables).toMatchObject(source.variables);
      expect(target.functions).toEqual(expect.arrayContaining(source.functions || []));
      expect(target.resources).toEqual(expect.arrayContaining(source.resources));
      expect(target.outputs).toMatchObject(source.outputs || {});
    }
  });

  it.each([
    [ '$schema' ],
    [ 'contentVersion' ]
  ])('should throw an error if two templates have different values for field "%s"', async fld => {
    let template1 = await readTestTemplate('servicePlan.json');
    
    let template2 = await readTestTemplate('website.json');
    template2[fld] = 'x' + template2[fld];

    let merge = () => mergeARMTemplates(template1, template2);

    expect(merge).toThrow(`Property "${fld}" cannot be merged. Source and target values are different.`);
  });

  it('should throw an error if two templates declare the same object property key with different values', async () => {
    let template1 = await readTestTemplate('servicePlan.json');
    
    let template2 = await readTestTemplate('website.json');
    template2.parameters.appName.defaultValue = 'dummy-app-name';

    let merge = () => mergeARMTemplates(template1, template2);

    expect(merge).toThrow('Property "parameters"."appName" cannot be merged. Source and target values are different.');
  });
});

async function readTestTemplate(filename) {
  let txt = await readFile(path.join(__dirname, 'templates', filename));
  return JSON.parse(txt);
}
