import { program } from "commander";
import { version } from "../package.json";
import { Reader, configUrlPath, type ConfigFile } from "./toml";
import chalk from "chalk";
import centerAlign from "center-align";
import { readFileSync } from "node:fs";

if (process.platform !== "linux") {
  console.error(
    chalk.red(
      "ddnsu ONLY works on Linux as it is meant to be run on a headless server."
    )
  );
  process.exit(1);
}

if (typeof Bun === "undefined" || !process.versions.bun) {
  console.error(chalk.red("ddnsu runs on the BUN runtime (https://bun.sh/)."));
  process.exit(100);
}

namespace CliLookupFunction {
  export function config_version() {
    let version = Reader.get("version") as unknown as string;
    console.log(version);
    process.exit(0);
  }

  export function config() {
    let tomlTxt = readFileSync(configUrlPath, {
      encoding: "utf-8",
    }).toString();

    console.log(
      centerAlign(
        chalk.bold(
          `--- .toml file content (${chalk.italic(configUrlPath)}) ---`
        ),
        process.stdout.columns
      )
    );
    console.log(chalk.italic.gray(tomlTxt));
    console.log(
      centerAlign(
        chalk.bold("--- toml object representation ---"),
        process.stdout.columns
      )
    );
    console.log(chalk.italic.gray(JSON.stringify(Reader.return(), null, 2)));
    console.log(
      centerAlign(
        chalk.bold("--- .toml validation ---"),
        process.stdout.columns
      )
    );

    let requiredConfigurationValues = [
      "version",
      "updateFrequency",
      "target",
      "vercel.authToken",
      "vercel.domainTarget",
      "record",
    ];

    for (let configurationValue of requiredConfigurationValues) {
      let v = Reader.get(configurationValue);

      if (v !== undefined) {
        console.log(chalk.green(`[✅] - ${configurationValue}`));
      } else {
        console.log(chalk.red(`[❌] - ${configurationValue}`));
      }
    }

    let i = 0;
    let requiredRecordValues = ["recordType", "comment", "ttl", "name"];
    let existingComments = [];

    for (let record of Reader.get("record") as { [key: string]: any }[]) {
      console.log(`[${i}]`);
      for (let recordConfigurationValue of requiredRecordValues) {
        if (
          !(recordConfigurationValue in record) ||
          record[recordConfigurationValue] === undefined
        ) {
          console.log(chalk.red(`[❌] - ${recordConfigurationValue}`));
        } else {
          console.log(chalk.green(`[✅] - ${recordConfigurationValue}`));
        }
      }

      existingComments.push(record["comment"]);
      i++;
    }

    existingComments.forEach((v, i) => {
      if (i < 1) return;
      let p = existingComments[i - 1];
      if (p === v) {
        console.log(chalk.red(`"${p}" == "${v}" (same comments cannot exist)`));
      }
    });
  }

  export async function start() {
    console.log(
      chalk.italic(
        `starting service in current terminal process (${chalk.yellow(
          process.pid
        )})...`
      )
    );
    await import("./service");
  }

  export function kill() {
    console.log("kill function called");
  }

  export function enable() {
    console.log("enable function called");
  }

  export function install() {
    console.log("install function called");
  }
}

program.version(
  version,
  "-v, --version",
  "return the current version of the program"
);
program.description("Dynamic Domain Name Server Updater");

program
  .option(
    "-cv, --config-version",
    "return the current version of the configuration file"
  )
  .action(CliLookupFunction.config_version);

program
  .command("config")
  .description(
    "validate and print out content of configuration file and location"
  )
  .action(CliLookupFunction.config);

program
  .command("start")
  .description("start ddnsu service")
  .action(CliLookupFunction.start);
program
  .command("kill")
  .description("kill all ddnsu service instances in the background")
  .action(CliLookupFunction.kill);
program
  .command("enable")
  .description("spawn a ddnsu service in the background")
  .action(CliLookupFunction.enable);
// program.command("logs", "return logs of ddnsu");
program
  .command("install")
  .description("install ddnsu as a systemd service (requires sudo)")
  .action(CliLookupFunction.install);

program.parse(Bun.argv);
const options = program.opts();

// console.log(options);
