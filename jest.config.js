module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  cacheDirectory: '/tmp/jest_cache',
  testMatch: ["**/?(*.)+(test).ts"], // テストファイルのパターン
};
