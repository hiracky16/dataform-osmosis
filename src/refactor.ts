import { readSqlx, compileDataform, checkDataformCli } from "./dataform";
import { listTablesAndColumns, checkBigQuery } from "./bigquery";
import { DataformOsmosisTable } from "./dataformTypes";
import { Command } from "commander";
import path from "path";
import fs from "fs";

export const refactoringFiles = (filePath: string) => {
  // definitions/ を省略したディレクトリ指定への対応
  if (!filePath.startsWith("definitions")) {
    filePath = path.join("definitions", filePath);
  }
  if (!fs.existsSync(filePath)) {
    throw Error("File Not Found.");
  }

  if (fs.statSync(filePath).isDirectory()) {
    return fs.readdirSync(filePath).filter((file) => file.endsWith(".sqlx"));
  } else {
    // 単一のファイルなため
    return [filePath];
  }
};

export const refactor = async (files: string[]) => {
  const result = await compileDataform();
  //   const dataformTables = result.tables.concat(result.declarations);
  //   const tableConfigs = dataformTables.map((table) => readSqlx(table.fileName));
  //   const datasets = dataformTables.map((table) => table.target.schema);

  //   const tables = await listTablesAndColumns(datasets[0]);
  //   console.log(tables);
};
