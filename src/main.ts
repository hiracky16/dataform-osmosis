#!/usr/bin/env node
import { readSqlx, compileDataform, checkDataformCli } from "./dataform";
import { listTablesAndColumns, checkBigQuery } from "./bigquery";
import { DataformOsmosisTable } from "./dataformTypes";
import { Command } from "commander";
import path from "path";
import fs from "fs";

const refactoringFiles = (filePath: string) => {
  // definitions/ を省略したディレクトリ指定への対応
  if (!filePath.startsWith("definitions")) {
    filePath = path.join("definitions", filePath);
  }
  if (!fs.existsSync(filePath)) {
    throw Error("File Not Found.")
  }

  if (fs.statSync(filePath).isDirectory()) {
    return fs
      .readdirSync(filePath)
      .filter((file) => file.endsWith(".sqlx"));
  } else {
    // 単一のファイルなため
    return [filePath]
  }
};

const refactor = async (files: string[]) => {
    const result = await compileDataform();
  //   const dataformTables = result.tables.concat(result.declarations);
  //   const tableConfigs = dataformTables.map((table) => readSqlx(table.fileName));
  //   const datasets = dataformTables.map((table) => table.target.schema);

  //   const tables = await listTablesAndColumns(datasets[0]);
  //   console.log(tables);
};

const program = new Command();

// コマンドラインの名前を設定
program
  .name("dataform-osmosis")
  .description("CLI tool for Dataform Osmosis")
  .version("1.0.0");

// 'valid' コマンド
program
  .command("valid")
  .description("Validate the current Dataform project")
  .action(async () => {
    console.log("Validating Dataform project...");
    await checkBigQuery();
    await checkDataformCli();
  });

// 'refactor' コマンド
program
  .command("sqlx")
  .command("refactor")
  .option(
    "-f, --file <fileOrDirectory>",
    "Specify the file or directory to refactor",
    "definitions/"
  )
  .description("Refactor the current Dataform project")
  .action(async (options) => {
    const files = refactoringFiles(options.file)
    await refactor(files);
  });

// コマンドライン引数を解析
program.parse(process.argv);
