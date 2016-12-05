declare let toastr: any;

const Toast_Options = {
    timeout: 5,
    closeButton: true,
    preventDuplicates: true
};

class LyricsView {

    private inputToggle: HTMLElement;
    private inputView: HTMLElement;
    private checkView: HTMLElement;
    private contentView: HTMLDivElement;

    private lyricsProcessor = new LyricsSubstituteProcessor();
    private lyricsLines: Line[];

    constructor(contentView: HTMLDivElement = LyricsView.createDefaultContentView()) {
        this.contentView = contentView;
        this.checkView = findElement("[data-action=validate-result]") as HTMLElement;
        this.checkView.addEventListener('click', () => {
            if (this.checkView.classList.contains("disabled")) {
                return;
            }

            const unmatchedLines: { [id: number]: Word[]; } = this.getUnmatchedLines();

            let unmatchedCount = 0;

            for (const key in unmatchedLines) {
                const unmatchedWordsCount = unmatchedLines[key].reduce((p: number, c: Word) => {
                    c.setInputStateValid(false); // mark word as invalid
                    return p + 1;
                }, 0);

                console.log(sprintf("missing %d word(s) on L#%d", unmatchedWordsCount, key));
                unmatchedCount += unmatchedWordsCount;
            }

            if (unmatchedCount > 0) {
                toastr.error(sprintf("%d unmatched words", unmatchedCount), Toast_Options);
            } else {
                toastr.success("Correct, Well done!", Toast_Options);
            }
        });
    }

    private getUnmatchedLines(): { [id: number]: Word[]; } {
        const unmatchedLines: { [id: number]: Word[]; } = {};

        this.lyricsLines.filter((line, index) => line.substitutionsCount() > 0)
            .forEach((line) => {
                unmatchedLines[line.index] = line.words.filter((w) => {
                    w.setInputStateValid(true);
                    return !w.valid();
                });
            });

        return unmatchedLines;
    }

    /**
     * Tracks view text (pasted) or uses current
     *
     * @param view Any view that has textContent or value field
     */
    public setInputView(view: HTMLElement) {
        this.inputView = view;
        this.inputView.addEventListener("paste", () => {
            let renderFunc = () => this.render();
            renderFunc.bind(this);

            setTimeout(renderFunc, 100);
        });

        this.inputToggle = view.parentElement.querySelector("label[for=" + this.inputView.id + "]") as HTMLElement;
        if (this.inputToggle) {
            this.inputToggle.addEventListener("click", () => {
                let visible = !this.inputView.classList.contains("lyrics__input-invisible");

                this.inputToggle.textContent = !visible ? "lyrics input [x]" : "lyrics input [|>]";
                this.setInputVisibility(!visible);
            });
        }
    }

    private getInputText(): string {
        if (this.inputView == null) return '';

        if (this.inputView instanceof HTMLInputElement || this.inputView instanceof HTMLTextAreaElement) {
            return this.inputView.value;
        } else {
            return this.inputView.textContent;
        }
    }

    private setInputVisibility(visible: boolean) {
        if (visible) {
            this.inputView.classList.remove("lyrics__input-invisible");
        } else {
            this.inputView.classList.add("lyrics__input-invisible");
        }
    }

    /**
     * Change content view parent
     *
     * @param parent Element where to move contentView
     */
    public setParent(parent: HTMLElement) {
        if (parent != this.contentView.parentElement) {
            this.contentView.parentElement.removeChild(this.contentView);
            parent.appendChild(this.contentView);
        }
    }

    private clearContentView() {
        while (this.contentView.lastChild) {
            this.contentView.removeChild(this.contentView.lastChild);
        }
    }

    public render(lyrics: string = this.getInputText()) {
        console.info("rendering text(" + lyrics.length + " length)");
        this.clearContentView();

        this.lyricsLines = this.lyricsProcessor.substituteRandomWords(lyrics);
        this.lyricsLines.map((l) => l.render())
            .forEach((view) => this.contentView.appendChild(view));

        if (this.lyricsLines.length == 0) {
            this.checkView.classList.add("disabled");
        } else {
            this.checkView.classList.remove("disabled");
        }

        this.setInputVisibility(false);
    }

    private static createDefaultContentView() {
        let div = document.createElement("div");
        div.classList.add("lyrics__output-area");
        document.body.appendChild(div);
        return div;
    }
}


let inputView = findElement("#lyricsInput") as HTMLElement;
let lyricsView = new LyricsView();
lyricsView.setInputView(inputView);
lyricsView.setParent(findElement(".lyrics-container") as HTMLDivElement);

inputView.style.height = window.innerHeight + 'px';

window.addEventListener("resize", function () {
    inputView.style.height = window.innerHeight + 'px';
});

DifficultyPreference.setup();