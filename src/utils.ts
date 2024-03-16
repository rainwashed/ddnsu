const ipReportingEndpoints = [
  "https://api.ipify.org/?format=json",
  "https://api.my-ip.io/v2/ip.json",
  "https://api.myip.com",
  "https://api.seeip.org/jsonip",
  "https://ipwho.is",
];
const ipProperty = "ip";

async function returnIp(): Promise<string> {
  let returnedIps = [];

  for (let endpoint of ipReportingEndpoints) {
    try {
      let request = await fetch(endpoint);
      if (!request.ok) throw await request.text();
      let data = (await request.json()) as {
        ip: string;
      };

      returnedIps.push(data[ipProperty]);
    } catch (error) {
      console.error(error);
      console.warn("Skipping %s endpoint", endpoint);
      continue;
    }
  }

  // calculate the highest occurrence of something

  let occurrenceTrack: { [key: string]: number } = {};
  for (let returnedIp of returnedIps) {
    if (returnedIp in occurrenceTrack) {
      occurrenceTrack[returnedIp]++;
    } else {
      occurrenceTrack[returnedIp] = 1;
    }
  }

  let maxInstanceAmount = Math.max(...Object.values(occurrenceTrack));
  let maxInstanceKey = Object.keys(occurrenceTrack).find(
    (key) => occurrenceTrack[key] === maxInstanceAmount
  );

  if (maxInstanceAmount === undefined || maxInstanceKey === undefined) {
    throw Error("What the fuck?");
  }

  return maxInstanceKey;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { returnIp, sleep };
