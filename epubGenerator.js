const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const Epub = require("epub-gen");
const { EPub } = require("@lesjoursfr/html-to-epub");

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function extractChapter(url, contentSelector, titleSelector) {
    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:156.0) Gecko/20100101 Firefox/156.0"
        },
        signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${url}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = titleSelector
        ? $(titleSelector).first().text().trim()
        : $("title").first().text().trim();

    const data = contentSelector
        ? $(contentSelector).first().html() ?? ""
        : $.html();

    if (!data.trim()) {
        throw new Error(`No content found at ${url}`);
    }

    return {
        title: title || url,
        data
    };
}

async function generateEpub(
        {
            htmlToEpubOptions = {title: "Book", author: "Author"},
            linksFile, 
            contentSelector, 
            titleSelector, 
            contentParser = null, 
            titleParser = null, 
            pagesBeforeToc = null,
            maxDelaySeconds = 5
        }
    ) {
    const filePath = path.resolve(linksFile);

    const links = fs.readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"));

    const chapters = [];

    if (pagesBeforeToc) {
        chapters.push(...pagesBeforeToc);
    }

    for (let i = 0; i < links.length; i++) {
        let waitMs = (Math.floor(Math.random() * maxDelaySeconds) + 1) * 1000;
        console.log(`Waiting for ${waitMs/1000}s before fetching the next chapter...`);
        await wait(waitMs);
        const url = links[i];

        console.log(`[${i + 1}/${links.length}] Fetching ${url}`);

        try {
            let chapter = await extractChapter(
                url,
                contentSelector,
                titleSelector
            );
            chapter.index = i + 1;
            chapter.chapterUrl = url;

            if (contentParser) {
                chapter.data = contentParser(chapter);
            }

            if (titleParser) {
                chapter.title = titleParser(chapter);
            }

            chapters.push(chapter);
            console.log(`  Extracted: ${chapter.title}`);
        } catch (error) {
            console.error(`Failed: ${error.message}`);
        }
    }

    if (chapters.length === 0) {
        throw new Error("No chapters could be extracted. EPUB not generated.");
    }

    const outputName = htmlToEpubOptions.title
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
        .trim() + ".epub";

    const outputPath = path.join(__dirname, "/out/" + outputName);

    const options = {...htmlToEpubOptions, content: chapters,};

    console.log(
        `Generating EPUB with ${chapters.length} chapters...`
    );


const epub = new EPub(options, outputPath);
epub.render()
	.then(() => {
		console.log("Ebook Generated Successfully!");
	})
	.catch((err) => {
		console.error("Failed to generate Ebook because of ", err);
	});

    console.log(`EPUB created: ${outputPath}`);
}


module.exports = { generateEpub };
