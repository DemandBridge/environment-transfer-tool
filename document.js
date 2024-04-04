const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

export class ChiliDocument {
  constructor(docXml) {
    try {
      const parser = new DOMParser();
      const realDoc = parser.parseFromString(docXml, "application/xml");
      this.doc = realDoc.getElementsByTagName("document")[0];

      // Check for parsing errors
      const parserError = this.doc.getElementsByTagName("parsererror");
      if (parserError.length > 0) {
        // Extract error message if possible, else use a generic message
        const errorMessage = parserError[0].textContent || "Error parsing XML";
        throw new Error(errorMessage);
      }
    } catch (e) {
      this.doc = null;
      console.error("There was an error creating a Document from the XML");
      console.log(e);
      throw e;
    }
  }

  get name() {
    return this.doc ? this.doc.documentElement.getAttribute('name') : undefined;
  }

  get id() {
    return this.doc ? this.doc.documentElement.getAttribute('id') : undefined;
  }

  toString() {
    return this.toXml();
  }

  toXml() {
    return new XMLSerializer().serializeToString(this.doc);
  }

  get datasourceId() {
    if (!this.doc) return undefined;
    const ds = this.getDatasource();
    return ds ? ds.getAttribute('dataSourceID') : undefined;
  }

  getDatasource() {
    const dataSources = this.doc.getElementsByTagName("dataSource");
    return dataSources.length > 0 ? dataSources[0] : null;
  }

  getDatasourceString() {
    return new XMLSerializer().serializeToString(this.getDatasource());
  }

  setDatasource(newDatasource) {
    const oldDatasource = this.getDatasource();
    this.doc.documentElement.replaceChild(newDatasource, oldDatasource);
  }

  getFonts() {
    if (!this.doc) return [];
    const fontsNode = this.doc.getElementsByTagName("fonts")[0];
    const fonts = [];
    if (fontsNode) {
      for (let i = 0; i < fontsNode.childNodes.length; i++) {
        const font = fontsNode.childNodes[i];
        if (font.nodeType === 1) { // Element node
          fonts.push({
            resourceType: "Fonts",
            id: font.getAttribute("id"),
            name: font.getAttribute("name"),
            family: font.getAttribute("family"),
            style: font.getAttribute("style")
          });
        }
      }
    }
    return fonts;
  }

  _getFrames(frameType = "any") {
    if (!this.doc) return [];
    const frames = [];
    const pages = this.doc.getElementsByTagName("pages");

    if (pages.length > 0) {
      const pageFrames = pages[0].getElementsByTagName("frames");

      for (let i = 0; i < pageFrames.length; i++) {
        this._processFrame(pageFrames[i], frameType, frames);
      }
    }

    return frames;
  }

  _processFrame(frame, frameType, frames) {
    const items = frame.getElementsByTagName("item");

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const inlineFrames = item.getElementsByTagName("inlineFrames");

      if (inlineFrames.length > 0) {
        const inlineItems = inlineFrames[0].getElementsByTagName("item");

        for (let j = 0; j < inlineItems.length; j++) {
          const inlineFrame = inlineItems[j].getElementsByTagName("frame")[0];

          if (inlineFrame != null) {
            if (frameType === "any" || inlineFrame.getAttribute("type") === frameType) {
              frames.push(inlineFrame);
            }
          }
        }
      }

      if (frameType === "any" || item.getAttribute("type") === frameType) {
        frames.push(item);
      }
    }
  }

  get frames() {
    return this._getFrames();
  }

  getImages() {
    if (!this.doc) return [];
    const images = [];

    this._getFrames("image").forEach(imageFrame => {
      if (imageFrame.getAttribute("hasContent") === "true") {
        if (imageFrame.getAttribute("dynamicAssetProviderID").length > 1) {
          images.push({
            resourceType: "DynamicAssetProviders",
            id: imageFrame.getAttribute("dynamicAssetProviderID")
          });
        } else {
          images.push({
            resourceType: "Assets",
            id: imageFrame.getAttribute("externalID"),
            name: imageFrame.getAttribute("externalName", ""),
            path: imageFrame.getAttribute("path", "")
          });
        }
      }
    });

    return images;
  }

  getBarcodeIds() {
    return this.barcodeFrames().map(b => b.getAttribute("barcodeTypeID"));
  }

  barcodeFrames() {
    return this._getFrames("barcode");
  }

  textFrames() {
    return this._getFrames("text");
  }
}
