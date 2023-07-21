import fs from "fs/promises";
import os from "os";

const buildLog = (await fs.readFile("typescript_build.log"))
    .toString(os.platform() === "win32" ? "utf16le" : "utf8")
    .replaceAll(/\r\n/g, "\n")
    .replace(/(?:^(?!Found).*$\n)+/m, "");
const title = buildLog.match(/^.+$/m)[0];
const body = buildLog
    .match(/(?:^ .+$\n)+/m)[0]
    .replaceAll(/\x1B\[90m:\d+\x1B\[0m/g, "")
    .replaceAll(/(^\s+)/gm, "")
    .split(/\n/m)
    .map((line) => {
        const errorCount = parseInt(line);
        if (Number.isNaN(errorCount)) return undefined;
        const fileName = line.match(/^\d+  (.+)/)[1].replace(/^src\//, "");
        return [fileName, errorCount];
    })
    .sort((lineA, lineB) => lineB[1] - lineA[1])
    .map((fileInfo) => (fileInfo === undefined ? "" : `${fileInfo[0].padEnd(26)}: ${fileInfo[1]}`))
    .join("\n");

const url = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;

await fetch(process.env.WEBHOOK_URL, {
    method: "POST",
    body: JSON.stringify({
        username: "GitHub",
        avatar_url: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
        embeds: [
            {
                color: 0xff0000,
                author: {
                    name: process.env.COMMIT_MESSAGE,
                    url,
                },
                url: "https://tobot.dev/",
                title,
                description: "```" + body + "```",
                timestamp: new Date().toISOString(),
            },
        ],
    }),
    headers: {
        "Content-Type": "application/json",
    },
});
