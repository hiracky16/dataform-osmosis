#!/usr/bin/env node
import { readSqlx, compileDataform } from "./dataform";
import { listTablesAndColumns } from './bigquery'
import { DataformOsmosisTable } from './dataformTypes'

const main = async () => {
  const result = await compileDataform();
  const dataformTables = result.tables.concat(result.declarations)
  const tableConfigs = dataformTables.map((table) => readSqlx(table.fileName));
  const datasets = dataformTables.map(table => table.target.schema)

//   await listTablesAndColumns(PROJECT_ID, datasetId);
};

main().catch((err) => console.log(err));
