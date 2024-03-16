import toml from "toml";
import json2toml from "json2toml";
import fs from "node:fs";
import { resolve, dirname } from "node:path";
import { userInfo } from "node:os";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import config from "../config.json";
import chalk from "chalk";

interface ConfigFile {
  version: string;
  updateFrequency: number;
  additionalIpProviders: string[];
  copyIPv6: boolean;
  target: "vercel" | "cloudflare";
  vercel: {
    authToken: string;
    dnsReturnInstanceLimit: number;
    domainTarget: string[];
  };
  cloudflare: {
    authToken: string;
    domainTarget: string[];
  };
  record: {
    recordType:
      | "A"
      | "AAAA"
      | "ALIAS"
      | "CAA"
      | "CNAME"
      | "HTTPS"
      | "MX"
      | "SRV"
      | "TXT"
      | "NS";
    comment: string;
    ttl: number;
    name: string;
  }[];
  past?: string | undefined;
}

// FIXME: make this type safe and reliable
class TOMLReader {
  private filePath: string;
  private strictMode: boolean; // strictMode will throw an error if the accessor is undefined, else it will just return undefined
  private tomlObject: { [key: string]: any };

  public constructor(filePath: string, strictMode: boolean = false) {
    this.filePath = filePath;
    this.strictMode = strictMode;
    this.tomlObject = toml.parse(
      fs
        .readFileSync(this.filePath, {
          encoding: "utf8",
        })
        .toString()
    );

    // console.log(this.tomlObject["record"]);
  }

  public get(key: string) {
    let kObj = key.split(".");
    let obj: { [key: string]: any } = this.tomlObject;

    let accessor = obj;
    let returnUndefined: boolean = false;

    for (let key of kObj) {
      if (key in accessor) {
        accessor = accessor[key];
      } else {
        if (this.strictMode) {
          console.error("key does not exist in accessor");
          throw "Key does not exist.";
        }
        returnUndefined = true;
      }
    }

    return !returnUndefined ? accessor : undefined;
  }

  public set(
    key: string,
    value: string | number | string[] | number[] | boolean
  ) {
    try {
      let kObj = key.split(".");
      let obj: { [key: string]: any } = this.tomlObject;

      let accessor = obj;
      let i = 0;
      for (let key of kObj) {
        if (key in accessor) {
          // move to next object property
          accessor = accessor[key];
        } else {
          if (i >= kObj.length - 1) {
            accessor[key] = value;
          } else {
            accessor[key] = {};
            accessor = accessor[key];
          }
        }

        i++;
      }

      this.tomlObject = { ...obj };
    } catch (error) {
      throw error;
    }
  }

  public return() {
    return this.tomlObject as ConfigFile;
  }

  // output is set by default to the current mock config file
  public write(output: string = this.filePath) {
    try {
      let tomlEncode = json2toml(this.tomlObject, {
        indent: 2,
        newlineAfterSection: true,
      });

      fs.writeFileSync(output, tomlEncode, {
        encoding: "utf8",
      });
    } catch (error) {
      throw error;
    }
  }

  public reload() {
    this.tomlObject = toml.parse(
      fs
        .readFileSync(this.filePath, {
          encoding: "utf8",
        })
        .toString()
    );
    return this.tomlObject;
  }
}

const configUrlPath = resolve(
  userInfo().homedir,
  ".config",
  "ddnsu",
  "config.toml"
);

// check if configuration file exists
if (!existsSync(configUrlPath)) {
  console.warn(
    chalk.yellow(
      `Default configuration file is not located (${configUrlPath}). It will be created.`
    )
  );
  let response = await fetch(config.defaultConfigFileLocation);
  let responseBuffer = await response.arrayBuffer();

  mkdirSync(dirname(configUrlPath), {
    recursive: true,
  });
  writeFileSync(configUrlPath, Buffer.from(responseBuffer), {
    encoding: "utf-8",
    flag: "w",
  });

  console.log(chalk.green("ddnsu can now be ran."));

  process.exit(0);
}

const Reader = new TOMLReader(configUrlPath);

export { TOMLReader, Reader, configUrlPath };
export type { ConfigFile };
