<script>
    import chroma from "chroma-js";
    import Colors from "./Colors.vue";

    export default {
        name: "ColorPicker",
        components: {
            Colors,
        },
        props: {
            modelValue: {
                type: String,
                default: undefined,
            },
            value: {
                type: String,
                default: undefined,
            },
        },
        data() {
            return {
                showMenu: false,
            };
        },
        computed: {
            modelOrValue: state => (state.value !== undefined ? state.value : state.modelValue),
            parsedColor: state => (chroma.valid(state.modelOrValue) ? state.modelOrValue : "#000"),
        },
        emits: ["update:modelValue", "change"],
        methods: {
            update(val) {
                this.$emit("update:modelValue", val);
                this.$emit("change", val);
            },
            goodColor(val) {
                return chroma.valid(val);
            },
        },
    };
</script>

<template>
    <Dropdown
        class="plain color-picker-dropdown"
        menu-class="color-picker-menu"
        :show-menu="showMenu"
        @toggle="showMenu = $event"
        :close-on-click="false"
    >
        <template #toggle>
            <div class="color-box" :style="{background: modelOrValue}" :class="{active: showMenu}" />
        </template>
        <template #menu>
            <Colors :color="parsedColor" @update="update($event)" />

            <div class="controls">
                <input
                    class="hex-color"
                    type="text"
                    :value="modelOrValue"
                    @input="goodColor($event.target.value) ? update($event.target.value) : null"
                />
                <CopyPrompt :contents="modelOrValue" copied="Copied!">
                    <Btn icon="content_copy" />
                </CopyPrompt>
                <hr />
                <Btn class="outline" @click="showMenu = false">Close</Btn>
            </div>
        </template>
    </Dropdown>
</template>

<style lang="scss">
    .color-picker-dropdown {
        .toggle {
            .color-box {
                width: 30px;
                height: 30px;
                display: flex;

                &.active {
                    outline: 2px solid var(--control);
                }
            }
        }
    }

    #popups > .menu.color-picker-menu {
        display: grid;
        gap: 1em;
        min-width: 30em;
        padding: 10px;
        background: var(--dark-1);
        border: none;

        .color-picker {
            width: 100%;
        }

        .icon {
            color: #fff;
        }

        .btn {
            &.outline {
                background: var(--dark);
                color: var(--dark-text);
            }

            &.btn-icon:hover {
                background: var(--dark-4);
            }
        }

        .controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;

            hr {
                flex-grow: 1;
                border: none;
            }

            .hex-color {
                width: 6em;
                text-align: center;
                user-select: all;
                background: hsl(207, 10%, 18%);
                border: none;
                color: #eee;
                user-select: all;
            }
        }
    }
</style>
