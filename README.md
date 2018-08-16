# `arm-template-merge`

> _Azure Resource Manager (ARM) Template Merge_

This tool merges multiple [Azure Resource Manager (ARM) template](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-authoring-templates) files into a single template file.

Although [linked templates](https://docs.microsoft.com/en-us/azure/azure-resource-manager/resource-group-linked-templates) may be used for combining multiple resources into a single deployment, they have some drawbacks:

- All linked templates must be accessible via a public URL so Azure Resource Manager can reach them during deployment, which may not be possible or cumbersome on some scenarios.
- Each linked template is resolved as a separate deployment, which may not be desired.
- Only the [incremental deployment mode](https://docs.microsoft.com/en-us/azure/azure-resource-manager/deployment-modes) is allowed for linked templates.

## Prerequisites

- [Node.js 8.0+](https://nodejs.org/)

## How to use

Install the CLI globally:

```shell
npm install -g arm-template-merge
```

Then run `arm-template-merge` without any arguments for details on its utilization.

## Rules

The following rules are used for merging ARM template files:

- All files MUST share the same exact values for the following fields:

  - `$schema`
  - `contentVersion`
  - `apiProfile` (if present)

- All files' `functions` and `resources` collections will each be combined into a single collection. Objects within a collection that are exact copies will yield a single object in the merged collection:

  ```json
  [                    |    [                    |    [
    { <object-A> },  --|-------------------------|-->   { <object-A> },
                       |      { <object-B> },  --|-->   { <object-B> },
    { <object-C> },    |      { <object-C> },    |      { <object-C> }
  ]                    |    ]                    |    ]
  ```

- All files' `parameters`, `variables` and `outputs` objects will each be combined into a single object. Files declaring the same key within an object MUST have the same exact value, or an error will be thrown:

  ```json
  {                    |    {                    |    {
    "A": <value-A>,  --|-------------------------|-->   "A": <value-A>,
                       |      "B": <value-B>,  --|-->   "B": <value-B>,
    "C": <value-C>,    |      "C": <value-C>,    |      "C": <value-C>
    "D": <value-D1>    |      "D": <value-D2>    |      <<< ERROR >>>
  }                    |    }                    |    }
  ```

- Value and object equality follows Node.js' [`assert.deepStrictEqual()`](https://nodejs.org/api/assert.html#assert_assert_deepstrictequal_actual_expected_message) rules.
