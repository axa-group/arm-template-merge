# `arm-template-merge`

[![npm package](https://img.shields.io/npm/v/arm-template-merge.svg?logo=npm)](https://www.npmjs.com/package/arm-template-merge)
[![Node.js version](https://img.shields.io/node/v/arm-template-merge.svg)](https://nodejs.org/)

> _Azure Resource Manager (ARM) Template Merge_

This tool merges multiple [Azure Resource Manager (ARM) template](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-authoring-templates) files into a single template file.

Although [linked templates](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-linked-templates) may be used for combining multiple resources into a single deployment, they have some drawbacks:

- All linked templates must be accessible via a public URL so Azure Resource Manager can reach them during deployment, which may not be possible or cumbersome on some scenarios.
- Each linked template is resolved as a separate deployment, which may not be desired.
- Only the [incremental deployment mode](https://docs.microsoft.com/en-us/azure/azure-resource-manager/deployment-modes) is allowed for linked templates.

## Prerequisites

- [Node.js 12.0+](https://nodejs.org/)

## How to use

Install the CLI globally:

```shell
npm install -g arm-template-merge
```

Then run `arm-template-merge` without any arguments for details on its utilization.

Alternatively, you can execute the CLI without installing it by running:

```shell
npx arm-template-merge
```

### Adding it as a dependency

You may add it to your project as a dependency:

```shell
npm install arm-template-merge
```

And use the merge functionality from your code:

```javascript
const fs = require('fs');
const mergeARMTemplates = require('arm-template-merge');

let template1 = JSON.parse(fs.readFileSync('template1.json', 'utf8'));
let template2 = JSON.parse(fs.readFileSync('template2.json', 'utf8'));

let merged = {};
merged = mergeARMTemplates(merged, template1);
merged = mergeARMTemplates(merged, template2);

fs.writeFileSync('merged-template.json', JSON.stringify(merged), 'utf8');
```

## Rules

The following rules are used for merging ARM template files:

- All files MUST share the same exact values for the following fields:

  - `$schema`
  - `contentVersion`
  - `apiProfile` (if present)

- All files' `functions` and `resources` collections will each be combined into a single collection. Objects within a collection that are exact copies will yield a single object in the merged collection:

  ```text
  [                    |    [                    |    [
    { <object-A> },  --|-------------------------|-->   { <object-A> },
                       |      { <object-B> },  --|-->   { <object-B> },
    { <object-C> },    |      { <object-C> },    |      { <object-C> }
  ]                    |    ]                    |    ]
  ```

- All files' `parameters`, `variables` and `outputs` objects will each be combined into a single object. Files declaring the same key within an object MUST have the same exact value, or an error will be thrown:

  ```text
  {                    |    {                    |    {
    "A": <value-A>,  --|-------------------------|-->   "A": <value-A>,
                       |      "B": <value-B>,  --|-->   "B": <value-B>,
    "C": <value-C>,    |      "C": <value-C>,    |      "C": <value-C>
    "D": <value-D1>    |      "D": <value-D2>    |      <<< ERROR >>>
  }                    |    }                    |    }
  ```

- Value and object equality follows Node.js' [`assert.deepStrictEqual()`](https://nodejs.org/api/assert.html#assert_assert_deepstrictequal_actual_expected_message) rules.
