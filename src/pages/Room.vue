<script>
    import {DMX} from "dmx-web-api";
    import utils from "@/scripts/utils.js";
    import {useConfig} from "@/stores/config.js";

    export default {
        name: "Room",
        components: {},
        data() {
            return {
                config: useConfig(),
                clickedElem: null,
            };
        },
        computed: {
            fixtures: state => state.config.sortedFixtures,
            usedChannels() {
                return {
                    7: ["c"],
                    8: ["a"],
                    9: ["a"],
                    10: ["a"],
                    11: ["a", "b"],
                    12: ["a", "b"],
                    13: ["b"],
                    14: ["b"],
                    15: ["b"],
                    64: ["b"],
                    65: ["b"],
                };
            },
        },

        methods: {
            addOrSelect(channel, evt) {
                let deviceIDs = this.usedChannels[channel] || [];
                if (deviceIDs.length == 0) {
                    // if there is no device occupying the channel, we show the 'add device dialog'
                } else if (deviceIDs.length == 1) {
                    // if there is one device occupying the channel, we show the edit device dialog
                } else if (deviceIDs.length > 1) {
                    // if there is more than one device (edge case), we should check which one they want
                    this.clickedElem = evt.target;
                }
            },
        },

        async mounted() {},

        beforeUnmount() {},
    };
</script>

<template>
    <Popup class="select-device-popup menu" v-if="clickedElem" :elem="clickedElem" @dismiss="clickedElem = null">
        <button class="menu-item">Device one</button>
    </Popup>

    <div class="edit-room">
        <div class="toolbar">I'm the toolbar</div>

        <main>
            <label>DMX Mapping</label>
            <div class="dmx-mapping-box">
                <template v-for="channel in range(1, 513)">
                    <button
                        class="channel-box"
                        v-tooltip="clickedElem ? '' : channel"
                        :class="{
                            used: usedChannels[channel]?.length == 1,
                            overlap: usedChannels[channel]?.length > 1,
                            'same-prev':
                                usedChannels[channel] &&
                                usedChannels[channel].join('-') == usedChannels[channel - 1]?.join('-'),
                            'same-next':
                                usedChannels[channel] &&
                                usedChannels[channel].join('-') == usedChannels[channel + 1]?.join('-'),
                        }"
                        @click="addOrSelect(channel, $event)"
                    ></button>
                </template>
            </div>
        </main>
    </div>
</template>

<style lang="scss">
    .popup.select-device-popup {
        padding: 0;
        width: auto;
    }

    .edit-room {
        padding: 1em 2em;
        display: grid;
        grid-template-rows: auto 1fr;
        height: 100vh;
        user-select: none;

        .dmx-mapping-box {
            display: grid;
            grid-template-columns: repeat(64, auto);
            gap: 2px;

            .channel-box {
                --color: var(--base-2);
                aspect-ratio: 1/1;

                overflow: hidden;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 300ms ease, box-shadow 300ms ease;

                background: var(--color);

                &:hover {
                    --color: var(--base-4);
                }

                &.used {
                    --color: var(--constructive-4);

                    &:hover {
                        --color: var(--constructive-6);
                    }
                }

                &.overlap {
                    // overlap means several devices are using the same channel
                    // might be intentional or might cause issues
                    // generally speaking most cases shouldn't need to use same address
                    // for several devices (if it's the same device it would be defined
                    // just once
                    // but sometimes people might get creative with putting the moving
                    // heads RGB on top of a par can
                    --color: #c09249;

                    &:hover {
                        --color: #846a40;
                    }
                }

                &.same-prev {
                    box-shadow: -1px 0 0px 0px var(--color);
                }

                &.same-next {
                    box-shadow: 1px 0 0px 0px var(--color);
                }

                &.same-prev.same-next {
                    box-shadow: -1px 0 0px 0px var(--color), 1px 0 0px 0px var(--color);
                }
            }
        }

        @media (max-width: 1000px) {
            .dmx-mapping-box {
                grid-template-columns: repeat(32, auto);
            }
        }
    }
</style>
