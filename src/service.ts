import { Reader, type ConfigFile } from "./toml";
import { Cloudflare, Vercel } from "./platforms/importer";
import { returnIp } from "./utils";
import chalk from "chalk";

async function vercelUpdate() {
  try {
    let publicIp = await returnIp();

    let domains = Reader.get(
      "vercel.domainTarget"
    ) as ConfigFile["vercel"]["domainTarget"];
    let records = Reader.get("record") as ConfigFile["record"];

    for (let domain of domains) {
      let dnsListings = await Vercel.returnDNSListings(domain);
      let filteredDnsListings = dnsListings.filter((records) =>
        records.comment?.startsWith("DDNSU")
      );

      for (let record of records) {
        let remoteDnsListing = filteredDnsListings.find(
          (f) => f.comment === `DDNSU_${record.comment}`
        );
        if (remoteDnsListing !== undefined) {
          // console.log("existing record:", record);
          console.log(chalk.italic("existing record, updating instead... [V]"));
          Vercel.updateDNSListing(domain, remoteDnsListing.id, {
            name: record.name,
            comment: record.comment,
            ttl: record.ttl,
            type: record.recordType,
            value: publicIp,
          });
        } else {
          console.log(
            chalk.italic("non-existing record, creating new one... [V]")
          );
          Vercel.createDNSListing(domain, {
            name: record.name,
            comment: record.comment,
            ttl: record.ttl,
            type: record.recordType,
            value: publicIp,
          });
          // console.log("new record");
        }
      }
    }
  } catch (error) {
    console.log(chalk.red.bold(error));
  }
}

async function vercelPurge() {
  try {
    let domains = Reader.get(
      "vercel.domainTarget"
    ) as ConfigFile["vercel"]["domainTarget"];
    let records = Reader.get("record") as ConfigFile["record"];

    for (let domain of domains) {
      let dnsListings = await Vercel.returnDNSListings(domain);
      let filteredDnsListings = dnsListings.filter((records) =>
        records.comment?.startsWith("DDNSU")
      );

      for (let record of records) {
        let remoteDnsListing = filteredDnsListings.find(
          (f) => f.comment === `DDNSU_${record.comment}`
        );
        if (remoteDnsListing !== undefined) {
          await Vercel.deleteDNSListing(domain, remoteDnsListing.id);
        }
      }
    }
  } catch (error) {
    console.log(chalk.red.bold(error));
  }
}

async function cloudflareUpdate() {
  try {
    let publicIp = await returnIp();

    let domains = Reader.get(
      "cloudflare.domainTarget"
    ) as ConfigFile["cloudflare"]["domainTarget"];
    let records = Reader.get("record") as ConfigFile["record"];

    for (let domain of domains) {
      let dnsListings = await Cloudflare.listRecordsViaDomain(domain);
      let filteredDnsListings = dnsListings.filter((records) =>
        records.comment?.startsWith("DDNSU")
      );

      for (let record of records) {
        let remoteDnsListing = filteredDnsListings.find(
          (f) => f.comment === `DDNSU_${record.comment}`
        );

        if (remoteDnsListing !== undefined) {
          console.log(
            chalk.italic("existing record, updating instead... [CF]")
          );
          Cloudflare.updateDNSRecord(domain, remoteDnsListing.id, {
            name: record.name,
            comment: record.comment,
            ttl: record.ttl,
            type: record.recordType,
            value: publicIp,
          });
        } else {
          console.log(
            chalk.italic("non-existing record, creating a new one... [CF]")
          );
          Cloudflare.createDNSRecord(domain, {
            name: record.name,
            comment: record.comment,
            ttl: record.ttl,
            type: record.recordType,
            value: publicIp,
          });
        }
      }
    }
  } catch (error) {
    console.log(chalk.red.bold(error));
  }
}

async function cloudflarePurge() {
  try {
    let domains = Reader.get(
      "cloudflare.domainTarget"
    ) as ConfigFile["cloudflare"]["domainTarget"];
    let records = Reader.get("record") as ConfigFile["record"];

    for (let domain of domains) {
      let dnsListings = await Cloudflare.listRecordsViaDomain(domain);
      let filteredDnsListings = dnsListings.filter((records) =>
        records.comment?.startsWith("DDNSU")
      );

      for (let record of records) {
        let remoteDnsListing = filteredDnsListings.find(
          (f) => f.comment === `DDNSU_${record.comment}`
        );

        if (remoteDnsListing !== undefined) {
          Cloudflare.deleteDNSListing(domain, remoteDnsListing.id);
        }
      }
    }
  } catch (error) {
    console.log(chalk.red.bold(error));
  }
}

async function dnsUpdate() {
  let selection = Reader.get("target") as unknown as string;
  selection = selection.toLowerCase();
  if (selection === undefined) {
    throw "No target property in config file.";
  }

  if (!(selection in ["vercel", "cloudflare"]))
    throw "Cloudflare or Vercel was not selected in the configuration file";

  switch (selection) {
    case "vercel":
      vercelUpdate();
      break;
    case "cloudflare":
      cloudflareUpdate();
      break;
  }
}

async function dnsPurge() {
  console.log(chalk.yellow.italic("deleting DDNSU Vercel records..."));
  await vercelPurge();
  console.log(chalk.yellow.italic("deleting DDNSU Cloudflare records..."));
  await cloudflarePurge();
}

function returnTomlState() {
  let obj = Reader.return() as ConfigFile;
  delete obj["past"];

  return obj as object;
}

async function checkConfigPast() {
  let currentState = returnTomlState();
  let previousState = Reader.get("past") as unknown as ConfigFile["past"];

  if (previousState === undefined || previousState === "") {
    console.log(chalk.gray("first time running program"));
  } else {
    let currentStateStringBuffer = Buffer.from(
      JSON.stringify(currentState)
    ).toString("hex");

    if (currentStateStringBuffer !== previousState) {
      console.log(
        chalk.yellow.italic(
          "currentState and pastState do not match, rebuilding..."
        )
      );
      await dnsPurge();

      Reader.set("past", currentStateStringBuffer);
      Reader.write();
    }
  }
}

// check previous state
checkConfigPast();

// dnsUpdate();
