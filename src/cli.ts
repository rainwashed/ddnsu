import { program } from "commander";
import { version } from "../package.json";
import { Reader } from "./toml";
import { userInfo } from "node:os";
import path from "node:path";

const configUrlPath = path.resolve(
  userInfo().homedir,
  ".config",
  "ddnsu",
  "config.toml"
);
console.log(configUrlPath);

namespace CliLookupFunction {
  export function config_version() {
    let version = Reader.get("version") as unknown as string;
    console.log(version);
    process.exit(0);
  }

  export function config() {
    console.log("config function called");
  }

  export function start() {
    console.log("start function called");
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
  .description("print out content of configuration file and location")
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

console.log(options);
