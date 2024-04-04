import { transferItems } from "./transfer";
import ChiliConnectorV1_1 from "@seancrowe/chiliconnector-v1_1";

const src = await generateConnectorWithKey({ url: "https://ft-nostress.chili-publish.online", username: "", password: "" });
const dest = await generateConnectorWithKey({ url: "https://cp-htf-227.chili-publish.online/", username: "", password: "" });

await transferItems({
  dest: dest, src: src, resource: "Documents", items: [
    "876e1d04-241b-421b-7c60-a772ec0c3f45",
  ]
});

async function generateConnectorWithKey({ url, username, password, environmentName }: { url: string, username: string, password: string, environmentName?: string }): Promise<{ base: string, env: string, newConnector: () => Promise<ChiliConnectorV1_1> }> {

  const { base, env } = (environmentName == null) ? parseChiliPublishURL(url) : { base: url, env: environmentName };

  const newConnector = async () => {
    const connector = new ChiliConnectorV1_1(base);
    const resp = await connector.api.generateApiKey({ environmentNameOrURL: env, userName: username, password: password });

    if (!resp.ok) {
      throw (`Error in response for ${base} - code: ${resp.status}\n${await resp.text()}`);
    }

    const respJson = await resp.json()

    if (respJson["succeeded"] != "true") {
      throw (`Error making key for ${base}`)
    }

    connector.apiKey = respJson.key;
    return connector;
  }

  return {
    base,
    env,
    newConnector,
  }
}

function parseChiliPublishURL(url: string) {
  try {
    const parsedUrl = new URL(url);

    // Extract the base URL
    const base = `${parsedUrl.protocol}//${parsedUrl.hostname}`;

    // Extract the environment part from the hostname
    // Assuming the format is always subdomain.domain.tld
    const env = parsedUrl.hostname.split('.')[0];

    return { base, env };
  } catch (e: any) {
    throw ('Invalid URL:' + e.message);
  }
}
