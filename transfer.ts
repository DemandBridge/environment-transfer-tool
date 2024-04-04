import ChiliConnectorV1_1 from "@seancrowe/chiliconnector-v1_1";
import chalk from "chalk";
import { ChiliDocument } from "./document";

export type ResourceName =
  | "Users"
  | "UserGroups"
  | "DataSources"
  | "DynamicAssetProviders"
  | "XinetSettings"
  | "SwitchServerSettings"
  | "PdfExportSettings"
  | "HtmlExportSettings"
  | "IdmlExportSettings"
  | "OdfExportSettings"
  | "ImageConversionProfiles"
  | "DocumentTemplates"
  | "ImageTransformations"
  | "BarcodeTypes"
  | "OdtImportSettings"
  | "StructuredTextImportSettings"
  | "DocumentConstraints"
  | "ThreeDModels"
  | "FoldingSettings"
  | "Documents"
  | "Fonts"
  | "WorkSpaces"
  | "ViewPreferences"
  | "Assets";

type DestinationPath = { identical: true } | { identical: false; path: string };

export async function transferItems({
  dest,
  src,
  resource,
  items,
  options,
}: {
  dest: {
    base: string;
    env: string;
    newConnector: () => Promise<ChiliConnectorV1_1>;
  };
  src: {
    base: string;
    env: string;
    newConnector: () => Promise<ChiliConnectorV1_1>;
  };
  resource: ResourceName;
  items: string[];
  options: { disablePreviews?: boolean; destPath?: DestinationPath };
}) {
  const { disablePreviews = true, destPath = { identical: true } } = options;

  if (items.length == 0) {
    return;
  }
  const srcConnector = await src.newConnector();

  let itemAmount = items.length;
  console.log(`Amount of ${resource} to transfer: ${itemAmount}`);

  for (let i = 0; i < items.length; i++) {
    // Reset key to make sure if something goes wrong, setNextResourceID wont screw up the wrong id
    const destConnector = await dest.newConnector();

    if (disablePreviews) {
      try {
        const resp = await destConnector.api.setAutomaticPreviewGeneration({
          createPreviews: false,
        });
        if (!resp.ok) {
          console.log(
            chalk.red(
              "There was an issue disabling the automatic preview generation for the CHILI Destination Server API Key",
            ),
          );
          console.log(`\n${resp.text}\n`);
        }
      } catch (e) {
        console.log("Skipping complete transfer");
        return;
      }
    }

    const id = items[i];
    let resp = await srcConnector.api.resourceItemGetDefinitionXML({
      itemID: id,
      resourceName: resource as any,
    });

    console.log(`\nTransfer #${i} - ${id} from ${src.base} to ${dest.base}`);

    if (!resp.ok) {
      console.log(
        chalk.red(`${resource} not found with id ${id} on ${src.base}`),
      );
      console.log(await resp.text());
      console.log("Skipping");
      continue;
    }

    const itemDef = (await resp.json()) as {
      name: string;
      id: string;
      relativePath: string;
      fileInfo: { fileSize: string };
    };

    console.log(
      `Setting the ID for the next uploaded item to ${dest.base} to ${id}`,
    );

    resp = await destConnector.api.setNextResourceItemID({
      itemID: id,
      resourceName: resource as any,
    });

    if (!resp.ok) {
      console.log(
        chalk.red(
          `There was an issue setting the next item ID for ${itemDef.name}: ${itemDef.id}\n${await resp.text()}`,
        ),
      );
      console.log("Skipping");
      continue;
    }

    const alreadyExists = (await resp.json()).finished == "False";

    if (alreadyExists) {
      console.log(
        chalk.yellow(
          `Item ${itemDef.name} with id ${itemDef.id} already exists on ${dest.base}`,
        ),
      );
      console.log("Skipping");
      continue;
    }

    if (itemDef.relativePath == null) {
      console.log(chalk.red(`Path is missing for ${resource} with id ${id}`));
      console.log(itemDef);
      console.log("Skipping");
      continue;
    }

    let splitPath = itemDef.relativePath.split("\\");
    const fileName = splitPath.pop() ?? itemDef.name;
    const newPath =
      itemDef.relativePath == ""
        ? ""
        : destPath.identical
          ? splitPath.join("\\") + "\\"
          : destPath.path;

    if (fileName == null) {
      console.log(chalk.red(`Name is missing for ${resource} with id ${id}`));
      console.log("Skipping");
      continue;
    }

    const totalTries = 6;

    if (resource == "Assets" || resource == "Fonts") {
      for (let tries = 1; tries <= totalTries; tries++) {
        if (tries > 1) {
          console.log(
            chalk.yellow(
              `Trying again to transfer ${resource} - try #${tries}`,
            ),
          );
        }

        console.log(
          `Downloading ${resource} file data temporarily into memory for: ${itemDef.name}`,
        );
        resp = await srcConnector.api.downloadAssets({
          resourceType: resource,
          id,
          type: "original",
          page: 1,
        });

        if (!resp.ok) {
          console.log(
            chalk.red(
              `There was an issue downloading the ${resource} - Name: ${itemDef.name} -- Item ID: ${id}\n${await resp.text()}`,
            ),
          );
          continue;
        }

        // Could be optimized with
        // dest.base + "/" + dest.env + "/upload_resource.aspx?multiple=true";

        if (tries == 1) {
          resp = await destConnector.api.resourceItemAdd({
            fileData: Buffer.from(await resp.readAsArrayBuffer()).toString(
              "base64",
            ), //fileBuffer.toString('base64'),
            newName: fileName,
            resourceName: resource,
            xml: "",
            folderPath: newPath,
          });
        } else {
          resp = await destConnector.api.resourceItemReplaceFile({
            itemID: id,
            fileData: Buffer.from(await resp.readAsArrayBuffer()).toString(
              "base64",
            ), //fileBuffer.toString('base64'),
            resourceName: resource,
          });
        }

        if (!resp.ok) {
          console.log(
            chalk.red(
              `There was an issue uploading the asset to the destination server- Name: ${itemDef.name} -- Item ID: ${id}\n${await resp.text()}`,
            ),
          );
          continue;
        }

        console.log(
          `Comparing file sizes for - Name: ${itemDef.name} -- Item ID: ${id}`,
        );
        resp = await destConnector.api.resourceItemGetDefinitionXML({
          itemID: id,
          resourceName: resource,
        });

        if (!resp.ok) {
          console.log(
            chalk.red(
              `${resource} not found with id ${id} on ${dest.base} after upload`,
            ),
          );
          continue;
        }

        const itemDef2 = (await resp.json()) as {
          name: string;
          id: string;
          relativePath: string;
          fileInfo: { fileSize: string };
        };

        if (
          itemDef.fileInfo?.fileSize != null &&
          itemDef.fileInfo.fileSize == itemDef2.fileInfo.fileSize
        ) {
          console.log(
            chalk.green(
              `Successifully uploaded ${resource} ${itemDef.name} to ${dest.base} with id ${id}`,
            ),
          );
          break;
        } else {
          console.log(
            `File size was wrong for ${itemDef.name} on ${dest.base} with id ${id}`,
          );
          console.log(itemDef.fileInfo?.fileSize, itemDef2.fileInfo?.fileSize);

          if (tries == totalTries) {
            console.log(
              `Deleting ${id} from ${dest.base} due to file size being wrong`,
            );

            await destConnector.api.resourceItemDelete({
              itemID: id,
              resourceName: resource,
            });
          }
        }

        if (tries == totalTries) {
          console.log(
            chalk.red(
              `Failed to uploaded ${itemDef.name} to ${dest.base} with id ${id}`,
            ),
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    if (resource == "Documents") {
      console.log(
        `Downloading ${resource} file data temporarily into memory for: ${itemDef.name}`,
      );

      resp = await srcConnector.api.resourceItemGetXML({
        resourceName: resource,
        itemID: id,
      });

      if (!resp.ok) {
        console.log(
          chalk.red(
            `There was an issue downloading the ${resource} - Name: ${itemDef.name} -- Item ID: ${id}\n${await resp.text()}`,
          ),
        );
        console.log("Skipping");
        continue;
      }

      let chiliDoc = null;

      try {
        chiliDoc = new ChiliDocument(await resp.text());
      } catch (e) {
        console.log(chalk.red(`Error parsing document XML for ${id}`));
      }

      if (chiliDoc == null) {
        console.log("Skipping");
        continue;
      }

      const datasourceId = chiliDoc.datasourceId;
      if (datasourceId != null && datasourceId != "") {
        console.log(
          `Found DataSource attached to document, transferring DataSource settings...`,
        );
        await transferItems({
          dest,
          src,
          resource: "DataSources",
          items: [datasourceId],
          options
        });
      }

      console.log(`Found Fonts in document, transferring...`);
      // Arial Regular will usually fail because it has a fake id for the built in Arial
      await transferItems({
        dest,
        src,
        resource: "Fonts",
        items: chiliDoc
          .getFonts()
          .filter((f) => f.name != "Arial Regular")
          .map((f) => f.id),
        options
      });

      const mixture = chiliDoc.getImages();

      const assets = mixture.filter((a) => a.resourceType == "Assets");
      if (assets.length > 0) {
        console.log(`Found images in document, transferring...`);
        await transferItems({
          dest,
          src,
          resource: "Assets",
          items: assets.map((a) => a.id),
          options
        });
      }

      const dap = mixture.filter(
        (a) => a.resourceType == "DynamicAssetProviders",
      );
      if (dap.length > 0) {
        console.log(
          `Found Dynamic Asset Providers in document, transferring settings for DAP...`,
        );
        await transferItems({
          dest,
          src,
          resource: "DynamicAssetProviders",
          items: dap.map((a) => a.id),
          options
        });
      }

      const barcodeIds = chiliDoc.getBarcodeIds();
      if (barcodeIds.length > 0) {
        console.log(
          `Found Barcode frames in document, transferring Barcode settings...`,
        );
        await transferItems({
          dest,
          src,
          resource: "BarcodeTypes",
          items: barcodeIds,
          options
        });
      }

      const totalTries = 20;

      // This is super weird - if you upload the XML, then opening it will make it go blank most times, but it seems like if you run process server side it is fixed
      // I added the check below, but downloading the XML after uploading (no process server side) it says it has the correct frames, but if you go open it will be blank
      // Once I added process server side it is fixed
      // Reproduce, remove process server side and uncomment the fs.writeFileSync to see the downloaded result

      // See notes above
      for (let tries = 1; tries <= totalTries; tries++) {
        if (tries > 1) {
          console.log(
            chalk.yellow(
              `Trying again to transfer ${resource} - try #${tries}`,
            ),
          );
        } else {
          // Create a placeholder document because if you ResourceItemAdd a document, CHILI will process the XML and will remove spaces
          resp = await destConnector.api.resourceItemAdd({
            fileData: "",
            newName: itemDef.name,
            folderPath: newPath,
            xml: "<document />",
            resourceName: "Documents",
          });

          if (!resp.ok) {
            console.log(
              `There was an issue creating a placeholder document to the destination server- Name: ${itemDef.name} -- Item ID: ${id}\n${await resp.text()}"`,
            );
            console.log("Skipping");
            continue;
          }
        }

        resp = await destConnector.api.resourceItemSave({
          itemID: id,
          resourceName: "Documents",
          xml: chiliDoc.toXml(),
        });

        if (!resp.ok) {
          console.log(
            `There was an issue uploading the document to the destination server- Name: ${itemDef.name} -- Item ID: ${id}\n${await resp.text()}`,
          );
          console.log("Skipping");
          continue;
        }

        await destConnector.api.documentProcessServerSide({
          itemID: id,
          resourceXML: "",
        });

        await new Promise((resolve) => setTimeout(resolve, 500));

        const resp2 = await destConnector.api.resourceItemGetXML({
          resourceName: resource,
          itemID: id,
        });

        if (!resp2.ok) {
          console.log(
            chalk.red(
              `There was an issue checking document with Item ID: ${id}\n${await resp.text()}`,
            ),
          );
          continue;
        }

        let chiliDoc2 = null;

        try {
          chiliDoc2 = new ChiliDocument(await resp2.text());
        } catch (e) {
          console.log(chalk.red(`Error parsing document XML for ${id}`));
        }

        if (chiliDoc2 == null) {
          continue;
        }

        if (chiliDoc2.frames.length > 0) {
          // console.log(chiliDoc2.frames.length);
          // fs.writeFileSync("./document.xml", chiliDoc2.toXml(), "utf-8");
          console.log(
            chalk.green(
              `Successifully uploaded document ${itemDef.name} to ${dest.base} with id ${id}`,
            ),
          );
          break;
        }

        if (totalTries == 20) {
          console.log(
            chalk.red(
              `Document with Item ID: ${id} was blank, and we tried... sorry`,
            ),
          );
          console.log(
            `Deleting document with ${itemDef.name} with id ${id} because it is blank`,
          );

          const resp = await destConnector.api.resourceItemDelete({
            itemID: id,
            resourceName: resource,
          });

          if (!resp.ok) {
            console.log(
              chalk.red(
                `Failure to delete document with ${itemDef.id} from ${dest.base}`,
              ),
            );
          }
        }
      }
    }

    if (
      resource != "Assets" &&
      resource != "Documents" &&
      resource != "Fonts"
    ) {
      resp = await srcConnector.api.resourceItemGetXML({
        itemID: id,
        resourceName: resource,
      });

      if (!resp.ok) {
        console.log(
          chalk.red(
            `There was an issue downloading the ${resource} - Name: ${itemDef.name} -- Item ID: ${id}\n${await resp.text()}`,
          ),
        );
        console.log("Skipping");
        continue;
      }

      resp = await destConnector.api.resourceItemAdd({
        fileData: "",
        newName: itemDef.name,
        folderPath: newPath,
        xml: await resp.text(),
        resourceName: resource,
      });

      if (!resp.ok) {
        console.log(
          `There was an issue adding ${resource} to destination server- Name: ${itemDef.name} -- Item ID: ${id}\n${await resp.text()}"`,
        );
        console.log("Skipping");
        continue;
      }

      console.log(
        chalk.green(
          `Successifully uploaded ${resource} ${itemDef.name} to ${dest.base} with id ${id}`,
        ),
      );
    }
    console.log("💤 " + chalk.blue("sleeping to not overwhelm server"));
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
