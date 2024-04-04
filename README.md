# Environment Transfer Tool

The environment transfer tool is WIP library that has been used successfully by employees and clients of CHILI publish to transfer hundreds of megabytes of data between environments.

So while this is a WIP, it still has real value. There is still possibilities of errors.

# Usage

Right now, the tool has not been compiled to an executable yet, so to use it you must do the following.

1. Install [Bun](https://bun.sh/docs/installation)
2. Clone or download the repo
3. Install dependencies with `bun install`
4. Edit `index.ts` to prepare your transfer (see below)
5. Run your script by with `bun index.ts`

## Editing `index.ts`

You are going to edit the `url` properties of the `generateConnectorWithKey` methods to the environments you are targeting.

The `src` variable is the source of the files you want to transfer from.
The `dest` variable is the destination of the files you want to transfer to.

```javascript
const src = await generateConnectorWithKey({ url: "https://ft-nostress.chili-publish.online", username: "", password: "" });
const dest = await generateConnectorWithKey({ url: "https://cp-htf-227.chili-publish.online/", username: "", password: "" });
```

Then you will need to add update the `username` and `password` for a user in those environments that have the correct permissions to access and add files.

After that is complete, you can edit the `transferItems`.

So if you wanted to transfer two documents, you would set `resource` to `Documents` and then add the IDs of the documents you want to transfer.

```javascript
await transferItems({
  dest: dest, src: src, resource: "Documents", items: [
    "876e1d04-241b-421b-7c60-a772ec0c3f45",
    "911e1d02-223b-123b-8b50-b442ef1c0e34",
  ]
});
```

If you want to transfer documents and pdf export settings. You can add a second `transferItems` function call.

```javascript
await transferItems({
  dest: dest, src: src, resource: "Documents", items: [
    "876e1d04-241b-421b-7c60-a772ec0c3f45",
    "911e1d02-223b-123b-8b50-b442ef1c0e34",
  ]
});

await transferItems({
  dest: dest, src: src, resource: "PdfExportSettings", items: [
    "0c147681-7074-42ed-b4cc-b4296c7e6c8a",
  ]
});
```

You can add as many `transferItems` calls as you want to transfer different resources.

### Note Documents
Important to note, when you transfer Documents, it will transfer all the assets, fonts, barcodes, datasource settings, and snippets that the document is using.



# Credit
This tool has it's origins in https://github.com/austin-meier/chilitools-public, so thanks to Austin Meier for his work. This first version is very much rewrite of the migration portion of that tool.
