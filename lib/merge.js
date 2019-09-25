/**
 * Copyright (c) AXA Assistance France
 *
 * Licensed under the AXA Assistance France License (the "License"); you
 * may not use this file except in compliance with the License.
 * A copy of the License can be found in the LICENSE.md file distributed
 * together with this file.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Merges a source ARM template object into a target ARM template.
 * Returns the target ARM template.
 * @param {object} a The target ARM template.
 * @param {object} b The source ARM template.
 * @param {string} name The name of the current property, undefined if root.
 * @param {number} level Current depth level.
 * @param {number} maxLevel Maximum level of depth to be checked.
 * @returns {object} The target ARM template.
 */
module.exports = function merge(a, b, name, level = 0, maxLevel = 1) {
  if (level <= maxLevel && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a)) {
      return a.concat(b.filter((x) => !a.some((y) => JSON.stringify(x) === JSON.stringify(y))));
    }
    Object.keys(b).forEach((key) => {
      a[key] = merge(a[key], b[key], name ? `${name}.${key}` : key, level + 1, maxLevel);
    });
  } else if (a !== undefined && b !== undefined && JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`Property "${name}" cannot be merged. Source and target values are different.`);
  }
  return a || b;
};
