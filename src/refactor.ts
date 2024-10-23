import { compileDataform, loadWorkflowSettings } from "./dataform";
import { listTablesAndColumns } from "./bigquery";
import { DataformProject, BigQueryTable } from "./types";
import path from "path";
import fs from "fs";
import Sqlx from "./Sqlx";

export const refactoringFiles = (filePath: string): string[] => {
  // definitions/ を省略したディレクトリ指定への対応
  if (!filePath.startsWith("definitions")) {
    filePath = path.join("definitions", filePath);
  }

  if (!fs.existsSync(filePath)) {
    throw new Error("File Not Found.");
  }

  // 再帰的に .sqlx ファイルを探索
  const getAllSqlxFiles = (dir: string): string[] => {
    let results: string[] = [];
    const list = fs.readdirSync(dir);

    list.forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat && stat.isDirectory()) {
        // サブディレクトリの場合は再帰的に探索
        results = results.concat(getAllSqlxFiles(fullPath));
      } else if (file.endsWith(".sqlx")) {
        // .sqlx ファイルの場合は結果に追加
        results.push(fullPath);
      }
    });

    return results;
  };

  if (fs.statSync(filePath).isDirectory()) {
    return getAllSqlxFiles(filePath); // ディレクトリの場合は再帰的に .sqlx ファイルを探索
  } else {
    // 単一のファイルの場合
    return [filePath];
  }
};

// Sqlx オブジェクトの初期化と依存関係設定
const initializeSqlxObjects = (
  refactoringFiles: string[],
  dataformProject: DataformProject
): Sqlx[] => {
  const sqlxObjects: Sqlx[] = [];

  // refactoringFiles に基づいて Sqlx オブジェクトを初期化
  refactoringFiles.forEach((file) => {
    const dataformTable =
      dataformProject.tables.find((table) => table.fileName === file) ||
      dataformProject.declarations.find((table) => table.fileName === file) ||
      dataformProject.operations.find((table) => table.fileName === file);

    if (dataformTable) {
      const sqlx = new Sqlx(file, dataformTable);
      sqlxObjects.push(sqlx);
    }
  });

  return sqlxObjects;
};

// トポロジカルソート関数でソートに集中
const topoSortRefactoringFiles = (sqlxObjects: Sqlx[]): Sqlx[] => {
  const graph: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};

  sqlxObjects.forEach((sqlx) => {
    graph[sqlx.filePath] = [];
    inDegree[sqlx.filePath] = 0;
  });

  sqlxObjects.forEach((sqlx) => {
    sqlx.dependencies.forEach((dependency) => {
      const dependencySqlx = sqlxObjects.find(
        (sqlx) => sqlx.filePath === dependency.filePath
      )!;
      if (dependencySqlx) {
        graph[dependency.filePath].push(sqlx.filePath);
        inDegree[sqlx.filePath] += 1;
      }
    });
  });

  const sorted: Sqlx[] = [];
  const queue: string[] = [];

  Object.keys(inDegree).forEach((filePath) => {
    if (inDegree[filePath] === 0) {
      queue.push(filePath);
    }
  });

  while (queue.length > 0) {
    const filePath = queue.shift()!;
    const sqlx = sqlxObjects.find((sqlx) => sqlx.filePath === filePath)!;
    sorted.push(sqlx);

    graph[filePath].forEach((depFile) => {
      inDegree[depFile] -= 1;
      if (inDegree[depFile] === 0) {
        queue.push(depFile);
      }
    });
  }

  if (sorted.length !== sqlxObjects.length) {
    throw new Error("There is a circular dependency in the sqlx files.");
  }

  return sorted;
};

// refactor 関数
export const refactor = async (filePath: string) => {
  const files = refactoringFiles(filePath);
  files.forEach((file) => console.info(`📁 Refactoring ${file}`));
  const config = loadWorkflowSettings();
  console.info("🔍️ Loading Dataform Project...");

  console.info("🔍️ Compiling Dataform Project...");
  const result: DataformProject = await compileDataform();

  // Sqlx オブジェクトを初期化して依存関係を設定
  const sqlxObjects = initializeSqlxObjects(files, result);

  // Sqlx オブジェクトをトポロジカルソート
  const sortedSqlxFiles = topoSortRefactoringFiles(sqlxObjects);

  const bigqueryTables: BigQueryTable[] = [];
  const targetTableDatasetIds = sortedSqlxFiles.map(
    (sqlx) => sqlx.dataformTable.target.schema
  );
  const dependenciesTableDatasetIds = sortedSqlxFiles.flatMap((sqlx) =>
    sqlx.dependencies.map((d) => d.dataformTable.target.schema)
  );
  const datasetIds = Array.from(
    new Set(targetTableDatasetIds.concat(dependenciesTableDatasetIds))
  );

  for (const dataset of datasetIds) {
    console.info(`🔍️ Loading BigQuery tables in ${dataset}...`)
    const bqTables = await listTablesAndColumns(config.defaultProject, dataset);
    bigqueryTables.push(...bqTables);
  }

  sortedSqlxFiles.forEach((sqlx) => {
    const { schema, name } = sqlx.dataformTable.target;

    const bigQueryTable = bigqueryTables.find(
      (table) => table.dataset === schema && table.table === name
    );

    if (bigQueryTable) {
      console.info(`🔄 Refactoring ${sqlx.filePath}...`)
      sqlx.addColumnsFromBigQuery(bigQueryTable);
      sqlx.inheritColumnsFromDependencies(result);
      sqlx.save();
      console.info(`✅️ Refactored ${sqlx.filePath}`)
    } else {
      console.error(`🚫 No BigQuery table found for ${sqlx.filePath}`);
    }
  });
};
