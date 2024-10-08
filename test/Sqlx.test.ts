import * as fs from "fs";
import Sqlx from "../src/Sqlx";
import { BigQueryTable, DataformTable, SqlxConfig } from "../src/dataformTypes";

// fs モジュールをモック
jest.mock("fs");

describe("Sqlx", () => {
  const mockFilePath = "definitions/table1.sqlx";
  const mockConfigContent = `
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
      expect(sqlx["config"].columns).toHaveProperty("id", "id");
      expect(sqlx["config"].columns).toHaveProperty("name");
    });

    it("should throw an error if no config block is found", () => {
      (fs.readFileSync as jest.Mock).mockReturnValue("invalid content");
      expect(() => new Sqlx(mockFilePath, mockDataformTable)).toThrowError(
        "No config block found"
      );
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
    it("should inherit columns from dependencies", () => {
      const sqlx = new Sqlx(mockFilePath, mockDataformTable);
      const dependencySqlx = new Sqlx(mockFilePath, mockDataformTable);
      if (dependencySqlx["config"].columns) {
        dependencySqlx["config"].columns["id"] = "new-id-description";
      }

      sqlx.addDependency(dependencySqlx);
      sqlx.inheritColumnsFromDependencies();

      if (sqlx["config"].columns) {
        expect(sqlx["config"].columns["id"]).toBe("new-id-description");
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
        expect(sqlx["config"].columns["age"]).toBe("age description");
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
  });
});
