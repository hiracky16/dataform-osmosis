import {
  BigQueryTable,
  DataformProject,
  DataformTable,
  SqlxConfig,
} from "./types";
import * as fs from "fs";

type FileSqlxConfig = SqlxConfig & {
  columns?: {
    [columnName: string]:
      | {
          description: string;
          bigqueryPolicyTags?: string | string[];
        }
      | string;
  };
};

class Sqlx {
  public filePath: string;
  private config: SqlxConfig;
  dependencies: Sqlx[] = [];
  public dataformTable: DataformTable;

  constructor(sqlxFilePath: string, dataformTable: DataformTable) {
    this.filePath = sqlxFilePath;
    this.dataformTable = dataformTable; // DataformTable を保持
    this.config = this.loadConfig();
  }

  // SQLX ファイルの config を読み込む
  private loadConfig(): SqlxConfig {
    let config: FileSqlxConfig;
    const sqlxContent = fs.readFileSync(this.filePath, "utf-8");
    const configMatch = sqlxContent.match(
      /config\s*\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/
    );
    if (!configMatch) {
      console.info(`No config block found in ${this.filePath}`);
      config = {
        type: "table",
        columns: {},
      };
      return config;
    }

    try {
      const configContent = configMatch[0]
        .replace(/config\s*/, "")
        .replace(/(\w+):/g, '"$1":')
        .replace(/'/g, '"');
      config = JSON.parse(configContent);
    } catch (error) {
      throw new Error(`Failed to parse config in ${this.filePath}: ${error}`);
    }

    if (!config.columns) {
      config.columns = {};
      return config;
    }

    Object.keys(config.columns).forEach((columnName) => {
      const column = config.columns[columnName];

      if (typeof column === "string") {
        config.columns[columnName] = {
          description: column,
        };
      } else {
        config.columns[columnName] = column;
      }

      const bigqueryPolicyTags = column.bigqueryPolicyTags;
      if (bigqueryPolicyTags && typeof bigqueryPolicyTags === "string") {
        config.columns[columnName].bigqueryPolicyTags = [bigqueryPolicyTags];
      }
    });

    return config;
  }

  // 依存関係を追加するメソッド
  addDependency(dependencySqlx: Sqlx) {
    this.dependencies.push(dependencySqlx);
  }

  // 参照元のカラムを引き継ぐメソッド（同じ名前のカラムのみ）
  inheritColumnsFromDependencies(dataformProject: DataformProject) {
    // 依存関係を設定
    if (
      this.dataformTable.dependencyTargets &&
      this.dataformTable.dependencyTargets.length > 0
    ) {
      this.dataformTable.dependencyTargets.forEach((dependency) => {
        const dependentTable =
          dataformProject.tables.find(
            (t) =>
              t.target.name === dependency.name &&
              t.target.schema === dependency.schema
          ) ||
          dataformProject.declarations.find(
            (d) =>
              d.target.name === dependency.name &&
              d.target.schema === dependency.schema
          );

        if (dependentTable) {
          const dependentSqlx = new Sqlx(
            dependentTable.fileName,
            dependentTable
          );
          this.addDependency(dependentSqlx);
        }
      });
    }

    this.dependencies.forEach((dependency) => {
      Object.keys(dependency.config.columns || {}).forEach((columnName) => {
        if (
          Object.keys(dependency.config.columns).includes(columnName) &&
          !Object.keys(this.config.columns).includes(columnName)
        ) {
          this.config.columns[columnName] =
            dependency.config.columns[columnName];
        }
        if (
          Object.keys(dependency.config.columns).includes(columnName) &&
          Object.keys(this.config.columns).includes(columnName) &&
          dependency.config.columns[columnName].description.length > 0 &&
          this.config.columns[columnName].description.length === 0
        ) {
          this.config.columns[columnName].description =
            dependency.config.columns[columnName].description;
        }

        if (
          Object.keys(dependency.config.columns).includes(columnName) &&
          Object.keys(this.config.columns).includes(columnName) &&
          dependency.config.columns[columnName].bigqueryPolicyTags &&
          !this.config.columns[columnName].bigqueryPolicyTags
        ) {
          this.config.columns[columnName].bigqueryPolicyTags =
            dependency.config.columns[columnName].bigqueryPolicyTags;
        }
      });
    });
  }

  // BigQuery のカラムを追加するメソッド
  addColumnsFromBigQuery(bigQueryTable: BigQueryTable) {
    bigQueryTable.fields.forEach((field) => {
      if (!this.config.columns || !this.config.columns[field.name]) {
        this.config.columns = {
          ...this.config.columns,
          [field.name]: field.policy_tags
            ? {
                description: field.description || "",
                bigqueryPolicyTags: field.policy_tags?.names,
              }
            : {
                description: field.description || "",
              },
        };
      }
    });
  }

  // SQLX ファイルに更新を保存するメソッド
  save() {
    const newConfigBlock = `config ${JSON.stringify(this.config, null, 2)}`;
    const sqlxContent = fs.readFileSync(this.filePath, "utf-8");
    const updatedSqlxContent = sqlxContent.replace(
      /config\s*\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/,
      newConfigBlock
    );
    fs.writeFileSync(this.filePath, updatedSqlxContent, "utf-8");
    console.info(`🔨 Updated SQLX file: ${this.filePath}`);
  }
}

export default Sqlx;
