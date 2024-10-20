import { BigQueryTable, DataformTable, SqlxConfig } from "./dataformTypes";
import * as fs from "fs";

class Sqlx {
  public filePath: string;
  private config: SqlxConfig;
  dependencies: Sqlx[] = []; // 依存関係のテーブルを保持
  public dataformTable: DataformTable; // DataformTable を保持

  constructor(sqlxFilePath: string, dataformTable: DataformTable) {
    this.filePath = sqlxFilePath;
    this.dataformTable = dataformTable; // DataformTable を保持
    this.config = this.loadConfig();
    this.nomarizeColumns()
  }

  // SQLX ファイルの config を読み込む
  private loadConfig(): SqlxConfig {
    let config: SqlxConfig;
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
    return config;
  }

  private nomarizeColumns(): void {
    if (!this.config.columns) return;

    Object.keys(this.config.columns).forEach((columnName) => {
      const column = this.config.columns![columnName];

      if (typeof column === "string") {
        this.config.columns![columnName] = {
          description: column
        };
      }
    });
  }

  // 依存関係を追加するメソッド
  addDependency(dependencySqlx: Sqlx) {
    this.dependencies.push(dependencySqlx);
  }

  // 参照元のカラムを引き継ぐメソッド（同じ名前のカラムのみ）
  inheritColumnsFromDependencies() {
    this.dependencies.forEach((dependency) => {
      Object.keys(dependency.config.columns || {}).forEach((columnName) => {
        if (
          this.config.columns &&
          Object.keys(this.config.columns).includes(columnName) &&
          dependency.config.columns &&
          Object.keys(dependency.config.columns).includes(columnName)
        ) {
          this.config.columns[columnName] =
            dependency.config.columns[columnName];
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
                bigqueryPolicyTags: field.policy_tags?.names || [],
              }
            : field.description || "",
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
    console.log(`🔨 Updated SQLX file: ${this.filePath}`);
  }
}

export default Sqlx;
