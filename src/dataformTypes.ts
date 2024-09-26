type Sqlx = {
  config: {
    type:
      | "table"
      | "view"
      | "incremental"
      | "declaration"
      | "assertion"
      | "test";
    schema?: string;
    columns?: {
      [columnName: string]:
        | {
            description: string;
            bigqueryPolicyTags: string | string[];
          }
        | string;
    };
  };

  path: string;
  content: string;
};

type Target = {
  schema: string;
  name: string;
  database: string;
};

type ActionDescriptor = {
  columns: {
    description: string;
    path: string[];
  }[];
};

type DataformTable = {
  type?: string;
  target: Target;
  query?: string;
  disabled?: boolean;
  fileName: string;
  actionDescriptor?: ActionDescriptor;
  dependencyTargets?: Target[];
  canonicalTarget: Target;
  enumType?: string;
};

type DataformProject = {
  tables: DataformTable[];
  declarations: DataformTable[];
  projectConfig: {
    warehouse: string;
    defaultSchema: string;
    assertionSchema: string;
    defaultDatabase: string;
    defaultLocation: string;
  };
  graphErrors: {
    [key: string]: any;
  };
  dataformCoreVersion: string;
  targets: Target[];
};

type BigQueryTable = {
  dataset: string;
  table: string;
  fields: {
    name: string;
    type: string;
    description?: string;
    mode?: string;
  }[];
};

class DataformOsmosisTable {
  sqlx: Sqlx;
  dataformTable: DataformTable;
  bigqueryTable: BigQueryTable;

  constructor(
    sqlx: Sqlx,
    dataformTable: DataformTable,
    bigqueryTable: BigQueryTable
  ) {
    this.sqlx = sqlx;
    this.dataformTable = dataformTable;
    this.bigqueryTable = bigqueryTable;
  }
}

export type { DataformProject, Sqlx, DataformOsmosisTable };
