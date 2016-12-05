declare let sprintf: any;
declare let CharFunk: any;

function random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

class LineProcessor {

    private factor: number;
    private startedLine: number = -1;

    constructor(factor: number) {
        this.factor = factor;
    }

    static isCommentLine(line: string): boolean {
        return line.toString().trim().startsWith("[")
            && line.toString().trim().endsWith("]");
    }

    /**
     * Check whether line should processed or not
     *
     * @param line Line text
     * @param index Line index in text
     * @return {boolean} true if line should be skipped, otherwise false
     */
    shouldSkipLine(line: string, index: number): boolean {
        if (this.startedLine == -1 && random(0, 1) == 1) {
            this.startedLine = index;
            console.log(sprintf("started from(%d) with line factor = %d", index, this.factor));
            return true;
        }

        return LineProcessor.isCommentLine(line) || (index - this.startedLine) % this.factor != 0;
    }

    /**
     * Generate indices for words that should be substitute in line by random change
     *
     * TODO: add weighted solution to weight each substituted word
     *
     * @param line Line text
     * @param lineIndex Line index
     * @param wordsCount Words length
     * @return array of indexes of words that should be substitute
     */
    substituteWords(line: Line, lineIndex: number, wordsCount: number): number {
        if (this.shouldSkipLine(line.toString(), lineIndex)) {
            return 0;
        }

        let substituteLength = random(1, 2);
        let substituteCount = 0;
        while (substituteCount != substituteLength) {
            let id = random(0, wordsCount - 1);
            let w = line.words[id];
            if (!w.isInputField()) {
                w.substitute();
                substituteCount++;
            }
        }
        return substituteCount;
    }
}

class LyricsSubstituteProcessor {

    private lineProcessor = new LineProcessor(1);

    constructor() {

    }

    /**
     * @param lyricsText Factor to skip every lines
     * @returns {Array<String>}
     */
    public substituteRandomWords(lyricsText: string): Line[] {
        let lines = lyricsText.split(/\r?\n/);
        // skip single word line or empty lines
        if (lines.length == 0) {
            return [];
        }

        // Take all words split by whitespace
        return lines.map((lineString, lineIndex) => {
            if (LineProcessor.isCommentLine(lineString)) {
                return new Line(lineString, lineIndex, true);
            }

            let wordsString = lineString.split(' ').filter(w => w.trim().length > 2);
            if (wordsString.length <= 2) {
                return new Line(lineString, lineIndex);
            }

            let line = new Line(lineString, lineIndex);

            this.lineProcessor.substituteWords(line, lineIndex, wordsString.length);
            return line;
        });
    }

    private static substituteWith(word: string, char: string): string {
        return new Array(word.length).fill(char).join("");
    }
}

class Line {
    // line index
    private _index: number;
    // words that contains this line
    private _words: Word[];
    private commentsLine: boolean;

    constructor(words: Word[] | string, index: number = -1, commentsLine: boolean = false) {
        if (typeof words === "string") {
            words = words.length == 0 ? [] : words.split(" ").map((s) => Word.from(s));
        }

        this._words = words;
        this._index = index;
        this.commentsLine = commentsLine;
    }

    private static createBreakLine(): HTMLElement {
        let lineView: HTMLDivElement = document.createElement("div");
        lineView.classList.add("lyrics__line-break");
        return lineView;
    }

    public substitutionsCount() {
        return this._words.filter((w) => w.isInputField()).length;
    }

    public toString(): string {
        return this.words.map((w) => w.toString()).join(" ");
    }

    public render(): HTMLElement {
        if (this._words.length == 0) {
            return Line.createBreakLine();
        }

        let lineView: HTMLDivElement = document.createElement("div");
        lineView.classList.add("lyrics__line");
        if (this.commentsLine) {
            lineView.classList.add("lyrics__line-comment");
        } else if (this._index >= 0) {
            lineView.classList.add("lyrics__line-" + this._index);
        }
        this._words.map((w) => w.render()).forEach((elem) => {
            lineView.appendChild(elem);
        });
        return lineView;
    }

    public get words(): Array<Word> {
        return this._words;
    }

    public get index(): number {
        return this._index;
    }

    public static findLineView(lineIndex: number, parent: HTMLElement = null): HTMLDivElement {
        if (parent == null) parent = document.body;
        return document.querySelector("div.lyrics__line-" + lineIndex) as HTMLDivElement;
    }
}


class Word {
    // word base
    private base: string = '';
    // additional punctuation chars
    private extrasLeft: string = '';
    private extrasRight: string = '';
    // element that renders the word
    private element: HTMLElement;
    // event listeners map
    private eventListeners: Map<string, () => void>;

    constructor(word: string) {
        if (word.trim().length == 0) {
            this.base = word;
            return;
        }

        let consumingWordBase = false;
        for (let i = 0; i < word.length; i++) {
            const hasNext = i + 1 < word.length;
            if (!CharFunk.isLetter(word.charAt(i))) {
                if (!consumingWordBase) {
                    this.extrasLeft += word.charAt(i);
                    continue;
                } else if (!hasNext || !CharFunk.isLetter(word.charAt(i + 1))) {
                    this.extrasRight += word.charAt(i);
                    continue;
                }
            } else {
                consumingWordBase = true;
            }

            this.base += word.charAt(i);
        }

    }

    /**
     * #addEventListener callback for word
     *
     * @param eventName Event name to listen
     * @param callback Callback function
     */
    public addEventListener(eventName: string, callback: () => void): this {
        if (this.eventListeners == null) {
            this.eventListeners = new Map<string, () => void>();
        }
        this.eventListeners.set(eventName, callback);
        return this;
    }

    /**
     * Determines whether word substituted or known for user
     *
     * @returns {boolean} True if Element of word rendered as HtmlElement, not
     * simple text
     */
    public isInputField(): boolean {
        return this.element instanceof HTMLInputElement;
    }

    public valid(): boolean {
        if (!this.isInputField()) return true;

        let input = this.element as HTMLInputElement;
        // check equality ignoring case
        return input.value.toLocaleLowerCase() === this.base.toLocaleLowerCase();
    }

    /**
     * @returns {number} Length of word with punctuational characters
     */
    public length(): number {
        return this.base.length;
    }

    /**
     * Substitute TextView with EditText
     */
    public substitute(): this {
        this.element = document.createElement("input");
        this.element.classList.add("lyrics__word-input");
        return this;
    }

    public render(): HTMLElement {
        if (this.element == null) {
            this.element = document.createElement("span");
            // we adding space in the end
            this.element.textContent = this.toString() + " ";
            this.element.classList.add("lyrics__word-self");
        }

        this.element.classList.add("lyrics__word");

        if (this.eventListeners != null) {
            this.eventListeners.forEach((callback, eventName) =>
                this.element.addEventListener(eventName, callback));
        }
        return this.element;
    }

    public setInputStateValid(valid: boolean) {
        if (!valid) {
            this.element.classList.add("lyrics__word-unmatch");
        } else {
            this.element.classList.remove("lyrics__word-unmatch");
        }
    }

    public toString(): string {
        let finalWord: string = '';
        if (this.extrasLeft != null) {
            finalWord += this.extrasLeft;
        }
        finalWord += this.base;
        if (this.extrasRight != null) {
            finalWord += this.extrasRight;
        }
        return finalWord;
    }

    static from(word: string): Word {
        return new Word(word);
    }
}