function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
class LineProcessor {
    constructor(factor) {
        this.startedLine = -1;
        this.factor = factor;
    }
    static isCommentLine(line) {
        return line.toString().trim().startsWith("[")
            && line.toString().trim().endsWith("]");
    }
    shouldSkipLine(line, index) {
        if (this.startedLine == -1 && random(0, 1) == 1) {
            this.startedLine = index;
            console.log(sprintf("started from(%d) with line factor = %d", index, this.factor));
            return true;
        }
        return LineProcessor.isCommentLine(line) || (index - this.startedLine) % this.factor != 0;
    }
    substituteWords(line, lineIndex, wordsCount) {
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
    constructor() {
        this.lineProcessor = new LineProcessor(1);
    }
    substituteRandomWords(lyricsText) {
        let lines = lyricsText.split(/\r?\n/);
        if (lines.length == 0) {
            return [];
        }
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
    static substituteWith(word, char) {
        return new Array(word.length).fill(char).join("");
    }
}
class Line {
    constructor(words, index = -1, commentsLine = false) {
        if (typeof words === "string") {
            words = words.length == 0 ? [] : words.split(" ").map((s) => Word.from(s));
        }
        this._words = words;
        this._index = index;
        this.commentsLine = commentsLine;
    }
    static createBreakLine() {
        let lineView = document.createElement("div");
        lineView.classList.add("lyrics__line-break");
        return lineView;
    }
    substitutionsCount() {
        return this._words.filter((w) => w.isInputField()).length;
    }
    toString() {
        return this.words.map((w) => w.toString()).join(" ");
    }
    render() {
        if (this._words.length == 0) {
            return Line.createBreakLine();
        }
        let lineView = document.createElement("div");
        lineView.classList.add("lyrics__line");
        if (this.commentsLine) {
            lineView.classList.add("lyrics__line-comment");
        }
        else if (this._index >= 0) {
            lineView.classList.add("lyrics__line-" + this._index);
        }
        this._words.map((w) => w.render()).forEach((elem) => {
            lineView.appendChild(elem);
        });
        return lineView;
    }
    get words() {
        return this._words;
    }
    get index() {
        return this._index;
    }
    static findLineView(lineIndex, parent = null) {
        if (parent == null)
            parent = document.body;
        return document.querySelector("div.lyrics__line-" + lineIndex);
    }
}
class Word {
    constructor(word) {
        this.base = '';
        this.extrasLeft = '';
        this.extrasRight = '';
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
                }
                else if (!hasNext || !CharFunk.isLetter(word.charAt(i + 1))) {
                    this.extrasRight += word.charAt(i);
                    continue;
                }
            }
            else {
                consumingWordBase = true;
            }
            this.base += word.charAt(i);
        }
    }
    addEventListener(eventName, callback) {
        if (this.eventListeners == null) {
            this.eventListeners = new Map();
        }
        this.eventListeners.set(eventName, callback);
        return this;
    }
    isInputField() {
        return this.element instanceof HTMLInputElement;
    }
    valid() {
        if (!this.isInputField())
            return true;
        let input = this.element;
        return input.value.toLocaleLowerCase() === this.base.toLocaleLowerCase();
    }
    length() {
        return this.base.length;
    }
    substitute() {
        this.element = document.createElement("input");
        this.element.classList.add("lyrics__word-input");
        return this;
    }
    render() {
        if (this.element == null) {
            this.element = document.createElement("span");
            this.element.textContent = this.toString() + " ";
            this.element.classList.add("lyrics__word-self");
        }
        this.element.classList.add("lyrics__word");
        if (this.eventListeners != null) {
            this.eventListeners.forEach((callback, eventName) => this.element.addEventListener(eventName, callback));
        }
        return this.element;
    }
    setInputStateValid(valid) {
        if (!valid) {
            this.element.classList.add("lyrics__word-unmatch");
        }
        else {
            this.element.classList.remove("lyrics__word-unmatch");
        }
    }
    toString() {
        let finalWord = '';
        if (this.extrasLeft != null) {
            finalWord += this.extrasLeft;
        }
        finalWord += this.base;
        if (this.extrasRight != null) {
            finalWord += this.extrasRight;
        }
        return finalWord;
    }
    static from(word) {
        return new Word(word);
    }
}
class DifficultyPreference {
    constructor() {
        this.autoDismissOnMouseLeaveEvent = false;
        this.dropMouseOutEventTimeoutId = -1;
        this.setupDifficultyPreferences();
    }
    static setup() {
        return new DifficultyPreference();
    }
    setupDifficultyPreferences() {
        this.difficultyMenuItem = findElement("a[data-action=difficulty-settings]");
        this.difficultyWindow = findElement("div[data-action=difficulty-settings-dialog]");
        this.activateDropdownMenu();
        this.dropInstance = new Drop({
            target: this.difficultyMenuItem,
            content: this.difficultyWindow,
            openOn: "",
            classes: 'drop-dialog-wrapper',
            position: 'top right',
            hoverCloseDelay: 100,
            constrainToScrollParent: true
        });
        this.difficultyMenuItem.addEventListener("click", () => {
            if (this.dropInstance.isOpened()) {
                this.dropInstance.remove();
            }
            else {
                this.dropInstance.open();
            }
        });
        if (this.autoDismissOnMouseLeaveEvent) {
            this.difficultyWindow.addEventListener("mouseleave", () => {
                if (this.dropMouseOutEventTimeoutId != -1) {
                    clearTimeout(this.dropMouseOutEventTimeoutId);
                }
                this.dropMouseOutEventTimeoutId = setTimeout(() => {
                    if (this.dropInstance.isOpened())
                        this.dropInstance.remove();
                }, 1000);
            });
        }
    }
    activateDropdownMenu() {
        let defaults = {
            perLine: 2
        };
        this.difficultyRangeToggle = findElement("div[data-action=difficulty-range] .dropdown-toggle");
        let selectMenuItem = (item, index) => {
            this.difficultyRangeToggle.value = event.srcElement.textContent;
        };
        let actionItems = findElements("div[data-action=difficulty-range] .dropdown-item");
        for (let i = 0; i < actionItems.length; i++) {
            let elem = actionItems.item(i);
            elem.addEventListener("click", selectMenuItem.bind(this, elem));
        }
    }
}
function findElement(selector) {
    return document.querySelector(selector);
}
function findElements(selector) {
    return document.querySelectorAll(selector);
}
const Toast_Options = {
    timeout: 5,
    closeButton: true,
    preventDuplicates: true
};
class LyricsView {
    constructor(contentView = LyricsView.createDefaultContentView()) {
        this.lyricsProcessor = new LyricsSubstituteProcessor();
        this.contentView = contentView;
        this.checkView = findElement("[data-action=validate-result]");
        this.checkView.addEventListener('click', () => {
            if (this.checkView.classList.contains("disabled")) {
                return;
            }
            const unmatchedLines = this.getUnmatchedLines();
            let unmatchedCount = 0;
            for (const key in unmatchedLines) {
                const unmatchedWordsCount = unmatchedLines[key].reduce((p, c) => {
                    c.setInputStateValid(false);
                    return p + 1;
                }, 0);
                console.log(sprintf("missing %d word(s) on L#%d", unmatchedWordsCount, key));
                unmatchedCount += unmatchedWordsCount;
            }
            if (unmatchedCount > 0) {
                toastr.error(sprintf("%d unmatched words", unmatchedCount), Toast_Options);
            }
            else {
                toastr.success("Correct, Well done!", Toast_Options);
            }
        });
    }
    getUnmatchedLines() {
        const unmatchedLines = {};
        this.lyricsLines.filter((line, index) => line.substitutionsCount() > 0)
            .forEach((line) => {
            unmatchedLines[line.index] = line.words.filter((w) => {
                w.setInputStateValid(true);
                return !w.valid();
            });
        });
        return unmatchedLines;
    }
    setInputView(view) {
        this.inputView = view;
        this.inputView.addEventListener("paste", () => {
            let renderFunc = () => this.render();
            renderFunc.bind(this);
            setTimeout(renderFunc, 100);
        });
        this.inputToggle = view.parentElement.querySelector("label[for=" + this.inputView.id + "]");
        if (this.inputToggle) {
            this.inputToggle.addEventListener("click", () => {
                let visible = !this.inputView.classList.contains("lyrics__input-invisible");
                this.inputToggle.textContent = !visible ? "lyrics input [x]" : "lyrics input [|>]";
                this.setInputVisibility(!visible);
            });
        }
    }
    getInputText() {
        if (this.inputView == null)
            return '';
        if (this.inputView instanceof HTMLInputElement || this.inputView instanceof HTMLTextAreaElement) {
            return this.inputView.value;
        }
        else {
            return this.inputView.textContent;
        }
    }
    setInputVisibility(visible) {
        if (visible) {
            this.inputView.classList.remove("lyrics__input-invisible");
        }
        else {
            this.inputView.classList.add("lyrics__input-invisible");
        }
    }
    setParent(parent) {
        if (parent != this.contentView.parentElement) {
            this.contentView.parentElement.removeChild(this.contentView);
            parent.appendChild(this.contentView);
        }
    }
    clearContentView() {
        while (this.contentView.lastChild) {
            this.contentView.removeChild(this.contentView.lastChild);
        }
    }
    render(lyrics = this.getInputText()) {
        console.info("rendering text(" + lyrics.length + " length)");
        this.clearContentView();
        this.lyricsLines = this.lyricsProcessor.substituteRandomWords(lyrics);
        this.lyricsLines.map((l) => l.render())
            .forEach((view) => this.contentView.appendChild(view));
        if (this.lyricsLines.length == 0) {
            this.checkView.classList.add("disabled");
        }
        else {
            this.checkView.classList.remove("disabled");
        }
        this.setInputVisibility(false);
    }
    static createDefaultContentView() {
        let div = document.createElement("div");
        div.classList.add("lyrics__output-area");
        document.body.appendChild(div);
        return div;
    }
}
let inputView = findElement("#lyricsInput");
let lyricsView = new LyricsView();
lyricsView.setInputView(inputView);
lyricsView.setParent(findElement(".lyrics-container"));
inputView.style.height = window.innerHeight + 'px';
window.addEventListener("resize", function () {
    inputView.style.height = window.innerHeight + 'px';
});
DifficultyPreference.setup();
//# sourceMappingURL=main.js.map