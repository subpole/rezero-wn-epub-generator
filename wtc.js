const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { generateEpub } = require("./epubGenerator");
const { parseArgs } = require("./argsParser");

// CSS selector for the chapter content. This is used to extract the chapter content from the HTML page.
// Null means the entire HTML page will be used as the chapter content.
const CHAPTER_CONTENT_SELECTOR = "article.post";

// CSS selector for the chapter title. This is used to extract the chapter title from the HTML page. 
// Null means the title will be extracted from the <title> tag of the HTML page.
const TITLE_SELECTOR = null;

// Function to parse the chapter content for every chapter. To exclude or add anything to the chapter content, 
// modify this function. It will be called for every chapter.
const CONTENT_PARSER = chapter => {
    let html = chapter.data;

    const $ = cheerio.load(html, {}, { decodeEntities: false });

    fs.writeFileSync(path.join(__dirname, "/data/arc7_" + chapter.index + ".html"), $.html(), "utf8");

    // Step 1: Find all [number] references in text nodes
    const references = new Set();

    $("*").each((_, element) => {
        $(element).contents().each((_, node) => {
            if (node.type !== "text") return;

            for (const match of node.data.matchAll(/\[(\d+)\]/g)) {
                references.add(match[1]);
            }
        });
    });

    // Step 2: Wrap each [number] reference in an anchor tag
    $("*").each((_, element) => {
        $(element).contents().each((_, node) => {
            if (node.type !== "text") return;

            let updated = node.data;
            let match = node.data.trim().match(/^\[(\d+)\]/);

            if (!node.data.trim().startsWith("[") || (match && match[0] == node.data.trim())) {
                updated = node.data.replace(
                    /\[(\d+)\]/g,
                    (match, number) => {
                        return `<sup>` +
                            `<a 
                                id="back_chapter_${chapter.index}_${number}" 
                                href="#chapter_${chapter.index}_${number}">${match.trim()}
                            </a>
                        </sup>`;
                    }
                );
            } else {
                const match = node.data.trim().match(/^\[(\d+)\]/);

                if (match) {
                    $(element).attr("id", `chapter_${chapter.index}_${match[1]}`);
                    updated = node.data.replace(
                        /\[(\d+)\]/g,
                        (match, number) => {
                            return `<a 
                                    id="chapter_${chapter.index}_${number}" 
                                    href="#back_chapter_${chapter.index}_${number}">${match.replace("[", "[←").trim()}
                                </a>`;
                        }
                    );
                }
            }

            if (updated !== node.data) {
                $(node).replaceWith(updated);
            }
        });
    });

    // Existing ※ parsing logic
    const elements = $("*").toArray();

    for (const element of elements) {
        const current = $(element);

        if (!current.contents().filter((_, node) =>
            node.type === "text" && node.data.includes("※")
        ).length) {
            continue;
        }

        const next = current.next();

        if (!next.length) continue;

        const text = next.text().trim();

        if (
            text.startsWith("Translated") ||
            text.startsWith("ALL RIGHTS BELONG")
        ) {
            continue;
        }

        const nextHtml = $.html(next);
        const index = html.indexOf(nextHtml);

        const precedingHtml = $.html().slice(0, index);
        const precedingContent = cheerio.load(precedingHtml, {}, { decodeEntities: true });
        let precedingImageHtml = precedingContent("img")
            .map((_, img) => {
                const image = precedingContent(img);
                const src = image.attr("src");

                if (src?.includes("pbs.twimg.com")) {
                    const url = new URL(src);
                    url.searchParams.delete("name");
                    image.attr("src", url.toString());
                }

                return precedingContent.html(img);
            })
            .get()
            .join("");

        if (index !== -1) {
            let resultHtml = precedingImageHtml + 
                "<br/>"+
                "<a href='" + chapter.chapterUrl +"'>Chapter Link</a><br />" + 
                "<br/>"+
                $.html().slice(index);
            fs.writeFileSync(path.join(__dirname, "/data/arc7_parsed_" + chapter.index + ".html"), resultHtml, "utf8");
            return resultHtml;
        }
    }

    return $.html();
};

// Function to parse the chapter title for every chapter
const TITLE_PARSER = chapter => {
    return chapter.title.split(",")[1].split("|")[0].trim() ??
        chapter.title.trim();
};

// Array of pages to include before the table of contents 
// Array items have to be in the html-to-epub library format: https://github.com/lesjoursfr/html-to-epub#usage
const PAGES_BEFORE_TOC = epubTitle => {
    return [
            {
                "title": epubTitle,
                "data": `<img src="https://witchculttranslation.com/wp-content/uploads/2024/09/0515-min-768x324.png" alt="Cover Image" />`,
                beforeToc: true,
                excludeFromToc: true
            },
            {
                "data":
                    `<p>Translated by <a href="https://witchculttranslation.com">Witch Cult Translation</a></p>`
                    +`<p><a href="https://ncode.syosetu.com/n2267be/">Original Japanese Web Novel</a></p>`
                ,
                beforeToc: true,
                excludeFromToc: true
            },
    ];
}

// Set a maximum delay of 5 seconds between chapter fetches
const MAX_DELAY_SECONDS = 5;

async function main() {
    const {
        epubTitle,
        epubAuthor,
        linksFile,
    } = parseArgs();

    const htmlToEpubOptions = {
        title: epubTitle,
        author: epubAuthor,
        lang: "en",
        appendChapterTitles: true,
        hideToC: true,
    }

    generateEpub({
        htmlToEpubOptions,
        epubTitle,
        epubAuthor,
        pagesBeforeToc: PAGES_BEFORE_TOC(epubTitle),
        linksFile,
        contentSelector: CHAPTER_CONTENT_SELECTOR,
        titleSelector: TITLE_SELECTOR,
        titleParser: TITLE_PARSER,
        contentParser: CONTENT_PARSER,
        maxDelaySeconds: MAX_DELAY_SECONDS,
    }).catch(error => {
        console.error(`Error: ${error.message}`);
        process.exitCode = 1;
    });
}

main().catch(error => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
});