/**
* Copyright (c) AXA Partners
*
* Licensed under the AXA Partners License (the "License"); you
* may not use this file except in compliance with the License.
* A copy of the License can be found in the LICENSE.md file distributed
* together with this file.
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
**/

'use strict';

const assert = require('assert');

/**
 * Merges a source ARM template object into a target ARM template.
 * Returns the target ARM template.
 * @param {object} target The target ARM template.
 * @param {object} source The source ARM template.
 * @returns {object} The target ARM template.
 */
function mergeARMTemplates(target, source) {
  mergeLiteralProperty(target, source, '$schema');
  mergeLiteralProperty(target, source, 'contentVersion');
  mergeLiteralProperty(target, source, 'apiProfile');
  mergeObjectProperty(target, source, 'parameters');
  mergeObjectProperty(target, source, 'variables');
  mergeArrayProperty(target, source, 'functions');
  mergeArrayProperty(target, source, 'resources');
  mergeObjectProperty(target, source, 'outputs');

  return target;
}

function mergeLiteralProperty(target, source, key) {
  if (copyPropertyIfUndefined(target, source, key)) {
    return;
  }

  if (isDeepStrictEqual(source[key], target[key])) {
    return;
  }

  throw new Error(`Property "${key}" cannot be merged. Source and target values are different.`);
}

function mergeObjectProperty(target, source, key) {
  if (copyPropertyIfUndefined(target, source, key)) {
    return;
  }

  let srcObject = source[key];
  let tgtObject = target[key];

  for (let objKey of Object.keys(srcObject)) {
    if (copyPropertyIfUndefined(tgtObject, srcObject, objKey)) {
      continue;
    }

    if (isDeepStrictEqual(srcObject[objKey], tgtObject[objKey])) {
      continue;
    }

    throw new Error(`Property "${key}"."${objKey}" cannot be merged. Source and target values are different.`);
  }
}

function mergeArrayProperty(target, source, key) {
  if (copyPropertyIfUndefined(target, source, key)) {
    return;
  }

  let srcArray = source[key];
  let tgtArray = target[key];

  for (let srcObject of srcArray) {
    if (tgtArray.some(tgtObject => isDeepStrictEqual(tgtObject, srcObject))) {
      continue;
    }

    tgtArray.push(srcObject);
  }
}

function copyPropertyIfUndefined(target, source, key) {
  if (typeof source[key] === 'undefined') {
    return true;
  }

  if (typeof target[key] === 'undefined') {
    target[key] = source[key];
    return true;
  }

  return false;
}

function isDeepStrictEqual(left, right) {
  try {
    assert.deepStrictEqual(left, right);
    return true;
  } catch (ex) {
    return false;
  }
}

module.exports = mergeARMTemplates;
