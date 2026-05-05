export interface OpportunityData {
  Id: string;
  Name: string;
  CloseDate: string;
  Amount: number | null;
  Opp_Account__c: string | null;
  Contact_Name__c: string | null;
  Client_Email__c: string | null;
  Set_Up_Type__c: string | null;
  Skus_and_Colors__c: string | null;
  Wrike_ART_Type__c: string | null;
  Owner?: { Name: string };
}

const OPPORTUNITY_FIELDS = [
  "Id",
  "Name",
  "CloseDate",
  "Amount",
  "Opp_Account__c",
  "Contact_Name__c",
  "Client_Email__c",
  "Set_Up_Type__c",
  "Skus_and_Colors__c",
  "Wrike_ART_Type__c",
  "Owner.Name",
] as const;

const SF_API_VERSION = "v59.0";
const TOKEN_CACHE_DURATION_MS = 60 * 60 * 1000;

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const clientId = process.env.SF_CLIENT_ID;
  const clientSecret = process.env.SF_CLIENT_SECRET;
  const refreshToken = process.env.SF_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Salesforce credentials");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch("https://login.salesforce.com/services/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`SF token refresh failed (${res.status}): ${await res.text()}`);

  const data = await res.json();
  cachedToken = data.access_token as string;
  tokenExpiresAt = Date.now() + TOKEN_CACHE_DURATION_MS;
  return cachedToken;
}

function getInstanceUrl(): string {
  const url = process.env.SF_INSTANCE_URL;
  if (!url) throw new Error("Missing SF_INSTANCE_URL");
  return url.replace(/\/$/, "");
}

export async function getOpportunity(oppId: string): Promise<OpportunityData> {
  const token = await getAccessToken();
  const instanceUrl = getInstanceUrl();
  const fields = OPPORTUNITY_FIELDS.join(",");
  const url = `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Opportunity/${oppId}?fields=${fields}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 },
  });

  if (!res.ok) throw new Error(`SF getOpportunity failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as OpportunityData;
}
