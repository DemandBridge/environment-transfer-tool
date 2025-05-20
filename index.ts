import type { ResourceName } from "./transfer";
import { transferItems } from "./transfer.js"; // Assuming ResourceName is exported from transfer.ts
import { ChiliConnector } from "@seancrowe/chiliconnector-v1_1";
import chalk from 'chalk'; // For better console logging

// --- CONFIGURATION SECTION --- START ---
// Set this to true to perform the actual transfer after reviewing the list.
const PERFORM_TRANSFER: boolean = true;

// Define Source and Destination environment details
// !! IMPORTANT: Fill these in with your actual URLs, usernames, and passwords !!
const SOURCE_URL = "https://cp-ytp-308.chili-publish.online";
const SOURCE_USERNAME = "dbe";
const SOURCE_PASSWORD = "changeme";

const DEST_URL = "https://cp-dml-179.chili-publish.online";
const DEST_USERNAME = "dbe";
const DEST_PASSWORD = "changeme";

// Define the folder paths on the SOURCE environment you want to transfer
// Use trailing slashes if that's how paths are represented in CHILI
const DOCUMENT_FOLDER_PATHS: string[] = [
  "items/03-47030100",
  // Add more document folder paths if needed
];
const ASSET_FOLDER_PATHS: string[] = [
  "03-47030100",
  "My Images/03-47030100",
  // Add more asset folder paths if needed
];
const FONT_FOLDER_PATHS: string[] = [
  "03-47030100",
  // Add more font folder paths if needed
];
// --- CONFIGURATION SECTION --- END ---

/**
 * Placeholder function to get item IDs within a specific folder from the source CHILI environment.
 * You will need to implement the actual CHILI API calls here using the connector library.
 */
async function getItemIdsInFolder(
  connector: ChiliConnector,
  resourceName: ResourceName,
  folderPath: string, 
  environmentBaseUrl: string
): Promise<string[]> {
  const itemIds: string[] = [];
  console.log(chalk.blue(`Attempting to list items for resource '${resourceName}' in folder '${folderPath}' on ${environmentBaseUrl}...`));

  try {
    // OPTIONAL: Strategy to get Folder ID from path first.
    // Some CHILI APIs might prefer listing by a parentFolderID rather than a string path,
    // or your folderPath might be complex. If your connector's resource listing function
    // works well with string paths, you might not need this section.
    let parentFolderID: string | undefined = undefined;
    /* --- Example for getting folder ID (uncomment and adapt if needed) ---
    console.log(chalk.gray(`  Attempting to get ID for folder path: "${folderPath}"`));
    // Replace 'folderGetByPath' with the actual method from your connector if it exists.
    // Parameters for such a function might include 'resourceName' if folders are tied to resource types,
    // or it might be a generic folder utility.
    const folderInfoResp = await connector.api.FolderGetByName({ name: folderPath }); // GUESS: Verify 'FolderGetByName' and its params

    if (folderInfoResp && folderInfoResp.ok) {
      const folderInfo = await folderInfoResp.json();
      // Adapt this based on the actual response structure for folderInfo.id (e.g., folderInfo.folder?.id, folderInfo.id)
      if (folderInfo && folderInfo.id) { 
        parentFolderID = folderInfo.id;
        console.log(chalk.gray(`  Found folder ID "${parentFolderID}" for path "${folderPath}"`));
      } else {
        console.warn(chalk.yellow(`  Could not retrieve a valid ID for folder path "${folderPath}" from FolderGetByName. Response: ${JSON.stringify(folderInfo)}`));
      }
    } else {
      const errorText = folderInfoResp ? await folderInfoResp.text() : "No response from FolderGetByName";
      console.warn(chalk.yellow(`  API call to get folder ID for "${folderPath}" failed (status: ${folderInfoResp?.status}). Will attempt to list by path directly if possible. Details: ${errorText}`));
    }
    */

    let currentPage = 1;
    const pageSize = 100; // Common page size for CHILI APIs; adjust if necessary.
    let moreItemsExist = true;

    while (moreItemsExist) {
      console.log(chalk.gray(`  Fetching page ${currentPage} for '${resourceName}' in '${folderPath}' (using folder ID: ${parentFolderID || 'No specific ID, relying on path'})...`));
      
      // *** START ACTUAL IMPLEMENTATION TO BE FILLED BY YOU ***
      // This is the most crucial part. You need to find the correct method and parameters 
      // from the @seancrowe/chiliconnector-v1_1 library to list resources.
      // Common CHILI API patterns involve methods like 'ResourceList' or 'ResourceListByPath'.
      
      let listResp;
      // TODO: Replace the following with the correct API call from @seancrowe/chiliconnector-v1_1
      // Determine parameters for resourceList
        let apiParams: any = {
          includeSubDirectories: "true", // Set to "false" if you only want items directly in this folder
          numItems: pageSize.toString(),
          page: currentPage.toString()
        };

        if (parentFolderID) {
          console.log(chalk.dim(`  Using parentFolderID: ${parentFolderID} for connector.api.resourceList`));
          apiParams.parentFolderID = parentFolderID;
        } else {
          console.log(chalk.dim(`  Using path: "${folderPath}" for connector.api.resourceList`));
          apiParams.path = folderPath;
        }

        // Using resourceSearchPagedWithSortingAsync based on JS-ChiliConnector source code
        // Arguments: resourceName, parentFolderPath, includeSubDirectories, nameFilter, pageSize, pageNum, [sortOn, sortOrder, itemID]
        if (connector.api.resourceSearchPagedWithSorting) {
          console.log(chalk.dim(`  Attempting connector.api.resourceSearchPagedWithSorting with path: "${folderPath}", page: ${currentPage}`));
          const searchParams = {
            resourceName: resourceName as any,
            parentFolderPath: folderPath,
            includeSubDirectories: true,
            name: "", // No specific name filter
            pageSize: pageSize,
            pageNum: currentPage
            // sortOn, sortOrder, itemID can be added here if needed
          };
          listResp = await connector.api.resourceSearchPagedWithSorting(searchParams);
        } else {
          console.error(chalk.red(`  connector.api.resourceSearchPagedWithSorting method not found. Please check the connector library.`));
          moreItemsExist = false; // Stop trying if no method is found
          break;
        }
      // *** END ACTUAL IMPLEMENTATION TO BE FILLED BY YOU ***

      if (!listResp || !listResp.ok) {
        const errorText = listResp ? await listResp.text() : "No response from API call.";
        console.error(chalk.red(`  Error listing items on page ${currentPage} in '${folderPath}' for '${resourceName}': ${errorText} (Status: ${listResp?.status})`));
        moreItemsExist = false; // Stop pagination on error
        break; 
      }

      const listData = await listResp.json();
      // For debugging the response structure, uncomment the next line:
      console.log(chalk.dim(`  Raw listData for page ${currentPage}:`), JSON.stringify(listData, null, 2));
      
      let currentItems: any[] = [];
      // Adapt the following based on the actual structure of listData from CHILI's response.
      // Common patterns include 'listData.items.item', 'listData.resources.resource', or the root being an array.
      if (listData && listData.items && listData.items.item) {
        currentItems = Array.isArray(listData.items.item) ? listData.items.item : [listData.items.item];
      } else if (listData && listData.resources && listData.resources.resource) {
        currentItems = Array.isArray(listData.resources.resource) ? listData.resources.resource : [listData.resources.resource];
      } else if (listData && listData.items && Array.isArray(listData.items)) { // e.g. if <items> contains a direct array of item objects
        currentItems = listData.items;
      } else if (listData && listData.item && Array.isArray(listData.item)) {
        currentItems = listData.item;
      } else if (Array.isArray(listData)) { // If the entire response is an array of items
        currentItems = listData;
      } else {
        console.warn(chalk.yellow(`  No items found in expected structures (items.item, resources.resource, or root array) on page ${currentPage}. Response structure might be different.`));
      }

      if (currentItems.length > 0) {
        currentItems.forEach((item: any) => {
          if (item && item.id) {
            itemIds.push(item.id);
          } else {
            // console.warn(chalk.yellow(`  Found an item without an ID on page ${currentPage}:`), item); // Can be noisy
          }
        });
        console.log(chalk.gray(`  Fetched ${currentItems.length} items on page ${currentPage}. Total for this folder so far: ${itemIds.length}`));
        moreItemsExist = currentItems.length === pageSize; // Key for pagination
        if (moreItemsExist) {
          currentPage++;
        } else {
          console.log(chalk.gray(`  All items for this folder appear to be fetched (last page size: ${currentItems.length}).`));
        }
      } else {
        console.log(chalk.gray(`  No items returned on page ${currentPage}. Ending pagination for this folder.`));
        moreItemsExist = false;
      }
    }
  } catch (error: any) {
    console.error(chalk.red(`  Critical error during getItemIdsInFolder for '${folderPath}', resource '${resourceName}':`), error.message, error.stack);
  }

  if (itemIds.length === 0) {
      console.warn(chalk.yellow(`  [Final Result] No items found for '${resourceName}' in folder '${folderPath}'. Please verify path, API calls, and response parsing.`));
  } else {
      console.log(chalk.greenBright(`  [Final Result] Successfully listed ${itemIds.length} item(s) for '${resourceName}' in folder '${folderPath}'.`));
  }
  return itemIds;
}


async function main() {
  console.log(chalk.bold.cyan("--- Environment Transfer Tool: Folder Transfer Mode ---"));

  // if (SOURCE_URL === "https://your-source-environment.chili-publish.online" || DEST_URL === "https://your-dest-environment.chili-publish.online") {
  //   console.error(chalk.red("Please configure SOURCE_URL, SOURCE_USERNAME, SOURCE_PASSWORD, DEST_URL, DEST_USERNAME, and DEST_PASSWORD in index.ts before running."));
  //   return;
  // }

  const srcConfig = { url: SOURCE_URL, username: SOURCE_USERNAME, password: SOURCE_PASSWORD };
  const destConfig = { url: DEST_URL, username: DEST_USERNAME, password: DEST_PASSWORD };

  const src = await generateConnectorWithKey(srcConfig);
  const dest = await generateConnectorWithKey(destConfig);
  const srcConnectorInstance = src.connectorInstance; // Use the instance already created by generateConnectorWithKey

  if (!srcConnectorInstance) {
    console.error(chalk.red("Failed to get a source connector instance. Aborting."));
    return;
  }

  console.log(chalk.bold("\n--- Phase 1: Listing items to be transferred ---"));

  const allDocumentIds: string[] = [];
  for (const folderPath of DOCUMENT_FOLDER_PATHS) {
    const ids = await getItemIdsInFolder(srcConnectorInstance, "Documents", folderPath, src.base);
    allDocumentIds.push(...ids);
  }

  const allAssetIds: string[] = [];
  for (const folderPath of ASSET_FOLDER_PATHS) {
    const ids = await getItemIdsInFolder(srcConnectorInstance, "Assets", folderPath, src.base);
    allAssetIds.push(...ids);
  }

  const allFontIds: string[] = [];
  for (const folderPath of FONT_FOLDER_PATHS) {
    const ids = await getItemIdsInFolder(srcConnectorInstance, "Fonts", folderPath, src.base);
    allFontIds.push(...ids);
  }

  console.log(chalk.bold("\n--- Summary of items to transfer ---"));
  console.log(chalk.green(`Found ${allDocumentIds.length} Document(s) across ${DOCUMENT_FOLDER_PATHS.length} folder(s).`));
  console.log(chalk.green(`Found ${allAssetIds.length} Asset(s) across ${ASSET_FOLDER_PATHS.length} folder(s).`));
  console.log(chalk.green(`Found ${allFontIds.length} Font(s) across ${FONT_FOLDER_PATHS.length} folder(s).`));
  const totalItems = allDocumentIds.length + allAssetIds.length + allFontIds.length;
  console.log(chalk.yellow(`Total items to transfer: ${totalItems}`));

  if (!PERFORM_TRANSFER) {
    console.log(chalk.bold.yellow("\n--- Transfer Paused ---"));
    console.log(chalk.yellow("PERFORM_TRANSFER is set to false. No items will be transferred at this time."));
    console.log(chalk.yellow("Review the list above. If correct, set PERFORM_TRANSFER to true in index.ts and re-run the script."));
    return;
  }

  if (totalItems === 0) {
    console.log(chalk.bold.yellow("\nNo items found to transfer. Exiting."));
    return;
  }

  console.log(chalk.bold.cyan("\n--- Phase 2: Performing Transfer --- (PERFORM_TRANSFER is true)"));

  // Transfer order: Fonts, then Assets, then Documents (to help with dependencies)
  if (allFontIds.length > 0) {
    console.log(chalk.magenta(`\nTransferring ${allFontIds.length} Font(s)...`));
    await transferItems({
      dest: dest, src: src, resource: "Fonts", items: allFontIds,
      options: { destPath: { identical: true } } 
    });
  }

  if (allAssetIds.length > 0) {
    console.log(chalk.magenta(`\nTransferring ${allAssetIds.length} Asset(s)...`));
    await transferItems({
      dest: dest, src: src, resource: "Assets", items: allAssetIds,
      options: { destPath: { identical: true } } 
    });
  }

  if (allDocumentIds.length > 0) {
    console.log(chalk.magenta(`\nTransferring ${allDocumentIds.length} Document(s)...`));
    await transferItems({
      dest: dest, src: src, resource: "Documents", items: allDocumentIds,
      options: { destPath: { identical: true } }
    });
  }

  console.log(chalk.bold.green("\n--- Transfer process finished. ---"));
  console.log(chalk.green("Check your destination environment."));
}

// Original CHILI helper functions (generateConnectorWithKey, parseChiliPublishURL)
// These are assumed to be correct and are kept as is.
async function generateConnectorWithKey({ url, username, password, environmentName }: { url: string, username: string, password: string, environmentName?: string }): Promise<{ base: string, env: string, newConnector: () => Promise<ChiliConnector>, connectorInstance?: ChiliConnector }> {
  const { base, env } = (environmentName == null) ? parseChiliPublishURL(url) : { base: url, env: environmentName };
  let sharedConnectorInstance: ChiliConnector | undefined;

  const getSharedConnector = async () => {
    if (sharedConnectorInstance) return sharedConnectorInstance;
    const connector = new ChiliConnector(base);
    const resp = await connector.api.generateApiKey({ environmentNameOrURL: env, userName: username, password: password });
    if (!resp.ok) {
      throw (`Error in response for ${base} - code: ${resp.status}\n${await resp.text()}`);
    }
    const respJson = await resp.json();
    if (respJson["succeeded"] != "true") {
      throw (`Error making key for ${base}`);
    }
    connector.apiKey = respJson.key;
    sharedConnectorInstance = connector;
    return connector;
  };

  return {
    base,
    env,
    newConnector: getSharedConnector, // Use the memoized version for repeated calls within transferItems
    connectorInstance: await getSharedConnector() // Provide one instance for initial listing
  };
}

function parseChiliPublishURL(url: string) {
  try {
    const parsedUrl = new URL(url);
    const base = `${parsedUrl.protocol}//${parsedUrl.hostname}`;
    const env = parsedUrl.hostname.split('.')[0];
    return { base, env };
  } catch (e: any) {
    throw ('Invalid URL:' + e.message);
  }
}

// Run the main process
main().catch(error => {
  console.error(chalk.red("\nUnhandled error in main execution:"), error);
  process.exit(1);
});
