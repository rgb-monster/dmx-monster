<script>
    import utils from "@/scripts/utils.js";
    export default {
        name: "Modal",
        emits: ["dismiss"],
        props: {
            class: String,
            focus: {
                type: Boolean,
                default: true,
            },
        },
        data() {
            return {
                scrollX: 0,
                scrollY: 0,
                resizeObserver: null,
                actualHeight: window.innerHeight,
            };
        },
        computed: {
            modalClass: state => state.class,
        },
        methods: {
            dismiss() {
                this.$emit("dismiss");
            },
            interceptScroll() {
                window.scrollTo(this.scrollX, this.scrollY);
            },
            onDocumentKeyDown(event) {
                if (event.key == "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    this.$emit("dismiss");
                }
            },

            onResize() {
                this.actualHeight = window.visualViewport.height;
            },
        },
        mounted() {
            this.scrollX = window.scrollX;
            this.scrollY = window.scrollY;
            window.addEventListener("scroll", this.interceptScroll);
            window.addEventListener("keydown", this.onDocumentKeyDown, true);
            setTimeout(() => {
                if (this.focus && window.innerWidth > 500) {
                    let focusables = utils.focusables(this.$refs.container);
                    if (focusables.length) {
                        focusables[0].focus();
                    }
                }
            }, 100);

            // safari has a "soft keyboard" that thinks it knows best
            // and we need to get the modal height right then or the input box will be overriden
            window.visualViewport.addEventListener("resize", this.onResize);
        },
        beforeUnmount() {
            window.removeEventListener("scroll", this.interceptScroll);
            window.removeEventListener("keydown", this.onDocumentKeyDown, true);
            window.visualViewport.removeEventListener("resize", this.onResize);
        },
    };
</script>

<template>
    <teleport to="#popups">
        <div :class="['modal', modalClass]">
            <div class="modal-bg" @click="dismiss" />

            <div class="modal-container" v-tab-trap @keydown="onDocumentKeyDown" :style="{height: `${actualHeight}px`}">
                <div class="modal-dialog">
                    <header v-if="$slots.header">
                        <slot name="header" />
                    </header>

                    <main ref="container">
                        <slot />
                    </main>

                    <div class="buttons" v-if="$slots.buttons">
                        <slot name="buttons" />
                    </div>
                </div>
            </div>
        </div>
    </teleport>
</template>

<style lang="scss">
    .modal {
        display: contents; // merely a logical container that houses the backdrop and the modal-container
        --border-radius: 8px;
        --dialog-padding: 20px 30px;

        .modal-bg {
            z-index: 200;
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            right: 0;
            background: var(--dim);
        }

        .modal-container {
            z-index: 200;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            pointer-events: none;
            padding: var(--content-horiz-padding);

            display: flex;
            align-items: center;
            justify-content: center;
        }

        .modal-dialog {
            pointer-events: all;
            background: var(--base);
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-high);
            border: 1px solid var(--base-faint);

            display: flex;
            flex-direction: column;
            max-height: 100%;

            & > header {
                font-weight: 600;
                font-size: 2em;
                padding: var(--dialog-padding);
            }

            & > main {
                padding: var(--dialog-padding);
                padding-top: 0;
                flex-grow: 1;

                overflow-y: auto;
                @include mixins.scrollbar;

                &:focus-visible {
                    outline: none;
                }
            }
        }

        .buttons {
            display: flex;
            justify-content: end;
            align-items: center;
            gap: 5px;

            padding: var(--dialog-padding);

            background: var(--base-1);
            border-top: 2px solid var(--base);
            border-bottom-left-radius: var(--border-radius);
            border-bottom-right-radius: var(--border-radius);

            hr {
                border: none;
                flex-grow: 1;
            }
        }

        @media (max-height: 800px) {
            .modal-dialog {
                --dialog-padding: 10px var(--content-horiz-padding);
                & > header {
                    font-size: 1.5em;
                }
            }
        }

        @media (max-width: mixins.$break-mob) {
            --dialog-padding: 10px var(--content-horiz-padding);
            --border-radius: 0;

            .modal-container {
                padding: 0;
            }

            .modal-dialog {
                height: 100%;
                width: 100%;
            }

            .buttons {
                padding: var(--content-horiz-padding);
            }
        }
    }
</style>
