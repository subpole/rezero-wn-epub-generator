import fs from "node:fs";
import path from "node:path";

export function parseArgs(args = process.argv.slice(2)) {
    if (args.length !== 3) {
        throw new Error(
            "Usage: node create_epub.js <epub_title> <epub_author> <chapter_links_file>"
        );
    }

    const [epubTitle, epubAuthor, linksFile] = args;

    if (!epubTitle.trim()) {
        throw new Error("EPUB title cannot be empty.");
    }

    if (!epubAuthor.trim()) {
        throw new Error("EPUB author cannot be empty.");
    }

    const filePath = path.resolve(linksFile);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Links file not found: ${filePath}`);
    }

    if (!fs.statSync(filePath).isFile()) {
        throw new Error(`Links path is not a file: ${filePath}`);
    }

    const links = fs.readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"));

    if (links.length === 0) {
        throw new Error(
            "The chapter links file contains no URLs."
        );
    }

    return {
        epubTitle,
        epubAuthor,
        linksFile: filePath,
    };
}