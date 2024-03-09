import { Reader, type ConfigFile } from "./toml";
import { Vercel } from "./platforms/importer";
import { returnIp } from "./utils";

async function vercelUpdate() {
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
        console.log("existing record:", record);
        Vercel.updateDNSListing(domain, remoteDnsListing.id, {
          name: record.name,
          comment: record.comment,
          ttl: record.ttl,
          type: record.recordType,
          value: publicIp,
        });
      } else {
        Vercel.createDNSListing(domain, {
          name: record.name,
          comment: record.comment,
          ttl: record.ttl,
          type: record.recordType,
          value: publicIp,
        });
        console.log("new record");
      }
    }

    // console.log(filteredDnsListings);
  }
}

async function dnsUpdate() {
  vercelUpdate();
}

dnsUpdate();
