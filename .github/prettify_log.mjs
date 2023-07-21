import fs from "fs/promises";

let buildLog = (await fs.readFile("build.log")).toString("utf8").replace(/(?:^(?!Found).*$\n)+/m, "");
const title = buildLog.match(/^.+$/m)[0];
const body = buildLog
    .match(/(?:^ .+$\n)+/m)[0]
    .replaceAll(/\x1B\[90m:\d+\x1B\[0m/g, "")
    .replaceAll(/^\s+/gm, "")
    .split("\n")
    .map((line) => {
        const errorCount = parseInt(line);
        if (Number.isNaN(errorCount)) return "";
        const fileName = line.match(/^\d+  (.+)/)[1].replace("src/", "");
        return `${fileName.padEnd(26)}: ${errorCount}\n`;
    })
    .join("");
const url = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const data = {
    embeds: [
        {
            type: "rich",
            url,
            title,
            body,
        },
    ],
};
await fs.writeFile("build.log", JSON.stringify(data));
