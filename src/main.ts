#!/usr/bin/env node
import { refactor } from './refactor'
import { valid } from './valid'
import { Command } from "commander";

const program = new Command();

program
  .name("dataform-osmosis")
  .description("CLI tool for Dataform Osmosis")
  .version("0.1.4");

program
  .command("valid")
  .description("Validate the current Dataform project")
  .action(async () => {
    console.info("Validating Dataform project...");
    await valid()
  });

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
    await refactor(options.file);
  });

program.parse(process.argv);
