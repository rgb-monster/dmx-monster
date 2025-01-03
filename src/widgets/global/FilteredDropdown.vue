<script>
    import utils from "@/scripts/utils.js";

    export default {
        name: "FilteredDropdown",
        props: {
            value: [Number, String, Object, Array],
            modelValue: [Number, String, Object, Array],
            src: [Array, String, Object, Function],
            placeholder: String,
            disabled: Boolean,
            attach: String,
            onPopulate: Function, // called right after processing values from server - this is where you can change the label
            onRenderToken: Function, // called before displaying token. return {label: , class: }
            menuClass: [String, Array],
            add: Boolean, // for multi-option allow adding new tags
            filterFunc: Function,
            safe: Boolean, // for injecting raw html
        },
        emits: ["change", "update:modelValue"],
        data() {
            return {
                showMenu: false,
                filter: "",
                current: this.value,
                items: [],
                cursor: null,

                selectedToken: null,
            };
        },

        computed: {
            modelOrValue: state => (state.value !== undefined ? state.value : state.modelValue),
            multi: state => state.modelOrValue instanceof Array,
            label() {
                if (this.multi) {
                    return "";
                } else if (this.current && this.current.hasOwnProperty("label")) {
                    return this.current.label;
                } else {
                    // for plain values see if we can find label in options
                    // if all else fails we will return the current value
                    if (this.items.length) {
                        let currentVal = (this.current || {}).hasOwnProperty("value")
                            ? this.current.value
                            : this.current;

                        let idx;
                        let vals = this.items.map(option => option.value);
                        // prefer exact match when possible
                        if (vals.includes(currentVal)) {
                            idx = vals.indexOf(currentVal);
                        } else {
                            idx = vals.map(val => (val || "").toString()).indexOf((currentVal || "").toString());
                        }

                        if (idx != -1) {
                            return "" + this.items[idx].label;
                        }
                    }
                    return this.current;
                }
            },
            options() {
                let res = this.items.map(result => {
                    return {
                        label: result.label !== undefined ? result.label : result,
                        value: result.value !== undefined ? result.value : result,
                        class: result.class || "",
                    };
                });

                if (this.filter && !this.filterFunc) {
                    /* filter down to matches. does word start match if not simpleMatch. that is all
                     * query words have to be found in the beginning of
                     * any content words. this is so that "kin" wouldn't
                     * return "pants wilderkin" but "wild" would
                     */

                    let filterWords = this.filter.toLowerCase().split(/\W/g);

                    res = res.filter(rec => {
                        let labelWords = rec.label.toLowerCase().split(/\W/g);

                        // each filter word has to represented in the label
                        let filtersFound = filterWords.filter(filterWord => {
                            let matches = labelWords.filter(word => word.indexOf(filterWord) == 0);
                            return matches.length > 0;
                        });

                        return filtersFound.length == filterWords.length;
                    });
                } else if (this.filter && this.filterFunc) {
                    res = this.filterFunc(this.filter, res);
                }

                if (this.filter && this.add && !res.map(rec => rec.label).includes(this.filter)) {
                    res.push({label: `Add '${this.filter}'`, value: this.filter});
                }

                if (this.onPopulate) {
                    res = this.onPopulate(res);
                }

                if (this.multi) {
                    // filter out items we've already selected
                    res = res.filter(rec => !this.modelOrValue.includes(rec.value));
                }

                return res;
            },
        },

        methods: {
            toggle(show) {
                this.showMenu = show !== undefined ? show : !this.showMenu;

                if (!this.showMenu) {
                    // reset cursor on hide
                    this.cursor = 0;
                    this.filter = "";
                } else {
                    this.onShow();
                }
            },

            async onShow() {
                if (!this.multi) {
                    window.setTimeout(() => {
                        this.focus();
                    });
                }

                if (!this.multi) {
                    let currentVal = ((this.current || {}).value || this.current || "").toString();
                    this.cursor = this.options.map(option => (option.value || "").toString()).indexOf(currentVal);
                    window.setTimeout(() => {
                        this.focus();
                    });
                } else {
                    this.cursor = 0;
                }

                await this.$nextTick();
                this.scrollIn();
            },

            focus() {
                if (utils.hasMouse()) {
                    this.$refs.filterSingle.focus();
                }
            },

            scrollIn() {
                let item = this.$refs.options.children[this.cursor];
                if (item) {
                    utils.scrollIn(item, 0.5);
                }
            },

            removeToken(idx) {
                let res = [...this.modelOrValue];
                res.splice(idx, 1);
                this.notify(res);
            },

            notify(value) {
                this.$emit("change", value);
                this.$emit("update:modelValue", value);
            },

            async onFilterKeyDown(event) {
                if (this.multi && !this.filter.length) {
                    // we are messing with value - clone it before w
                    let value = JSON.parse(JSON.stringify(this.modelOrValue));

                    // allow navigation within tokens if we don't have anything typed up
                    // the behaviour has been 1:1 copied over from how gmail compose works as this way
                    // we can trust that the interaction has been tested elsewhere
                    let positionModifiers = {
                        ArrowLeft: -1,
                        ArrowRight: 1,
                        Home: -1000,
                        End: +1000,
                    };
                    if (positionModifiers[event.key]) {
                        this.toggle(false);
                        let buttons = this.$refs.multiInputContainer.querySelectorAll("button");
                        let selectedToken = this.selectedToken == null ? this.modelOrValue.length : this.selectedToken;
                        selectedToken += positionModifiers[event.key];
                        selectedToken = Math.max(selectedToken, 0);
                        if (selectedToken < value.length) {
                            this.selectedToken = selectedToken;
                            buttons[this.selectedToken].focus();
                            return;
                        } else {
                            this.$refs.multiInput.focus();
                        }
                    } else if (event.key == "Delete" && this.selectedToken !== null) {
                        value.splice(this.selectedToken, 1);
                        await this.$nextTick();

                        this.selectedToken = Math.min(this.selectedToken, value.length - 1);
                        let buttons = this.$refs.multiInputContainer.querySelectorAll("button");
                        if (buttons[this.selectedToken]) {
                            buttons[this.selectedToken].focus();
                        } else {
                            this.$refs.multiInput.focus();
                        }
                        this.notify(value);
                        return;
                    } else if (event.key == "Backspace") {
                        let current = this.selectedToken != null ? this.selectedToken : value.length - 1;
                        current = Math.min(current - 1, value.length - 1);
                        value.splice(Math.max(current + 1, 0), 1);
                        await this.$nextTick();

                        if (this.selectedToken != null) {
                            // focus on the previous token only if we were in the select mode
                            this.selectedToken = current;
                            let buttons = this.$refs.multiInputContainer.querySelectorAll("button");
                            if (buttons[this.selectedToken]) {
                                buttons[this.selectedToken].focus();
                            } else {
                                this.$refs.multiInput.focus();
                            }
                        }

                        this.notify(value);
                        return;
                    }
                } else if (!this.showMenu && !["Escape", "Tab"].includes(event.key)) {
                    // not loading but menu is not visible
                    this.showMenu = true;
                    return;
                }

                let positionModifiers = {
                    ArrowDown: 1,
                    ArrowUp: -1,
                    PageDown: 10,
                    PageUp: -10,
                };

                if (positionModifiers[event.key]) {
                    event.preventDefault();
                    this.cursor = Math.min(
                        Math.max(0, (this.cursor || 0) + positionModifiers[event.key]),
                        this.options.length - 1
                    );

                    // make sure the item is in view
                    let item = this.$refs.options.children[this.cursor];
                    utils.scrollIn(item);
                } else if (event.key == "Enter") {
                    event.preventDefault();
                    if (!this.showMenu) {
                        this.toggle(true);
                    } else if (this.options[this.cursor]) {
                        this.onSelect();
                        this.filter = "";
                    }
                } else if (event.key == "Escape" || event.key == "Tab") {
                    this.filter = "";
                    if (this.showMenu) {
                        event.stopPropagation();
                        this.toggle(false);
                    }
                }
            },

            onSelect(selected) {
                selected = selected || this.options[this.cursor];
                if (!selected) {
                    return;
                }

                if (!this.multi) {
                    if (this.modelOrValue !== selected.value) {
                        this.notify(selected.value);
                    }
                    this.toggle();
                } else {
                    let val = selected.value;
                    let res = !this.multi ? val : [...this.modelOrValue, val];
                    this.filter = "";
                    this.notify(res);
                    this.toggle();
                }
            },

            formatToken(token) {
                let match = this.items.filter(item => item.value == token);
                let label = token;
                if (match.length) {
                    label = match[0].label;
                }
                let func = this.onRenderToken || (token => ({class: null, value: token, label: label}));
                return func(token);
            },
        },

        watch: {
            src: {
                immediate: true,
                handler(src) {
                    if (typeof src == "function") {
                        src = src();
                    }
                    this.items = src;
                },
            },
            modelOrValue: {
                immediate: true,
                handler(newVal) {
                    this.current = newVal;
                },
            },
            filter() {
                this.cursor = 0;
            },
        },
    };
</script>

<template>
    <Dropdown
        class="filtered-dropdown"
        @toggle="toggle"
        :show-menu="showMenu"
        :close-on-click="false"
        :disabled="disabled"
        :menu-class="['filtered', menuClass]"
        ref="filtered"
    >
        <template #toggle v-if="!multi">
            <slot name="toggle" />
            <template v-if="!$slots.toggle && !safe">
                {{ label }}
                <span v-if="!label" class="placeholder-text">
                    {{ placeholder || "&nbsp;" }}
                </span>
            </template>

            <span v-if="safe" v-html="label" />
        </template>

        <template #toggle-container v-if="multi">
            <fieldset class="multi-input" ref="multiInputContainer" :disabled="disabled">
                <button
                    v-for="(token, idx) in modelOrValue"
                    :key="token"
                    class="token"
                    :class="[formatToken(token).class, selectedToken == idx ? 'selected' : null]"
                    @keydown="onFilterKeyDown"
                    @click.stop.prevent="removeToken(idx)"
                    tabindex="-1"
                >
                    <span>{{ formatToken(token).label }}</span>
                    <Icon name="clear" />
                </button>

                <div class="token-entry">
                    <input
                        type="text"
                        @click.prevent="toggle(true)"
                        @focus="toggle(true)"
                        @keydown="onFilterKeyDown"
                        ref="multiInput"
                        v-model="filter"
                    />
                </div>
            </fieldset>
        </template>
        <template #menu>
            <div class="filter" v-if="!multi">
                <input
                    type="text"
                    v-model="filter"
                    ref="filterSingle"
                    :placeholder="placeholder || 'Search'"
                    @keydown="onFilterKeyDown"
                />
            </div>
            <div class="options" ref="options">
                <button
                    v-for="(option, idx) in options"
                    tabindex="-1"
                    :key="idx"
                    @click.stop.prevent="onSelect(option)"
                    @mousemove="cursor = idx"
                    :class="[option.class, idx == cursor ? 'current' : '']"
                >
                    <!-- need the span wrap so that we can use css to modify the contents of the button (like in smart tags) -->
                    <span v-if="safe" v-html="option.label" />
                    <span v-else>
                        {{ option.label || "&nbsp;" }}
                    </span>
                </button>
            </div>
            <div v-if="!options.length && (!add || (add && !filter.length))" class="footer">No matches</div>

            <div class="footer" v-if="add && !filter.length">
                <div v-if="add && !filter.length">To add a new item just start typing in a name</div>
            </div>

            <div class="footer" v-if="$slots.extra">
                <slot name="extra"></slot>
            </div>
        </template>
    </Dropdown>
</template>

<style lang="scss">
    .filtered-dropdown {
        display: inline-block;
        position: relative;

        --tokenSpacing: 4px;

        &:not(.plain) > .toggle {
            padding: 0;
        }

        .toggle {
            display: grid;
            grid-template-columns: 1fr auto;
        }

        & > .multi-input {
            color: var(--base-text);
            border: 1px solid var(--border);
            border-radius: 3px;
            background: var(--input-base);
            min-width: 10em;
            padding: calc(var(--tokenSpacing) + 1px) 1px 1px calc(var(--tokenSpacing) + 1px);

            display: flex;
            flex-wrap: wrap;

            &:disabled {
                background: var(--base-1);

                .token .icon {
                    display: none;
                }
            }

            .token {
                cursor: pointer;
                user-select: none;
                margin-bottom: var(--tokenSpacing);
                margin-right: var(--tokenSpacing);
                display: flex;
                align-items: center;

                color: #3b95cc;
                position: relative;
                border-radius: 3px;
                padding: 0 5px;
                padding-right: 2px;

                background: var(--control-bg-x1);
                color: var(--control-1);
                border: 1px solid var(--control-6);

                span {
                    @include mixins.ellipsize;
                    max-width: 10em;
                }

                &:focus {
                    outline: none;
                }

                &:hover {
                    background: var(--control-bg-1);
                }

                .icon {
                    margin-left: 3px;
                    display: flex;
                }

                .icon {
                    font-size: 1em;
                    padding-top: 2px;
                }
            }

            .token-entry {
                flex-grow: 1;
                width: 0;
                min-width: 2em;
                display: flex;
                margin-bottom: var(--tokenSpacing);
                margin-right: var(--tokenSpacing);

                input {
                    flex-grow: 1;
                    padding: 0;
                    border: none;
                    min-width: 2em;
                    padding: 1px;

                    &:focus {
                        outline: none;
                    }
                }
            }
        }

        &:focus-within {
            .multi-input {
                position: relative;
                &:before {
                    content: "";
                    position: absolute;
                    pointer-events: none;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    border: 1px dashed var(--outline);
                    margin: 2px;
                }
            }
        }
    }

    #popups .menu.filtered {
        position: absolute;
        z-index: 1600;
        background: var(--input-base);
        margin-top: 3px;
        box-shadow: 1px 2px 4px var(--shadow);

        &.right {
            right: 0;
        }

        .menu-contents > .options {
            position: relative;
            max-height: calc(min(300px, 80vh - 30px));
            overflow-y: auto;
            user-select: none;
            @include mixins.scrollbar;

            button {
                display: block;
                width: 100%;
                background: none;
                border: none;
                padding: 10px 15px;
                text-align: left;
                @include mixins.ellipsize;

                &:focus {
                    outline: none;
                }

                &.current {
                    background: var(--focus-fill);
                }

                &.nested-1 {
                    padding-left: 2em;
                }
            }
        }

        .menu-contents > .filter {
            padding: 5px;
            input {
                display: block;
                width: 100%;
                padding: 5px;
            }
        }

        .footer {
            padding: 10px;
            font-size: 0.85em;
            background: var(--base-1);
            border-top: 1px solid var(--base-3);
            color: var(--base-text);
        }

        button.footer {
            width: 100%;
            border: none;
        }

        @media (max-width: mixins.$break-mob) {
            .options > button {
                padding: 20px 15px;
            }
        }
    }
</style>
