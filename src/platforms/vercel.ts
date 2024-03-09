import { Reader } from "../toml";

const vercelAuthToken =
  process.env["VERCEL_AUTH_TOKEN"] ??
  Reader.get("vercel.authToken") ??
  undefined;
if (vercelAuthToken === undefined) {
  throw "Vercel auth token is not configured in the .env file or command environment.";
}

let defaultHeadersObject = {
  Authorization: `Bearer ${vercelAuthToken}`,
};

async function testAuthToken(): Promise<boolean> {
  try {
    let request = await fetch("https://api.vercel.com/v5/domains", {
      method: "get",
      headers: { ...defaultHeadersObject },
    });

    if (!request.ok || request.status === 403) {
      return false;
    } else {
      return true;
    }
  } catch (error) {
    throw error;
  }
}

interface DomainListingResponse {
  domains: {
    createdAt: number;
    id: string;
    name: string;
    renew: boolean;
    serviceType: string;
    cdnEnabled: boolean;
    verified: boolean;
    nameservers: string[];
    intendedNameservers: string[];
    zone: boolean;
    verificationRecord: string;
  }[];
  pagination: {
    count: number;
    next: number;
    prev: number;
  };
}

async function returnDomains() {
  try {
    let request = await fetch("https://api.vercel.com/v5/domains", {
      method: "get",
      headers: { ...defaultHeadersObject },
    });

    let data = (await request.json()) as DomainListingResponse;
    let reformattedDomains = data.domains.map((domain) => {
      return {
        name: domain.name,
        id: domain.id,
        verified: domain.verified,
        nameservers: domain.nameservers,
        zone: domain.zone,
      };
    });

    return reformattedDomains;
  } catch (error) {
    throw error;
  }
}

interface DNSListingResponse {
  records: {
    id: string;
    slug?: string;
    name: string;
    type: string;
    value: string;
    creator?: string;
    created: number;
    updated: number;
    createdAt: number;
    updatedAt: number;
    ttl: number;
    comment?: string;
  }[];
  pagination: {
    count: number;
    next: number;
    prev: number;
  };
}

const dnsRequestInstanceLimit = 20;
async function returnDNSListings(domain: string) {
  try {
    let request = await fetch(
      `https://api.vercel.com/v4/domains/${domain}/records?limit=${dnsRequestInstanceLimit}`,
      {
        method: "get",
        headers: { ...defaultHeadersObject },
      }
    );

    let data = (await request.json()) as DNSListingResponse;
    let reformattedDNSRecords = data.records.map((record) => {
      return {
        id: record.id,
        name: record.name,
        type: record.type,
        value: record.value,
        comment: record.comment,
      };
    });

    return reformattedDNSRecords;
  } catch (error) {
    throw error;
  }
}

async function createDNSListing(
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
    let request = await fetch(
      `https://api.vercel.com/v2/domains/${domain}/records`,
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
          value: options.value,
          comment: `DDNSU_${options.comment}`,
        }),
      }
    );

    let data = (await request.json()) as { uid: string; updated: number };

    return data["uid"];
  } catch (error) {
    throw error;
  }
}

async function updateDNSListing(
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
    let request = await fetch(
      `https://api.vercel.com/v1/domains/records/${recordId}`,
      {
        method: "patch",
        headers: {
          ...defaultHeadersObject,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comment: `DDNSU_${options.comment}`,
          https: null,
          mxPriority: null,
          name: options.name,
          srv: null,
          ttl: options.ttl,
          type: options.type,
          value: options.value,
        }),
      }
    );

    return request.ok;
  } catch (error) {
    throw error;
  }
}

async function deleteDNSListing(domain: string, recordId: string) {
  try {
    let request = await fetch(
      `https://api.vercel.com/v2/domains/${domain}/records/${recordId}`,
      {
        method: "delete",
        headers: { ...defaultHeadersObject },
      }
    );

    console.log(await request.json());

    return request.ok;
  } catch (error) {
    throw error;
  }
}

export {
  testAuthToken,
  returnDomains,
  returnDNSListings,
  createDNSListing,
  updateDNSListing,
  deleteDNSListing,
};
