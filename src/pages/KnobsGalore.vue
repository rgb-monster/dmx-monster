<script>
    import {DMX} from "dmx-web-api";
    import utils from "@/scripts/utils.js";

    export default {
        name: "DMX",
        components: {},
        data() {
            return {
                accessible: false,
                connector: null,
                backendClass: DMX.backends.filter(backend => backend.type == "buffered")[0],
                backends: DMX.backends,
                channels: Object.fromEntries(utils.range(1, 513).map(i => [i, 0])),
                maxChannels: 32,
                selectedSliders: [],
                lastSelected: null,

                showModal: "",

                newRoom: null,
            };
        },
        computed: {},

        watch: {
            "newRoom.name": {
                handler(val) {
                    if (this.newRoom) {
                        this.newRoom.slug = utils.slug(val);
                    }
                },
            },
        },

        methods: {
            async connect(requestAccess) {
                let connector = new DMX();

                try {
                    this.accessible = await connector.connect(null, this.backendClass, requestAccess);
                    this.connector = connector;
                } catch (error) {
                    // just log to console and avoid sending to sentry
                    console.error(error);
                }
            },

            checkCtrl(event) {
                if (!event.ctrlKey) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.connect(true);
                }
            },

            changeBackend(backend) {
                this.backend = backend;
                this.connect(true);
            },

            updateChannel(channel, val) {
                if (isNaN(parseInt(val))) {
                    return;
                }

                let allChannels = [channel];
                if (this.selectedSliders.includes(channel)) {
                    allChannels = [...this.selectedSliders, channel];
                }

                allChannels.forEach(ch => {
                    let chVal = val;
                    this.channels[ch] = chVal;
                    this.connector.update({[ch]: chVal});
                });
            },

            selectSlider(idx, evt) {
                if (evt.ctrlKey) {
                    if (!this.selectedSliders.includes(idx)) {
                        this.selectedSliders.push(idx);
                    }
                } else if (evt.shiftKey) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    this.selectedSliders = utils.range(this.lastSelected, idx > this.lastSelected ? idx + 1 : idx - 1);
                } else {
                    this.selectedSliders = [idx];
                    this.lastSelected = idx;
                }
            },

            handleKeyboard(evt) {
                let key = evt.key.length == 1 ? evt.key.toLowerCase() : evt.key;
                let actions = {
                    Escape: () => (this.selectedSliders = []),
                };

                if (actions[key]) {
                    evt.preventDefault();
                    actions[key]();
                }
            },

            addRoom() {
                this.newRoom = null;

            },
        },

        async mounted() {
            this.connect();

            document.addEventListener("keydown", this.handleKeyboard);
        },

        beforeUnmount() {
            document.removeEventListener("keydown", this.handleKeyboard);
        },
    };
</script>

<template>
    <Modal v-if="newRoom" @dismiss="newRoom = null">
        <template #header> Add room </template>
        <main style="max-width: 20em">
            <p>By adding a room you'll be able to describe fixtures and control the lights less insanely</p>

            <div class="same-line">
                <label>Room name:</label>
                <Inp type="text" v-focus v-model="newRoom.name" />
                <label>Short name:</label>
                <Inp type="text" v-focus :value="newRoom.slug" @change="newRoom.slug = slug($event)" />
            </div>
        </main>

        <template #buttons>
            <Btn class="cancel" @click="newRoom = null">Cancel</Btn>
            <Btn class="action" :disabled="newRoom?.length < 3" @click="addRoom">Create</Btn>
        </template>
    </Modal>

    <Modal v-if="showModal == 'about'" @dismiss="showModal = null">
        <template #header> About DMX Monster </template>

        <main class="links" style="max-width: 35em">
            <p>Control your DMX lights straight from the browser!</p>
            <p>
                You'll need a USB-to-DMX controller to do it, like the
                <a
                    href="https://www.enttec.co.uk/product/dmx-usb-interfaces/dmx-usb-pro-professional-1u-usb-to-dmx512-converter/"
                    target="_blank"
                    >enttec dmx usb pro</a
                >
                one (you can buy it on <a href="https://www.thomann.co.uk/" target="_blank">Thomann</a>)
            </p>

            <p>
                This page is fully offline friendly, meaning that if you lose internet, this page will still load
                (provided it has been loaded before, ofc, because magic is bit out of scope).
            </p>

            <p>
                This piece of software has been brought to you by
                <a href="https://rgb.monster/" target="_blank">RGB Monster</a>. We have this thing called
                <a href="https://confirmed.show/about" target="_blank">Confirmed</a> that is awesome for booking gigs,
                and then, in Confirmed, we have Showtime, that you can use to run light scenes and whatnot. It's very
                cool, drop as an email if you're interested!<br /><br />

                RGB Monster team
            </p>
        </main>

        <template #buttons>
            <Btn @click="showModal = null">Close</Btn>
        </template>
    </Modal>

    <div class="dmx-escape-hatch">
        <div class="toolbar">
            <Dropdown class="plain hamburger" menu-class="toggles-menu">
                <template #toggle>
                    <Icon name="menu" />
                </template>
                <template #menu>
                    <button class="menu-item with-icon" @click="showModal = 'about'">
                        <Icon name="info" />
                        About
                    </button>
                </template>
            </Dropdown>

            <div class="button-group" :class="{inactive: !accessible}">
                <button
                    v-for="channels in [32, 64, 128, 256, 512]"
                    :key="channels"
                    :class="{active: channels == maxChannels}"
                    @click="maxChannels = channels"
                >
                    {{ channels }}
                </button>
            </div>
            <div class="spacer" />

            <button class="pill" @click="newRoom = {name: '', slug: ''}">Add Room</button>

            <div class="spacer" />

            <div class="lights-connector-toggle">
                <template v-if="accessible">
                    <button class="lights-button" icon="toggle_on">
                        <Icon name="toggle_on" />
                        <div>DMX connected!</div>
                    </button>
                </template>

                <template v-else>
                    <Dropdown class="plain">
                        <template #toggle>
                            <button class="lights-button not-connected" v-tooltip="'Turn On'" @click="checkCtrl">
                                <Icon name="toggle_off" />
                                <div>Not connected to DMX</div>
                            </button>
                        </template>
                        <template #menu>
                            <button
                                v-for="(backend, idx) in backends"
                                :key="idx"
                                class="menu-item"
                                @click="changeBackend(backend)"
                            >
                                {{ backend.label }}
                            </button>
                        </template>
                    </Dropdown>
                </template>
            </div>
        </div>

        <div class="sliders" :class="{inactive: !accessible}">
            <div class="slider-group" v-for="group in range(1, maxChannels, 8)" :key="group">
                <div
                    class="slider"
                    v-for="i in range(group, group + 8)"
                    :key="i"
                    :class="{selected: selectedSliders.includes(i)}"
                >
                    <Inp type="number" :value="channels[i]" @change="updateChannel(i, $event)" />
                    <Inp
                        type="range"
                        class="vertical"
                        min="0"
                        max="255"
                        :value="channels[i]"
                        @change="updateChannel(i, $event)"
                    />
                    <label @click="selectSlider(i, $event)">{{ i }}</label>
                </div>
            </div>
        </div>

        <div class="footer">
            <div>&copy; <a class="links" href="https://rgb.monster" target="_blank">RGB Monster</a> 2024</div>

            <a href="https://github.com/rgb-monster/dmx-monster" target="_blank" v-tooltip="'Github Repository'">
                <Icon name="code" />
            </a>
        </div>
    </div>
</template>

<style lang="scss">
    .dmx-escape-hatch {
        padding: 1em 2em;
        display: grid;
        grid-template-rows: auto 1fr auto;
        height: 100vh;
        user-select: none;

        .inactive {
            pointer-events: none;
            opacity: 0.3;
        }

        .toolbar {
            display: flex;
            margin-bottom: 1em;

            .hamburger {
                padding-right: 20px;
                margin-left: -20px;

                .toggle {
                    opacity: 0.5;
                    transition: opacity 300ms ease;

                    &:hover {
                        opacity: 1;
                    }
                }
            }

            .lights-connector-toggle {
                display: contents;
                font-weight: 600;

                .lights-button {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    border: 1px solid var(--border-2);
                    padding: 5px 10px;
                    border-radius: 10px;

                    --color: var(--constructive);

                    background: var(--color);
                    color: var(--dark);
                    border: none;

                    .icon {
                        margin-right: 0;
                    }

                    &.not-connected {
                        --color: var(--destructive);
                    }
                }
            }
        }

        .sliders {
            display: flex;
            flex-wrap: wrap;
            align-self: center;
            gap: 2em 0;
            max-width: 1200px;
            margin: 0 auto;
            padding-bottom: 2em;

            .slider-group {
                flex-grow: 1;
                max-width: 50em;
                min-width: 28em;

                display: grid;
                grid-template-columns: repeat(8, auto);
                justify-content: space-around;
                gap: 32px 0;
            }

            .slider {
                display: grid;
                justify-items: center;
                padding-top: 10px;
                background: var(--base-1);
                border-radius: 10px;
                gap: 5px;
                overflow: hidden;
                width: 50px;

                &.selected {
                    background: var(--control-6);

                    label {
                        background: var(--control-5);
                    }
                }

                .inp[type="number"] {
                    width: 40px;
                    padding: 3px;
                    text-align: center;
                    font-family: var(--numerical-font);
                }

                input[type="range"] {
                    height: 10em;
                }

                label {
                    color: var(--label);
                    font-size: 0.85em;
                    cursor: pointer;
                    width: 100%;
                    text-align: center;
                    background: var(--base-2);
                    padding: 5px;
                }
            }
        }

        .footer {
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
            justify-content: center;
            gap: 0.25em;

            text-align: center;
            opacity: 0.4;
            transition: opacity 300ms ease;
            &:hover {
                opacity: 1;
            }

            .icon {
                display: flex;
                text-decoration: none;
            }
        }

        @media (min-width: 1900px) {
            .sliders {
                max-width: 2000px;
            }
        }

        @media (max-width: 980px) {
            .sliders {
                max-width: 600px;
            }
        }
    }
</style>
