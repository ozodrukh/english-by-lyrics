/**
 * Created by Ozodrukh on 12/1/16.
 */
declare let Drop: any;
declare let noUiSlider: any;
declare let $: any;

class DifficultyPreference {

    public static setup(): DifficultyPreference {
        return new DifficultyPreference();
    }

    autoDismissOnMouseLeaveEvent: boolean = false;
    difficultyMenuItem: HTMLElement;
    difficultyWindow: HTMLElement;
    dropMouseOutEventTimeoutId: number = -1;
    dropInstance: any;

    difficultyRangeToggle: HTMLButtonElement;

    constructor() {
        this.setupDifficultyPreferences();
    }

    public setupDifficultyPreferences(): void {
        this.difficultyMenuItem = <HTMLElement>findElement("a[data-action=difficulty-settings]");
        this.difficultyWindow = <HTMLElement>findElement("div[data-action=difficulty-settings-dialog]");

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
            } else {
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
                }, 1000)
            });
        }
    }

    private activateDropdownMenu(): void {
        let defaults = {
            perLine: 2
        };

        this.difficultyRangeToggle = <HTMLButtonElement>
            findElement("div[data-action=difficulty-range] .dropdown-toggle");

        let selectMenuItem = (item: HTMLAnchorElement, index: number) => {
            this.difficultyRangeToggle.value = event.srcElement.textContent;
        };

        let actionItems: NodeListOf<HTMLAnchorElement> = <NodeListOf<HTMLAnchorElement>>
            findElements("div[data-action=difficulty-range] .dropdown-item");

        for (let i = 0; i < actionItems.length; i++) {
            let elem: HTMLAnchorElement = actionItems.item(i);

            elem.addEventListener("click", selectMenuItem.bind(this, elem))
        }
    }
}

function findElement(selector: string): Element {
    return document.querySelector(selector);
}

function findElements(selector: string): NodeListOf<Element> {
    return document.querySelectorAll(selector);
}
