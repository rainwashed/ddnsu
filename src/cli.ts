import { program } from "commander";
import { version } from "../package.json";
import {
  githubApiEndpoint,
  defaultSystemdScriptLocation,
} from "../config.json";
import { Reader, configUrlPath, type ConfigFile } from "./toml";
import chalk from "chalk";
import centerAlign from "center-align";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { arch, userInfo } from "node:os";
import fs from "node:fs";
import { createPrompt } from "bun-promptx";
import { $ } from "bun";

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
    (await import("./service")).start();
  }

  export function kill(pid: unknown) {
    if (typeof pid === "undefined" || pid === undefined)
      throw "pass a PID to kill";

    let pidCode = parseInt(pid as string);

    if (Number.isNaN(pidCode)) throw "pass a number PID to kill";

    Bun.spawn(["kill -15", pidCode.toString()]);
  }

  export function enable() {
    let child = Bun.spawn(["bun", "./caller.ts", "&>/dev/null"], {
      cwd: resolve(process.cwd(), "src"),
      ipc(message, childProc) {
        let pid = child.pid;

        console.log(
          chalk.gray.italic(
            `Spawned process has the PID of ${chalk.yellow(pid)}`
          )
        );

        process.exit(12);
      },
    });
  }

  interface GitHubResponse {
    url: string;
    assets_url: string;
    upload_url: string;
    html_url: string;
    id: number;
    author: {
      login: string;
      id: number;
      node_id: string;
      avatar_url: string;
      gravatar_id: string;
      url: string;
      html_url: string;
      followers_url: string;
      following_url: string;
      gists_url: string;
      starred_url: string;
      subscriptions_url: string;
      organizations_url: string;
      repos_url: string;
      events_url: string;
      received_events_url: string;
      type: string;
      site_admin: boolean;
    };
    node_id: string;
    tag_name: string;
    target_commitish: string;
    name: string;
    draft: boolean;
    prerelease: boolean;
    created_at: string;
    published_at: string;
    assets: {
      url: string;
      id: number;
      node_id: string;
      name: string;
      label: string;
      uploader: {
        login: string;
        id: number;
        node_id: string;
        avatar_url: string;
        gravatar_id: string;
        url: string;
        html_url: string;
        followers_url: string;
        following_url: string;
        gists_url: string;
        starred_url: string;
        subscriptions_url: string;
        organizations_url: string;
        repos_url: string;
        events_url: string;
        received_events_url: string;
        type: string;
        site_admin: boolean;
      };
      content_type: string;
      state: string;
      size: number;
      download_count: number;
      created_at: string;
      updated_at: string;
      browser_download_url: string;
    }[];
    tarball_url: string;
    zipball_url: string;
    body: string;
  }

  export async function install() {
    const binStoragePath = resolve(
      userInfo().homedir,
      ".config",
      "ddnsu",
      "ddnsu.bin"
    );
    const systemdTempStoragePath = resolve(
      userInfo().homedir,
      ".config",
      "ddnsu",
      "ddnsu.service"
    );

    if (!fs.existsSync("/etc/systemd/system"))
      throw "systemd has not been detected on the system!";

    try {
      let osArchitecture = arch();
      console.log(
        chalk.gray.italic(`Downloading for ${osArchitecture} architecture...`)
      );

      let githubRequestObj = (
        (await (await fetch(githubApiEndpoint)).json()) as [GitHubResponse]
      )[0] as GitHubResponse;

      let targetGithubRelease = githubRequestObj.assets.find((release) => {
        let releaseArch = release.name.split(".").slice(-1)[0];
        if (releaseArch === osArchitecture) return true;
      });

      if (targetGithubRelease === undefined)
        throw `There are no releases for ${osArchitecture} architecture (your architecture).`;

      let downloadRequest = await fetch(
        targetGithubRelease.browser_download_url
      );
      let downloadAsBuffer = await downloadRequest.arrayBuffer();

      fs.writeFileSync(binStoragePath, Buffer.from(downloadAsBuffer), {
        encoding: "binary",
        flag: "w+",
      });

      fs.chmodSync(binStoragePath, 0o777);

      console.log(
        chalk.green.bold(
          `Successfully downloaded the binary to ${binStoragePath}`
        )
      );

      console.log(
        chalk.gray.italic(`Copying systemd script and making edits...`)
      );
      let systemdScriptRequest = await fetch(defaultSystemdScriptLocation);
      let systemdScriptText = await systemdScriptRequest.text();
      let username = userInfo().username;

      systemdScriptText = systemdScriptText.replaceAll("{username}", username);

      fs.writeFileSync(systemdTempStoragePath, systemdScriptText, {
        encoding: "utf-8",
        flag: "w",
      });

      console.log(
        chalk.greenBright.bold(
          `Successfully copied systemd script to ${systemdTempStoragePath} for "${username}"`
        )
      );

      console.log(
        "ddnsu-cli will now ask you for your user password (password used for sudo through the echo of the password piped into sudo -S flag). The password will be piped into a script as to move the service script from the cache directory to the actual systemd service."
      );
      let sudoPassword = createPrompt("sudo password: ", {
        echoMode: "password",
      });

      // prettier-ignore
      await $`echo "${sudoPassword.value}" | sudo -S -k mv ${systemdTempStoragePath.toString()} /etc/systemd/system/`.quiet();

      console.log(
        chalk.green.bold(
          `ddnsu should be installed in the systemd directory (/etc/systemd/system/) and can be started by using ${chalk.italic(
            "systemctl start ddnsu.service"
          )}`
        )
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  export async function purge() {
    (await import("./service")).dnsPurge();
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
  .command("kill <pid>")
  .description(
    "kill ddnsu service instance based on <pid> running in the background"
  )
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
program
  .command("purge")
  .description("purge all ddnsu records from DNS servers")
  .action(CliLookupFunction.purge);

if (Bun.argv.length === 2) program.outputHelp();
program.parse(Bun.argv);
const options = program.opts();

// console.log(options);
