# Dataform Osmosis

![Build Status](https://github.com/hiracky16/dataform-osmosis/actions/workflows/release.yml/badge.svg)
![npm version](https://img.shields.io/npm/v/dataform-osmosis)
![license](https://img.shields.io/badge/license-Apache%202.0-blue)


`dataform-osmosis` is a CLI tool for refactoring and managing `Dataform` SQLX files.

**Note**: This project, `dataform-osmosis`, was inspired by [dbt-osmosis](https://github.com/z3z1ma/dbt-osmosis).

It allows users to automatically update column information by synchronizing with BigQuery table schemas, reorder columns based on actual BigQuery tables, and inherit column descriptions from referenced tables. This is especially useful when working with complex SQLX files and maintaining consistency between Dataform and BigQuery.

## Features

- **Synchronize SQLX with BigQuery**: Automatically update column information from the actual BigQuery tables.
- **Inherit Column Descriptions**: Inherit column descriptions from tables referenced in SQLX files, based on column names.

## Installation

To install `dataform-osmosis`, use the following commands:

```bash
npm install -g dataform-osmosis
```

Alternatively, if you're developing locally, you can link the package:

```bash
npm link
```

## Configuration
You can specify workflow settings in a workflow_settings.yaml file, similar to the default Dataform CLI settings:
```yaml
defaultProject: your-project-id
defaultLocation: asia-northeast1
defaultDataset: dataform
defaultAssertionDataset: dataform_assertions
```

You can also specify settings in a dataform.json file.
```json
{
    "defaultProject": "your-project-id",
    "defaultLocation": "asia-northeast1",
    "defaultDataset": "dataform",
    "defaultAssertionDataset": "dataform_assertions"
}
```

### Setting Up Google Cloud Authentication
`dataform-osmosis` uses the Google Cloud BigQuery client internally, which requires authentication. For authentication, please use one of the methods described in the Google Cloud documentation: [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials) .

By following these authentication methods, the BigQuery client within dataform-osmosis will be able to access your project resources and provide full functionality.

### Setting Up Dataform CLI

`dataform-osmosis` relies on the `@dataform/cli` commands internally, so you’ll need to install and configure the Dataform CLI to use the tool effectively.

To install the Dataform CLI, use the following command:
```bash
npm i -g @dataform/cli
```

For detailed setup instructions and usage, please refer to the official Dataform CLI documentation: [Using the Dataform CLI](https://cloud.google.com/dataform/docs/use-dataform-cli) .


## Usage

The tool provides various commands to refactor SQLX files and manage Dataform projects.

### Validate the Dataform project

You can validate the current Dataform project to ensure all configurations are correct by running:
This command checks the BigQuery configuration and ensures the Dataform CLI is properly set up.

```bash
dataform-osmosis valid
```

### Refactor SQLX files
To refactor SQLX files by updating column information and reordering columns, use the refactor command:

```bash
dataform-osmosis sqlx refactor -f [file_or_directory]
```

For example:

```bash
dataform-osmosis sqlx refactor -f definitions/marts/test
```

This command refactors all SQLX files within the definitions/marts/test directory, or a single SQLX file if specified. It performs the following operations:

1. Add missing columns: Adds columns that exist in BigQuery but are missing in the SQLX file.
2. Reorder columns: Ensures columns are in the correct order as in BigQuery.
3. Inherit column descriptions: Copies column descriptions from referenced tables when columns share the same name.

### Example

Given the following SQLX configuration in a file:

```sql
config {
  type: "table",
  schema: "dataform",
  columns: {
    id: "id",
    name: {
      description: "Name of the user",
    }
  }
}
```

If the BigQuery table has an additional column age and the referenced table has the same column name with a description, dataform-osmosis will update the SQLX file to include the missing column and update descriptions where needed.

## Development
If you're contributing to dataform-osmosis or developing locally, follow these steps to set up your environment:

### 1. Install dependencies
```bash
npm install
```

### 2. Run tests
You can run tests using the following command:

```bash
npm test
```
Tests are written with Jest to ensure that the tool behaves as expected.

### 3. Link the package locally
For local development and testing, you can link the package:
```bash
npm link
```
This allows you to use the dataform-osmosis command globally during development.

## License
dataform-osmosis is licensed under the Apache-2.0 License.

## Issues & Contributing
If you encounter any issues or have feature requests, please submit them via the GitHub Issues page. Contributions are welcome! Please refer to the Contributing Guidelines for more information.
