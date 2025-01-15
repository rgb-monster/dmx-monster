<script>
    import utils from "@/scripts/utils.js";
    import ColorPicker from "@/widgets/ColorPicker.vue";

    export default {
        name: "FixtureModeEditor",
        components: {
            ColorPicker,
        },
        props: {
            mode: Object,
        },
        emits: ["update", "send"],
        data() {
            return {
                colorCodes: {
                    red: "#f74f4f",
                    green: "#26bc26",
                    blue: "#6363f9",
                    white: "#fff",
                },

                propTypes: [
                    {value: null, label: "---"},
                    "dimmer",
                    "red",
                    "green",
                    "blue",
                    "white",
                    "amber",
                    "ultraviolet",
                    "strobe",

                    "zoom",
                    "shutter",

                    "pan coarse",
                    "pan fine",
                    "tilt coarse",
                    "tilt fine",

                    "manual",
                ],

                propIcons: {
                    custom: {icon: "settings"},
                    dimmer: {icon: "flourescent"},
                    focus: {icon: "center_focus_weak"},
                    speed: {icon: "speed", label: "Speed"},
                    zoom: {icon: "zoom_out_map"},
                    rotation: {icon: "text_rotation_angledown", label: "Gobo Rotation"},
                    prism: {icon: "hotel_class"},
                    shutter: {icon: "visibility"},
                    amber: {icon: "wb_twilight"},
                    uv: {icon: "dark_mode", label: "UV"},
                    spot: {icon: "flashlight_on", label: "Spot brightness"},
                    strobe: {icon: "flash_on"},
                    wash_strobe: {icon: "thunderstorm", label: "Wash Strobe"},
                    gobo: {icon: "cruelty_free", label: "Gobo"},
                    wheel: {icon: "attractions", label: "Color Wheel"},

                    pan_coarse: {icon: "360", label: "Pan Coarse"},
                    pan_fine: {icon: "360", label: "Pan Fine"},

                    tilt_coarse: {icon: "u_turn_right", label: "Tilt Coarse"},
                    tilt_fine: {icon: "u_turn_right", label: "Tilt Fine"},
                },
            };
        },
        computed: {
            renderedProps() {
                // runs through all props and prefers repeats over anything set in place
                let props = JSON.parse(JSON.stringify(this.mode.props));
                for (let channel of utils.range(this.mode.channels)) {
                    utils.setDefault(props, channel, {
                        val: 0,
                        type: null,
                        label: "",
                    });
                }

                // reset any repetition/repeated flags
                props = props.map(prop => ({
                    ...prop,
                    repetition: null,
                    repeated: false,
                    repetition_source: null,
                }));

                props.forEach((prop, idx) => {
                    if (!prop.repeated && prop.repeats > 1) {
                        prop.repetition = 1;
                        for (let i of utils.range(prop.repeats - 1)) {
                            props[idx + (i + 1) * prop.every] = {
                                ...prop,
                                val: 0,
                                repeats: false,
                                repeated: true,
                                repetition: i + 2,
                                repetition_source: idx,
                            };
                        }
                    }
                });

                for (let i = 0; i < props.length; i++) {
                    if (!props[i]) {
                        props[i] = {};
                    }
                }

                return props;
            },

            propGroups() {
                return [
                    {
                        name: "basic",
                        propTypes: ["custom", "dimmer", "strobe", "red", "green", "blue", "white", "amber", "uv"],
                    },
                    {
                        name: "Light FX",
                        propTypes: ["focus", "zoom", "shutter"],
                    },
                    {
                        name: "Moving Heads",
                        propTypes: ["wheel", "gobo", "rotation", "prism"],
                    },
                    {
                        name: "Pan & Tilt",
                        propTypes: ["speed", "pan_coarse", "pan_fine", "tilt_coarse", "tilt_fine"],
                    },
                ];
            },
        },

        methods: {
            updateProp(channel, field, val) {
                this.$emit("update", {channel, field, val});
            },

            sendDMX(channel, val) {
                this.updateProp(channel, "val", val);
                this.$emit("send", {channel, val});
            },

            changePropType(channel, propType) {
                let prevType = this.renderedProps[channel]?.type;

                if (["gobo", "wheel", "custom"].includes(prevType)) {
                    // reset any previous modes if we are coming from wheel/gobo
                    this.updateProp(channel, "modes", null);
                }

                if (propType == "gobo") {
                    this.updateProp(channel, "modes", [{ch_val: 0, val: "Off"}]);
                } else if (propType == "wheel") {
                    this.updateProp(channel, "modes", [{ch_val: 0, val: "#ffffff"}]);
                } else if (propType == "custom") {
                    this.updateProp(channel, "modes", [{ch_val: 0, val: "Custom", custom: "range"}]);
                }

                this.updateProp(channel, "type", propType);
            },

            toggleRepeats(idx) {
                if (this.mode.props[idx]?.repeats) {
                    this.updateProp(idx, "repeats", 0);
                } else {
                    this.updateProp(idx, "repeats", 2);
                    this.updateProp(idx, "every", 3);
                }
            },

            updateMode(prop, idx, field, val) {
                let channel = this.renderedProps.indexOf(prop);
                prop.modes[idx][field] = val;
                this.updateProp(channel, "modes", prop.modes);
            },

            addMode(prop, idx) {
                let channel = this.renderedProps.indexOf(prop);
                let mode;

                // compute distance between previous two modes as often they are assigned regular intervals
                // e.g. the tens, 16s and so on
                let prevCh = prop.modes[idx]?.ch_val || 0;
                let distance = prevCh - (prop.modes[idx - 1]?.ch_val || 0);

                if (prop.type == "wheel") {
                    mode = {ch_val: prevCh + distance, val: "#ffffff"};
                } else if (prop.type == "gobo") {
                    mode = {ch_val: prevCh + distance, val: ""};
                } else {
                    mode = {ch_val: prevCh + distance, val: "", custom: "stop"};
                }

                prop.modes.splice(idx + 1, 0, mode);
                this.updateProp(channel, "modes", prop.modes);
            },

            removeMode(prop, idx) {
                let channel = this.renderedProps.indexOf(prop);
                prop.modes.splice(idx, 1);
                this.updateProp(channel, "modes", prop.modes);
            },

            setModeCustom(prop, idx, custom) {
                let channel = this.renderedProps.indexOf(prop);
                let mode = prop.modes[idx];

                if (custom) {
                    mode.val = prop.type == "wheel" ? "" : mode.val;
                    mode.custom = custom;
                } else {
                    mode.val = prop.type == "wheel" ? "" : mode.val;
                    delete mode.custom;
                }
                this.updateProp(channel, "modes", prop.modes);
            },
        },
    };
</script>

<template>
    <div class="fixture-mode-editor">
        <div class="prop-edit">
            <div class="prop-row header">
                <label>#</label>
                <label class="span-2">Test</label>

                <label>Type</label>
                <label
                    v-tooltip="
                        'DMX value (0-255) for when the device is initiated (e.g. set moving head pan/tilt to point down on load)'
                    "
                >
                    Def
                </label>
                <label v-tooltip="'Default DMX value (0-255) for when the device is activated in UI'">Act</label>
                <label>UI</label>
                <label></label>
            </div>

            <div v-for="(prop, idx) in renderedProps" class="prop-row" :class="prop.type">
                <label>{{ idx + 1 }}</label>
                <Inp type="range" :value="prop.val || 0" @change="sendDMX(idx, $event)" min="0" max="255" />
                <Inp
                    type="number"
                    :value="prop.val || 0"
                    min="0"
                    max="255"
                    @change="sendDMX(idx, $event)"
                    style="width: 3em"
                />

                <Dropdown class="plain prop-type" menu-class="prop-type-menu">
                    <template #toggle>
                        <Icon v-if="propIcons[prop.type]" :name="propIcons[prop.type].icon" />
                        <div
                            class="color-box"
                            v-else-if="colorCodes[prop.type]"
                            :style="{background: colorCodes[prop.type]}"
                        />

                        <div v-if="prop.type != 'custom'" class="link">
                            {{ propIcons[prop.type]?.label || capitalize(prop.type || "Not Set") }}
                            {{ prop.repetition }}
                        </div>
                    </template>
                    <template #menu>
                        <section v-for="section in propGroups" :key="section.name" :class="section.name">
                            <header>{{ capitalize(section.name) }}</header>
                            <main>
                                <button
                                    v-for="propType in section.propTypes"
                                    :key="propType"
                                    @click="changePropType(idx, propType)"
                                    :class="{current: prop.type == propType}"
                                >
                                    <template v-if="colorCodes[propType]">
                                        <div class="color-box" :style="{background: colorCodes[propType]}" />
                                        {{ capitalize(propType) }}
                                    </template>
                                    <template v-else>
                                        <Icon :name="propIcons[propType].icon" />
                                        {{ propIcons[propType].label || capitalize(propType) }}
                                    </template>
                                </button>
                            </main>
                        </section>
                    </template>
                </Dropdown>

                <div v-if="prop.type == 'custom'">
                    <Inp
                        type="text"
                        class="prop-label-input"
                        :value="prop.label"
                        @change="updateProp(idx, 'label', $event)"
                        placeholder="Label"
                        size="15"
                    />
                </div>

                <div v-if="['pan_coarse', 'tilt_coarse'].includes(prop.type)">
                    Max degrees:
                    <Inp
                        type="number"
                        :value="prop.degrees"
                        @change="updateProp(idx, 'degrees', parseInt($event))"
                        style="width: 4em"
                    />
                </div>

                <div v-if="['wheel', 'gobo', 'custom'].includes(prop.type)" class="stops-list">
                    <div v-for="(mode, idx) in prop.modes" class="prop-box" :class="{'custom-mode': mode.custom}">
                        <header>Val</header>
                        <header>
                            <template v-if="mode.custom"> Mode Name </template>
                            <template v-else-if="prop.type == 'gobo'"> Gobo Name </template>
                            <template v-else-if="prop.type == 'wheel'"> Color </template>
                        </header>
                        <header v-if="mode.custom">Type</header>

                        <div class="actions">
                            <Dropdown class="plain modes-dropdown" menu-class="modes-dropdown-menu">
                                <template #toggle>
                                    <Icon name="more_vert" />
                                </template>
                                <template #menu>
                                    <button
                                        class="menu-item with-icon"
                                        @click="setModeCustom(prop, idx, 'stop')"
                                        v-if="!mode.custom"
                                    >
                                        <Icon name="add_location" />
                                        Custom stop
                                    </button>

                                    <button
                                        class="menu-item with-icon"
                                        @click="setModeCustom(prop, idx, false)"
                                        v-if="mode.custom && prop.type != 'custom'"
                                    >
                                        <Icon name="tune" />
                                        Switch to {{ prop.type == "gobo" ? "gobo" : "color" }} mode
                                    </button>

                                    <button class="menu-item with-icon destructive" @click="removeMode(prop, idx)">
                                        <Icon name="remove" />
                                        Remove Mode
                                    </button>
                                </template>
                            </Dropdown>

                            <button @click="addMode(prop, idx)" v-tooltip="'Add New Mode'"><Icon name="add" /></button>
                        </div>

                        <Inp
                            type="number"
                            placeholder="val"
                            :value="mode.ch_val"
                            class="ch-val"
                            @change="updateMode(prop, idx, 'ch_val', $event)"
                        />

                        <template v-if="!mode.custom">
                            <ColorPicker
                                v-if="prop.type == 'wheel'"
                                :value="mode.color"
                                @change="updateMode(prop, idx, 'color', $event)"
                            />
                            <Inp
                                type="text"
                                placeholder="Gobo Name"
                                v-if="prop.type == 'gobo'"
                                class="stop-name"
                                :value="mode.val"
                                @change="updateMode(prop, idx, 'val', $event)"
                            />

                            <Inp
                                type="text"
                                placeholder="Stop Name"
                                v-if="prop.type == 'custom'"
                                class="stop-name"
                                :value="mode.val"
                                @change="updateMode(prop, idx, 'val', $event)"
                            />
                        </template>

                        <template v-else class="flexer">
                            <Inp
                                class="custom-mode-name"
                                type="text"
                                placeholder="Mode Name"
                                :value="mode.val"
                                @change="updateMode(prop, idx, 'val', $event)"
                            />

                            <div class="button-group">
                                <button
                                    @click="updateMode(prop, idx, 'custom', 'stop')"
                                    :class="{active: mode.custom == 'stop'}"
                                >
                                    Stop
                                </button>
                                <button
                                    @click="updateMode(prop, idx, 'custom', 'range')"
                                    :class="{active: mode.custom == 'range'}"
                                >
                                    Range
                                </button>
                            </div>
                        </template>
                    </div>
                </div>

                <Inp
                    type="number"
                    :value="prop.default_value"
                    min="0"
                    max="255"
                    placeholder="0"
                    @change="updateProp(idx, 'default_value', parseInt($event))"
                    style="width: 3em"
                />

                <Inp
                    type="number"
                    :value="prop.default_active"
                    min="0"
                    max="255"
                    placeholder="0"
                    @change="updateProp(idx, 'default_active', parseInt($event))"
                    style="width: 3em"
                />

                <div class="flexer">
                    <Btn
                        @click="updateProp(idx, 'ui', !prop.ui)"
                        :icon="prop.ui === false ? 'visibility_off' : 'visibility'"
                        v-tooltip="prop.ui === false ? 'Hidden from UI' : 'Visible in UI'"
                    />
                </div>

                <Dropdown class="plain" menu-class="prop-settings-menu">
                    <template #toggle>
                        <Icon name="more_horiz" />
                    </template>
                    <template #menu>
                        <section style="display: grid">
                            <template v-if="!prop.repeated">
                                <div style="margin-left: 1em; padding-top: 5px">
                                    <div class="same-line">
                                        <label>Repeat times:</label>
                                        <Inp
                                            class="spin"
                                            type="number"
                                            min="1"
                                            :value="prop.repeats"
                                            @change="updateProp(idx, 'repeats', $event || 1)"
                                        />

                                        <label>Every n-th:</label>
                                        <Inp
                                            class="spin"
                                            type="number"
                                            min="1"
                                            :value="prop.every"
                                            @change="updateProp(idx, 'every', $event || 1)"
                                        />
                                    </div>
                                </div>
                            </template>
                            <template v-else>
                                Prop is repeated from channel #{{ prop.repetition_source + 1 }}
                            </template>
                        </section>
                    </template>
                </Dropdown>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
    #popups .prop-settings-menu {
        padding: 20px;
        width: 19em;
        header {
            font-weight: 600;
            font-size: 0.85em;
        }

        font-size: 0.85em;

        input[type="number"] {
            width: 4em;
        }
    }

    #popups .prop-type-menu {
        padding: 20px;
        display: grid;
        gap: 1em;
        min-width: 22em;

        .color-box {
            height: 20px;
            width: 20px;
            margin-bottom: 5px;
            border-radius: 50%;
        }

        .current {
            background: var(--control-bg);
            border: 1px solid var(--control);
        }

        section {
            display: grid;
            gap: 5px;
            font-size: 0.85em;
            padding-bottom: 1em;

            &:last-child {
                padding-bottom: 0;
            }

            header {
                font-size: 0.85em;
                font-weight: 600;
                color: var(--label);
            }

            button {
                display: grid;
                justify-items: center;
                padding: 5px;
                border-radius: 3px;

                &:hover {
                    background: var(--base-1);
                }

                &.pill {
                    font-size: 1em;
                }
            }

            main {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                align-items: center;
                font-size: 0.85em;

                hr {
                    flex-grow: 1;
                }
            }
        }
    }

    .fixture-mode-editor {
        .prop-edit {
            padding-bottom: 1em;
        }

        .color-box {
            height: 15px;
            width: 15px;
            border-radius: 50%;
        }

        .prop-type {
            .toggle .label {
                display: flex;
                gap: 5px;
                align-items: center;
            }
        }

        .prop-row {
            display: grid;
            grid-template-columns: 1em 10em 3em minmax(12em, 1fr) 3em 3em 1.5em 1.5em;
            align-items: center;
            gap: 10px;
            padding-top: 10px;
            border-bottom: 1px solid var(--border-x1);
            padding-bottom: 10px;

            &.header {
                position: sticky;
                top: 0;
                background: var(--base);
                padding: 5px 0;
                z-index: 500;
                border-bottom: none;
            }

            &.wheel,
            &.gobo,
            &.custom {
                .stops-list {
                    font-size: 0.85em;
                    grid-row: 2;
                    grid-column: 2/-1;
                    gap: 5px 5px;
                    margin-bottom: 5px;

                    display: flex;
                    flex-wrap: wrap;
                    max-width: 55em;

                    .color-picker-dropdown {
                        padding-left: 5px;

                        .color-box {
                            border: 1px solid var(--border);
                            width: 20px;
                            height: 20px;
                        }
                    }

                    .prop-box {
                        display: grid;
                        align-items: center;
                        align-content: start;
                        gap: 0 5px;

                        background: var(--base-1);
                        border-radius: 5px;
                        padding: 10px;

                        flex: 1 0 auto;

                        .actions {
                            grid-row: 1/3;
                            grid-column: 3;
                            display: grid;

                            .icon {
                                font-size: 20px;
                            }
                        }

                        .ch-val {
                            width: 3em;
                        }

                        .modes-dropdown {
                            display: flex;
                            justify-content: center;

                            .toggle {
                                display: flex;
                                padding: 3px;
                                .icon {
                                    font-size: 19px;
                                }
                            }
                        }
                    }
                }

                &.wheel .stops-list .prop-box {
                    grid-template-columns: 3em 1fr auto;
                    max-width: 11em;

                    .actions {
                        grid-template-rows: 1fr 1fr;
                    }
                }

                &.gobo .stops-list .prop-box,
                &.custom .stops-list .prop-box {
                    max-width: 20em;
                    grid-template-columns: 3em 1fr auto;

                    .actions {
                        grid-row: 1;
                        display: flex;
                        align-items: center;
                        flex-direction: row-reverse;
                    }

                    .stop-name {
                        grid-column: 2/4;
                    }
                }

                &.wheel .stops-list .prop-box.custom-mode,
                &.gobo .stops-list .prop-box.custom-mode,
                &.custom .stops-list .prop-box.custom-mode {
                    max-width: 22.5em;
                    grid-template-columns: 3em 1fr auto auto;
                    gap: 0 10px;

                    .actions {
                        grid-row: 1;
                        grid-column: 4;
                        display: flex;
                        flex-direction: row-reverse;
                    }

                    input {
                        width: 100%;
                    }

                    .button-group {
                        justify-self: start;
                        background: var(--base-4);
                        grid-column: span 2;
                        button {
                            width: 4em;
                            justify-content: center;
                        }
                    }
                }
            }

            &.custom {
                grid-template-columns: 1em 10em auto auto 1fr 3em 3em 1.5em 1.5em;
            }

            &.pan_coarse,
            &.tilt_coarse {
                grid-template-columns: 1em 10em auto 1fr auto 3em 3em 1.5em 1.5em;
                .prop-label-input {
                    width: 10em;
                }
            }
        }

        .prop-pick {
            display: flex;
            gap: 15px;
            align-items: center;
        }
    }
</style>
