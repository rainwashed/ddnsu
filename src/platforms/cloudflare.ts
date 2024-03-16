import { Reader } from "../toml";

const cloudflareAuthToken =
  process.env["CLOUDFLARE_AUTH_TOKEN"] ??
  Reader.get("cloudflare.authToken") ??
  undefined;

if (cloudflareAuthToken === undefined) {
  throw "Cloudflare auth token is not configured in the .env file, command environment, or configuration file.";
}

let defaultHeadersObject = {
  Authorization: `Bearer ${cloudflareAuthToken}`,
};

async function testAuthToken(): Promise<boolean> {
  try {
    let request = await fetch(
      "https://api.cloudflare.com/client/v4/user/tokens/verify",
      {
        method: "get",
        headers: { ...defaultHeadersObject },
      }
    );

    let json = (await request.json()) as {
      success: boolean;
    };

    return json["success"];
  } catch (error) {
    throw error;
  }
}

interface DomainListingResponse {
  result: {
    id: string;
    name: string;
    status: string;
    paused: boolean;
    type: string;
    development_mode: number;
    name_servers: string[];
    original_name_servers: string[];
    original_registrar: string;
    original_dnshost: string;
    modified_on: string;
    created_on: string;
    activated_on: string;
    permissions: string[];
  }[];
  result_info: {
    page: number;
    per_page: number;
    total_pages: number;
    count: number;
    total_count: number;
  };
  success: boolean;
  errors: any[];
  messages: any[];
}

async function listDomains() {
  try {
    let request = await fetch("https://api.cloudflare.com/client/v4/zones", {
      method: "get",
      headers: { ...defaultHeadersObject },
    });

    let data = (await request.json()) as DomainListingResponse;

    if (!data.success) throw data.errors;
    let reformattedDomains = data.result.map((domain) => {
      return {
        id: domain.id,
        name: domain.name,
        status: domain.status,
        nameservers: domain.name_servers,
      };
    });

    return reformattedDomains;
  } catch (error) {
    throw error;
  }
}

async function returnZoneViaDomain(domain: string) {
  let domains = await listDomains();
  let targetDomain = domains.find((d) => d.name === domain);

  if (targetDomain === undefined)
    throw "domain could not be found under user's account for cloudflare";

  return targetDomain;
}

interface DNSListingResponse {
  result: {
    id: string;
    zone_id: string;
    zone_name: string;
    name: string;
    type: string;
    content: string;
    proxiable: boolean;
    proxied: boolean;
    ttl: number;
    locked: boolean;
    meta?: Record<string, unknown>;
    comment?: string | null;
    tags: string[];
    created_on: string;
    modified_on: string;
  }[];
  success: boolean;
  errors: any[];
  messages: any[];
  result_info: {
    page: number;
    per_page: number;
    count: number;
    total_count: number;
    total_pages: number;
  };
}

interface DNSRecord {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: string;
  content: string;
  proxiable: boolean;
  proxied: boolean;
  ttl: number;
  locked: boolean;
  meta?: Record<string, unknown>;
  comment?: string | null;
  tags: string[];
  created_on: string;
  modified_on: string;
}

async function listRecordsViaDomain(domain: string) {
  try {
    let zoneId = (await returnZoneViaDomain(domain))["id"];
    let request = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
      {
        method: "get",
        headers: { ...defaultHeadersObject },
      }
    );
    let obj = (await request.json()) as DNSListingResponse;
    let reformattedRecords = obj.result.map((record) => {
      return {
        id: record.id,
        zone_id: record.zone_id,
        name:
          record.name.split(".")[0] === domain.split(".")[0]
            ? "*"
            : record.name.split(".")[0],
        type: record.type,
        value: record.content,
        ttl: record.ttl,
        comment: record.comment,
      };
    });

    return reformattedRecords;
  } catch (error) {
    throw error;
  }
}

async function createDNSRecord(
  domain: string,
  options: {
    name: string;
    type: string;
    ttl: number;
    value: string;
    comment: string;
  }
) {
  try {
    if (options.name === "" || options.name === "*") options.name = "@";

    let zoneId = (await returnZoneViaDomain(domain))["id"];
    let request = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
      {
        method: "post",
        headers: {
          ...defaultHeadersObject,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: options.name,
          type: options.type,
          ttl: options.ttl,
          content: options.value,
          comment: `DDNSU_${options.comment}`,
          proxied: false,
        }),
      }
    );
    let obj = await request.json();

    return (obj as { success: boolean }).success;
  } catch (error) {
    throw error;
  }
}

async function updateDNSRecord(
  domain: string,
  recordId: string,
  options: {
    name: string;
    type: string;
    ttl: number;
    value: string;
    comment: string;
  }
) {
  try {
    if (options.name === "" || options.name === "*") options.name = "@";
    let zoneId = (await returnZoneViaDomain(domain))["id"];
    let request = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`,
      {
        method: "patch",
        headers: {
          ...defaultHeadersObject,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: options.name,
          type: options.type,
          ttl: options.ttl,
          content: options.value,
          comment: `DDNSU_${options.comment}`,
          proxied: false,
        }),
      }
    );

    let obj = await request.json();

    return (obj as { success: boolean }).success;
  } catch (error) {
    throw error;
  }
}

async function deleteDNSListing(domain: string, recordId: string) {
  try {
    let zoneId = (await returnZoneViaDomain(domain))["id"];
    let request = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`,
      {
        method: "delete",
        headers: { ...defaultHeadersObject },
      }
    );

    return request.ok;
  } catch (error) {
    throw error;
  }
}

export {
  testAuthToken,
  listDomains,
  returnZoneViaDomain,
  listRecordsViaDomain,
  createDNSRecord,
  updateDNSRecord,
  deleteDNSListing,
};
