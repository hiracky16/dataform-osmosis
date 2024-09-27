#!/usr/bin/env node
import { readSqlx, compileDataform, checkDataformCli } from "./dataform";
import { listTablesAndColumns, checkBigQuery } from './bigquery'
import { DataformOsmosisTable } from './dataformTypes'
import { Command } from 'commander'

const refactor = async () => {
  const result = await compileDataform();
  const dataformTables = result.tables.concat(result.declarations)
  const tableConfigs = dataformTables.map((table) => readSqlx(table.fileName));
  const datasets = dataformTables.map(table => table.target.schema)

  const tables = await listTablesAndColumns(datasets[0]);
  console.log(tables)
};

const program = new Command();

// コマンドラインの名前を設定
program.name('dataform-osmosis').description('CLI tool for Dataform Osmosis').version('1.0.0');

// 'valid' コマンド
program
  .command('valid')
  .description('Validate the current Dataform project')
  .action(async () => {
    console.log('Validating Dataform project...');
    await checkBigQuery()
    await checkDataformCli()
  });

// 'refactor' コマンド
program
  .command('refactor')
  .description('Refactor the current Dataform project')
  .action(async () => {
    console.log('Refactoring Dataform project...');
    await refactor()
  });

// コマンドライン引数を解析
program.parse(process.argv);
