# ReZero WN - Witch Cult Translations EPUB generator
Nodejs script that fetches and parses HTML from a list of url and generates en EPUB file. Every url is chapter in EPUB.

# Requirements
- Node.js v22 or later
- npm v10 or later

# Depedencies
Install dependencies with:
```bash
npm i
```

# Usage
```bash
node wtc.js <epub_title> <epub_author> <chapter_links_file>
```
Example:
```bash
node wtc.js "Re:Zero - Arc 7" "Witch Cult Translations" ./data/arc7.txt
```
This will generate an EPUB file reading the urls from the file `./data/arc7.txt`.
The generated epub will be in the `out` folder.

You can use the list of urls in the `data` folder or generate your own.

# Customization
You can create a copy of `wtc.js` and make a scraper for other sites you want.

# Why
I created this script because other compilations of the WN are outdated, if WTC updates an already translated chapter, the compilation will be outdated.


# Contact
If you have any problem with the script you can contact me via Twitter: [@LordPoles](https://x.com/LordPoles)
