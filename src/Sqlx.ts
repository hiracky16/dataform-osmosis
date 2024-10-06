import { BigQueryTable, DataformProject, SqlxConfig } from "./dataformTypes";
import * as fs from "fs";

class Sqlx {
  private config: SqlxConfig;
  private filePath: string;

  constructor(sqlxFilePath: string) {
    this.filePath = sqlxFilePath;
    this.config = this.loadConfig();
  }

  // SQLX ファイルの config を読み込む
  private loadConfig(): SqlxConfig {
    const sqlxContent = fs.readFileSync(this.filePath, "utf-8");
    const configMatch = sqlxContent.match(
      /config\s*\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/
    );
    if (!configMatch) {
      throw new Error(`No config block found in ${this.filePath}`);
    }

    let config: SqlxConfig;
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

  // BigQuery のカラムを追加するメソッド
  addColumnsFromBigQuery(bigQueryTable: BigQueryTable) {
    console.log(this.config.columns);
    console.log(bigQueryTable.fields);
    bigQueryTable.fields.forEach((field) => {
      if (!this.config.columns || !this.config.columns[field.name]) {
        // カラムがない場合は追加
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
      console.log(field)
      console.log(this.config.columns);
    });
  }

  // カラムの順序を BigQuery の順序に合わせるメソッド
  reorderColumns(bigQueryTable: BigQueryTable) {
    const orderedColumns: SqlxConfig["columns"] = {};
    bigQueryTable.fields.forEach((field) => {
      if (this.config.columns && this.config.columns[field.name]) {
        orderedColumns[field.name] = this.config.columns[field.name];
      }
    });
    this.config.columns = orderedColumns;
  }

  // SQLX ファイルに更新を保存するメソッド
  save() {
    console.log(this.config)
    const newConfigBlock = `config ${JSON.stringify(this.config, null, 2)}`;
    const sqlxContent = fs.readFileSync(this.filePath, "utf-8");
    const updatedSqlxContent = sqlxContent.replace(
      /config\s*\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/,
      newConfigBlock
    );
    fs.writeFileSync(this.filePath, updatedSqlxContent, "utf-8");
    console.log(`Updated SQLX file: ${this.filePath}`);
  }
}

export default Sqlx;
