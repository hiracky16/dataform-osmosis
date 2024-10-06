#!/usr/bin/env node
import { readSqlx, compileDataform, checkDataformCli } from "./dataform";
import { listTablesAndColumns, checkBigQuery } from "./bigquery";
import { DataformOsmosisTable } from "./dataformTypes";
import { refactoringFiles, refactor } from './refactor'
import { Command } from "commander";
import path from "path";
import fs from "fs";

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
    console.log("Refactoring: \n", files)
    await refactor(files);
  });

// コマンドライン引数を解析
program.parse(process.argv);
