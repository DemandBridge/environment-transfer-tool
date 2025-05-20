# Environment Transfer Tool

The environment transfer tool is a work-in-progress (WIP) library that has been used successfully to transfer data between CHILI publish environments. While it has proven valuable, please be aware that as a WIP, there's still a possibility of encountering errors.

## Overview

This tool facilitates the transfer of CHILI publish resources (Documents, Assets, Fonts, etc.) from a source environment to a destination environment. It has been enhanced from its original version to include a "Folder-Based Transfer" mode, which is particularly useful for migrating entire folder structures.

## Setup and Installation

1.  **Prerequisites:**
    *   [Node.js](https://nodejs.org/) (which includes `npm`, the Node Package Manager). Ensure you have a recent LTS version installed.

2.  **Clone the Repository:**
    *   Download or clone this repository to your local machine.

3.  **Install Dependencies:**
    *   Open a terminal or command prompt in the root directory of the cloned project.
    *   Run the command:
        ```bash
        npm install
        ```
    *   This will install the necessary packages, including `@seancrowe/chiliconnector-v1_1` for CHILI API interaction, `chalk` for colored console output, and TypeScript-related development dependencies.

4.  **Compile TypeScript:**
    *   Before running the tool, you need to compile the TypeScript source code (`.ts` files) into JavaScript (`.js` files).
    *   In your terminal, run:
        ```bash
        npx tsc
        ```
    *   This command uses the TypeScript compiler (tsc) to process the files according to the `tsconfig.json` configuration. It will output the compiled JavaScript files into a `dist` directory.

## Configuration (`index.ts`)

All primary configurations are done at the top of the `index.ts` file.

### Credentials and Environment URLs:

You **must** update these placeholders with your actual environment details.

```typescript
// --- CONFIGURATION SECTION --- START ---
const PERFORM_TRANSFER: boolean = false; // Set to true to perform actual transfer

// SOURCE Environment Details
const SOURCE_URL = "https://your-source.chili-publish.online";
const SOURCE_USERNAME = "your_source_username";
const SOURCE_PASSWORD = "your_source_password"; // IMPORTANT: Replace with actual password

// DESTINATION Environment Details
const DEST_URL = "https://your-dest.chili-publish.online";
const DEST_USERNAME = "your_dest_username";
const DEST_PASSWORD = "your_dest_password"; // IMPORTANT: Replace with actual password
// --- CONFIGURATION SECTION --- END ---
```

*   `PERFORM_TRANSFER: boolean`:
    *   Set to `false` (default): The script will run in a "list-only" or "dry-run" mode. It will connect to the source, enumerate all items it finds in the specified folders (for Folder-Based Transfer), and print a summary. **No actual transfer to the destination will occur.** This is highly recommended for a first run to verify item counts and paths.
    *   Set to `true`: The script will perform the actual transfer of items to the destination environment after listing them.

### Folder Paths for Folder-Based Transfer:

If you are using the Folder-Based Transfer mode, define the paths to the folders on the **source** environment that you wish to transfer.

```typescript
// Define the folder paths on the SOURCE environment you want to transfer
const DOCUMENT_FOLDER_PATHS: string[] = [
  "items/MyProject/Annual Reports", // Example: A folder for documents
  "items/AnotherProject/Brochures"
];
const ASSET_FOLDER_PATHS: string[] = [
  "MyAssets/BrandLogos",       // Example: A folder for assets
  "Shared/StockPhotography"
];
const FONT_FOLDER_PATHS: string[] = [
  "BrandFonts/Primary",        // Example: A folder for fonts
  "ProjectFonts/Secondary"
];
```
*   Provide full paths as they appear in the CHILI environment.
*   The script will recursively list items within these paths.

## Running the Tool

1.  Ensure you have configured `index.ts` and compiled the code using `npx tsc`.
2.  Open your terminal in the root directory of the project.
3.  Execute the script using Node.js:
    ```bash
    node dist/index.js
    ```
4.  **Logging:** For easier review, especially with large transfers that produce extensive console output, it's highly recommended to redirect the output to a log file:
    ```bash
    node dist/index.js > transfer_log.txt 2>&1
    ```
    This command will save all standard output and standard error to `transfer_log.txt`.

## Transfer Modes

This tool supports two main modes of operation, primarily controlled by how you set up the `main` function in `index.ts`. The current version in this fork is heavily geared towards the **Folder-Based Transfer**.

### 1. Folder-Based Transfer (Fork Enhancement - Current Primary Mode)

This is the primary mode enhanced in this fork. It allows you to specify source folder paths for Documents, Assets, and Fonts. The script will then list all items within these folders (and their subfolders) and transfer them to the destination environment, attempting to preserve the relative folder structure.

**How it Works (Folder-Based):**

1.  **Configuration:** You set `SOURCE_URL`, `DEST_URL`, credentials, and the `DOCUMENT_FOLDER_PATHS`, `ASSET_FOLDER_PATHS`, `FONT_FOLDER_PATHS` arrays in `index.ts`.
2.  **Listing:** The script connects to the source environment and iterates through each defined folder path. It uses the CHILI API (`resourceSearchPagedWithSorting`) to list all items recursively within these paths.
3.  **Summary:** A summary of all found items (IDs and names) for each resource type (Fonts, Assets, Documents) is printed to the console (and your log file).
4.  **Transfer (if `PERFORM_TRANSFER` is `true`):**
    *   **Order of Transfer:** To manage dependencies, items are transferred in a specific order:
        1.  Fonts
        2.  Assets
        3.  Documents
    *   **Path Preservation:** The tool uses `options: { destPath: { identical: true } }` when calling `transferItems`. This instructs the CHILI API to attempt to replicate the source folder structure on the destination. If parent folders do not exist on the destination, the API typically creates them.

**Important Notes for Folder-Based Transfer:**

*   **Dependencies:** When a Document is transferred, the `ChiliDocument` class (from the underlying connector library) inherently attempts to resolve and transfer all its dependencies (e.g., linked assets, fonts). This occurs even if those dependencies reside *outside* the explicitly listed `ASSET_FOLDER_PATHS` or `FONT_FOLDER_PATHS`. The folder-based transfer prioritizes items *within* your specified folders first.
*   **Folder Creation:** The CHILI API generally handles the creation of necessary parent folders on the destination if they don't already exist when an item is placed into a path.
*   **Large Transfers:** Transferring many folders or folders with a very large number of items can be time-consuming and generate extensive logs. Always use output redirection to a file.
*   **API Limits & Timeouts:** Be mindful of potential CHILI API rate limits or server timeouts, especially with extremely large transfers. If you encounter issues, consider breaking down the transfer into smaller batches (e.g., by specifying fewer folder paths per run).

### 2. Item-by-Item Transfer (Original Mode)

The original version of this tool focused on transferring specific items by their known IDs. While the current `main` function in `index.ts` is set up for folder-based transfer, the underlying `transferItems` function can still be used for item-by-item transfers if you modify the `main` function.

**Editing `index.ts` for Manual Item-by-Item Transfer:**

1.  You would still configure `SOURCE_URL`, `DEST_URL`, and credentials.
2.  Instead of relying on `getItemIdsInFolder`, you would manually populate arrays of item IDs.
3.  You would then call `transferItems` directly in the `main` function with your prepared item ID lists:

    ```typescript
    // Example of manual item-by-item transfer (you would need to modify main())
    // const srcConnector = await generateConnectorWithKey({ url: SOURCE_URL, username: SOURCE_USERNAME, password: SOURCE_PASSWORD });
    // const destConnector = await generateConnectorWithKey({ url: DEST_URL, username: DEST_USERNAME, password: DEST_PASSWORD });

    // const specificDocumentIds = [
    //   "876e1d04-241b-421b-7c60-a772ec0c3f45",
    //   "911e1d02-223b-123b-8b50-b442ef1c0e34",
    // ];
    // await transferItems({
    //   dest: destConnector,
    //   src: srcConnector,
    //   resource: "Documents", // Or "Assets", "Fonts", etc.
    //   items: specificDocumentIds,
    //   // options: { destPath: { identical: true } } // Optional path preservation
    // });
    ```

**Note on Documents (Item-by-Item):** Even when transferring individual documents by ID, the system will automatically transfer their dependent assets, fonts, barcodes, datasource settings, and snippets.

## Troubleshooting and Tips

*   **Check Logs First:** Before assuming a transfer failed or worked, always review the `transfer_log.txt` (or your chosen log file name) carefully. Look for error messages or confirmation of item transfers.
*   **`PERFORM_TRANSFER = false`:** Always do a dry run first.
*   **Permissions:** Ensure the user credentials provided have adequate permissions on both source (to read/access items) and destination (to create/write items and folders) environments.
*   **Environment URLs:** Double-check that the `SOURCE_URL` and `DEST_URL` are correct and accessible.
*   **Memory Usage:** For very large numbers of items, Node.js might consume significant memory. If you encounter out-of-memory errors, try processing fewer folders/items per run.

## Credit

This tool has its origins in the `chilitools-public` repository by Austin Meier ([https://github.com/austin-meier/chilitools-public](https://github.com/austin-meier/chilitools-public)). Many thanks to Austin for his foundational work. This current version is a significant rewrite and enhancement of the migration portion of that original tool, with a primary focus on robust folder-based transfers.
