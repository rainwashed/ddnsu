import { program } from "commander";
import { version } from "../package.json";
import { Reader } from "./toml";

namespace CliLookupFunction {
  export function config() {
    console.log(Reader.get("version") as unknown as string);
  }
}

program.version(
  version,
  "-v, --version",
  "return the current version of the program"
);
program.description("Dynamic Domain Name Server Updater");

program.option(
  "-cv, --config-version",
  "return the current version of the configuration file"
);

program
  .command("config", "print out content of configuration file and location")
  .action(CliLookupFunction.config);

program.command("start", "start ddnsu service");
program.command("kill", "kill all ddnsu service instances in the background");
program.command("enable", "spawn a ddnsu service in the background");
// program.command("logs", "return logs of ddnsu");
program.command(
  "install",
  "install ddnsu as a systemd service (requires sudo)"
);

program.parse();
const options = program.opts();

options["cv"];

console.log(options);
