type Sqlx = {
  config: SqlxConfig | OverridedSqlxConfig;
  path: string;
  content: string;
};

export type SqlxConfig = {
  type: "table" | "view" | "incremental" | "declaration" | "assertion" | "test";
  schema?: string;
  columns?: {
    [columnName: string]:
      | {
          description: string;
          bigqueryPolicyTags?: string | string[];
        }
      | string;
  };
};

export type OverridedSqlxConfig = {
  type: "table" | "view" | "incremental" | "declaration" | "assertion" | "test";
  schema?: string;
  columns?: {
    [columnName: string]: {
      description: string;
      bigqueryPolicyTags?: string | string[];
    };
  };
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
    description?: string;
    policy_tags?: { names: string[] };
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

type WorkflowSettings = {
  defaultProject: string;
  defaultLocation: string;
  defaultDataset: string;
  defaultAssertionDataset: string;
};

export type {
  DataformProject,
  Sqlx,
  DataformOsmosisTable,
  BigQueryTable,
  DataformTable,
  WorkflowSettings,
};
