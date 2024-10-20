import * as fs from "fs";
import Sqlx from "../src/Sqlx";
import { BigQueryTable, DataformTable, SqlxConfig } from "../src/dataformTypes";

// fs モジュールをモック
jest.mock("fs");

describe("Sqlx", () => {
  const mockFilePath = "definitions/table1.sqlx";
  let mockConfigContent = `
    config {
      type: "table",
      columns: {
        id: "id",
        name: {
          description: "name description",
          bigqueryPolicyTags: ["projects/example/taxonomies/123456/policyTags/123"]
        }
      }
    }
  `;
  const mockDataformTable: DataformTable = {
    type: "table",
    target: {
      name: "table1",
      schema: "dataform",
      database: "project",
    },
    fileName: mockFilePath,
    query: "SELECT id, name FROM table0",
    disabled: false,
    dependencyTargets: [],
    actionDescriptor: {
      columns: [
        {
          description: "id",
          path: ["id"],
        },
      ],
    },
    canonicalTarget: {
      name: "table1",
      schema: "dataform",
      database: "project",
    },
    enumType: "TABLE",
  };

  beforeEach(() => {
    // fs.readFileSync のモック
    (fs.readFileSync as jest.Mock).mockReturnValue(mockConfigContent);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor and loadConfig", () => {
    it("should correctly load and parse the SQLX config", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);

      expect(fs.readFileSync).toHaveBeenCalledWith(mockFilePath, "utf-8");
      expect(sqlx["config"].type).toBe("table");
      expect(sqlx["config"].columns).toHaveProperty("id", {
        description: "id",
      });
      expect(sqlx["config"].columns).toHaveProperty("name");
    });

    it("should set empty config value if no config block is found", () => {
      (fs.readFileSync as jest.Mock).mockReturnValue("select 1");
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);
      expect(sqlx["config"]).toHaveProperty("type");
    });
  });

  describe("addDependency", () => {
    it("should add a dependency", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);
      const dependencySqlx = new Sqlx(mockFilePath, mockDataformTable);

      sqlx.addDependency(dependencySqlx);

      expect(sqlx.dependencies.length).toBe(1);
      expect(sqlx.dependencies[0]).toBe(dependencySqlx);
    });
  });

  describe("inheritColumnsFromDependencies", () => {
    it("should not inherit columns if the column already has a description", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);
      const dependencySqlx = new Sqlx(mockFilePath, mockDataformTable);

      // 依存元のカラムに description が埋まっている
      if (dependencySqlx["config"].columns) {
        dependencySqlx["config"].columns["id"] = {
          description: "new-id-description",
        };
      }

      sqlx.addDependency(dependencySqlx);
      sqlx.inheritColumnsFromDependencies();

      // sqlx の id カラムにはすでに description があるので、引き継がない
      if (sqlx["config"].columns) {
        expect(sqlx["config"].columns["id"]).toStrictEqual({
          description: "id",
        });
      }
    });

    it("should inherit columns from dependencies if the column has no description", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);
      const dependencySqlx = new Sqlx(mockFilePath, mockDataformTable);

      // 依存元のカラムに description がある
      if (dependencySqlx["config"].columns) {
        dependencySqlx["config"].columns["age"] = {
          description: "age description",
        };
      }

      // sqlx 側の age カラムには description がない場合、引き継ぐ
      if (sqlx["config"].columns) {
        sqlx["config"].columns["age"] = { description: "" }; // もともと空の description
      }

      sqlx.addDependency(dependencySqlx);
      sqlx.inheritColumnsFromDependencies();

      // sqlx 側の age カラムに依存元の description が引き継がれる
      if (sqlx["config"].columns) {
        expect(sqlx["config"].columns["age"]).toStrictEqual({
          description: "age description",
        });
      }
    });

    it("should not overwrite existing policy tags", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);
      const dependencySqlx = new Sqlx(mockFilePath, mockDataformTable);

      dependencySqlx["config"].columns["name"].bigqueryPolicyTags = ["hoge"];

      sqlx.addDependency(dependencySqlx);
      sqlx.inheritColumnsFromDependencies();

      // 既に存在する policy tag がある場合は上書きしない
      if (sqlx["config"].columns) {
        expect(sqlx["config"].columns["id"]).toStrictEqual({
          description: "id",
        });
        expect(sqlx["config"].columns["name"]).toStrictEqual({
          description: "name description",
          bigqueryPolicyTags: [
            "projects/example/taxonomies/123456/policyTags/123",
          ],
        });
      }
    });
  });

  describe("addColumnsFromBigQuery", () => {
    it("should add columns from BigQuery", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);

      const bigQueryTable: BigQueryTable = {
        dataset: "dataform",
        table: "table1",
        fields: [
          { name: "age", description: "age description" },
          { name: "id", description: "id description" },
        ],
      };

      sqlx.addColumnsFromBigQuery(bigQueryTable);

      expect(sqlx["config"].columns).toHaveProperty("age");
      if (sqlx["config"].columns) {
        expect(sqlx["config"].columns["age"]).toStrictEqual({
          description: "age description",
        });
      }
    });

    it("should correctly handle policy tags (string[])", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);

      const bigQueryTable: BigQueryTable = {
        dataset: "dataform",
        table: "table1",
        fields: [
          {
            name: "salary",
            description: "salary description",
            policy_tags: { names: ["policy1", "policy2"] },
          },
        ],
      };

      sqlx.addColumnsFromBigQuery(bigQueryTable);

      if (sqlx["config"].columns) {
        expect(sqlx["config"].columns["salary"]).toStrictEqual({
          description: "salary description",
          bigqueryPolicyTags: ["policy1", "policy2"],
        });
      }
    });

    it("should correctly handle policy tags (string)", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);

      const bigQueryTable: BigQueryTable = {
        dataset: "dataform",
        table: "table1",
        fields: [
          {
            name: "age",
            description: "age description",
            policy_tags: { names: ["policy-single"] },
          },
        ],
      };

      sqlx.addColumnsFromBigQuery(bigQueryTable);

      if (sqlx["config"].columns) {
        expect(sqlx["config"].columns["age"]).toStrictEqual({
          description: "age description",
          bigqueryPolicyTags: ["policy-single"],
        });
      }
    });

    it("should not overwrite existing policy tags", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);

      const bigQueryTable: BigQueryTable = {
        dataset: "dataform",
        table: "table1",
        fields: [
          {
            name: "id",
            description: "id description",
            policy_tags: { names: ["new-policy"] },
          },
        ],
      };

      sqlx.addColumnsFromBigQuery(bigQueryTable);

      // 既に存在する policy tag がある場合は上書きしない
      if (sqlx["config"].columns) {
        expect(sqlx["config"].columns["id"]).toStrictEqual({
          description: "id",
        });
        expect(sqlx["config"].columns["name"]).toStrictEqual({
          description: "name description",
          bigqueryPolicyTags: [
            "projects/example/taxonomies/123456/policyTags/123",
          ],
        });
      }
    });
  });

  describe("save", () => {
    it("should save the updated SQLX config", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);
      sqlx.save();

      const expectedNewConfig = `config ${JSON.stringify(
        sqlx["config"],
        null,
        2
      )}`;
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockFilePath,
        expect.stringContaining(expectedNewConfig),
        "utf-8"
      );
    });
    it("should not remove SQLX config assertion", () => {
      const assertionMockConfigContent = `config {
        type: "table",
        columns: {
          id: "id",
          name: {
            description: "name description",
            bigqueryPolicyTags: ["projects/example/taxonomies/123456/policyTags/123"]
          }
        },
        assertions: {
          nonNull: ["id"]
        }
      }`;
      (fs.readFileSync as jest.Mock).mockReturnValue(assertionMockConfigContent);
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);
      sqlx.save();

      const expectedNewConfig = `config ${JSON.stringify(
        sqlx["config"],
        null,
        2
      )}`;
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockFilePath,
        expect.stringContaining("assertions"),
        "utf-8"
      );
    });
  });
});
