<script>
    import utils from "@/scripts/utils.js";

    export default {
        name: "Popup",
        emits: ["dismiss"],
        props: {
            elem: Object,
            class: String,
            adjustX: {
                type: Number,
                default: 0,
            },
            adjustY: {
                type: Number,
                default: 0,
            },
        },
        data() {
            return {
                resizeObserver: null,
                top: 0,
                left: 0,
                anchorY: 0,
                running: null,
            };
        },
        computed: {
            rawElem: state => state.elem?.$el || state.elem,
            popup: state => state.$refs.popup,
        },
        watch: {
            anchorY() {
                this.positionPopup();
            },
        },

        methods: {
            positionPopup() {
                if (!this.popup) {
                    return;
                }
                let box = this.popup.getBoundingClientRect();

                if (this.rawElem) {
                    let elemBox = this.rawElem.getBoundingClientRect();
                    this.top = Math.max(Math.min(elemBox.top + this.adjustY, window.innerHeight - box.height - 30), 0);
                    this.left = Math.max(Math.min(elemBox.left + this.adjustX, window.innerWidth - box.width - 30), 0);
                    this.top = Math.round(this.top);
                    this.left = Math.round(this.left);
                } else {
                    // center
                    this.top = Math.round((window.innerHeight - box.height) / 2);
                    this.left = Math.round((window.innerWidth - box.width) / 2);

                    // try to bound the popup
                    this.top = Math.max(Math.min(this.top, window.innerHeight - box.height - 30), 0);
                    this.left = Math.max(Math.min(this.left, window.innerWidth - box.width - 30), 0);
                }
            },

            dismiss() {
                this.$emit("dismiss");
            },

            checkPosition() {
                if (!this.rawElem) {
                    return;
                }

                this.anchorY = this.rawElem.getBoundingClientRect().top;
                if (this.running) {
                    requestAnimationFrame(this.checkPosition);
                }
            },

            handleKeyboard(evt) {
                if (evt.key == "Escape") {
                    evt.preventDefault();
                    this.dismiss();
                }
            },
        },

        mounted() {
            this.positionPopup();
            document.addEventListener("keydown", this.handleKeyboard);
            this.resizeObserver = new ResizeObserver(utils.animationFrame(this.positionPopup));
            this.resizeObserver.observe(this.popup);
            this.resizeObserver.observe(document.body);

            let release = evt => {
                let el = this.popup;
                if (!el || (evt.target != el && !el.contains(evt.target) && !evt.target.closest("#popups"))) {
                    this.dismiss();
                    document.removeEventListener("mousedown", release);
                }
            };
            document.addEventListener("mousedown", release);

            this.running = true;
            this.checkPosition();
        },

        beforeUnmount() {
            document.removeEventListener("keydown", this.handleKeyboard);
            this.resizeObserver.disconnect();
            this.running = false;
        },
    };
</script>

<template>
    <teleport to="#popups">
        <div ref="popup" class="popup" :style="{left: `${left}px`, top: `${top}px`}" :class="class">
            <slot />
        </div>
    </teleport>
</template>

<style lang="scss">
    .popup {
        position: absolute;
        z-index: 300;
        background: var(--base);
        border-radius: var(--corners);
        box-shadow: var(--shadow-high);

        width: 32em;
        max-width: 100vw;

        margin-top: 20px;

        --corners: 20px;
        --padding: 20px;

        padding: var(--padding);
    }
</style>
