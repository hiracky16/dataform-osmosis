import { refactoringFiles } from '../src/refactor';
import mockFs from 'mock-fs';
import * as path from 'path';
import * as fs from 'fs';

describe('refactoringFiles', () => {
  afterEach(() => {
    mockFs.restore(); // テスト後に mock-fs をクリア
  });

  it('should return the correct file path for a single sqlx file', () => {
    mockFs({
      'definitions/marts/test/test.sqlx': 'content',
    });

    const result = refactoringFiles('marts/test/test.sqlx');
    expect(result).toEqual(['definitions/marts/test/test.sqlx']);
  });

  it('should return all sqlx files in a directory', () => {
    mockFs({
      'definitions/marts/test': {
        'test1.sqlx': 'content1',
        'test2.sqlx': 'content2',
        'test3.txt': 'not_sqlx',
      },
    });

    const result = refactoringFiles('marts/test');
    expect(result).toEqual(['test1.sqlx', 'test2.sqlx']);
  });

  it('should prepend "definitions/" when directory is not provided', () => {
    mockFs({
      'definitions/marts/test/test.sqlx': 'content',
    });

    const result = refactoringFiles('marts/test/test.sqlx');
    expect(result).toEqual(['definitions/marts/test/test.sqlx']);
  });

  it('should throw an error if file or directory does not exist', () => {
    mockFs({
      'definitions/marts/test': {} // 空のディレクトリ
    });

    expect(() => refactoringFiles('marts/test/nonexistent.sqlx')).toThrow('File Not Found.');
  });

  it('should return all sqlx files when only a directory is provided', () => {
    mockFs({
      'definitions/marts/test': {
        'file1.sqlx': 'content1',
        'file2.sqlx': 'content2',
        'not_sqlx.txt': 'not_sqlx',
      },
    });

    const result = refactoringFiles('marts/test');
    expect(result).toEqual(['file1.sqlx', 'file2.sqlx']);
  });
});
