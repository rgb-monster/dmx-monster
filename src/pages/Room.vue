<script>
    import utils from "@/scripts/utils.js";
    import {useDMX} from "@/stores/dmx.js";
    import {useConfig} from "@/stores/config.js";

    import FixtureModeEditor from "@/widgets/FixtureModeEditor.vue";
    import LightsConnectorToggle from "@/widgets/LightsConnectorToggle.vue";

    export default {
        name: "Room",
        components: {
            FixtureModeEditor,
            LightsConnectorToggle,
        },
        data() {
            return {
                dmx: useDMX(),
                config: useConfig(),
                pickDevice: null,

                currentDevice: null,
                currentFixture: null,
                currentMode: null,
            };
        },
        computed: {
            roomID: state => state.$route.params.roomID,
            room: state => state.config.rooms[state.roomID] || {},
            devices: state => state.room?.devices || {},
            fixtures: state => state.config.sortedFixtures,

            usedChannels() {
                let res = {};
                Object.values(this.devices).forEach(device => {
                    utils
                        .range(device.address, device.address + this.fixtures[device.fixtureID].channels)
                        .forEach(channel => {
                            res[channel] = device.id;
                        });
                });
                return res;
            },

            models: state => [
                {id: undefined, label: "---"},
                {id: "new", label: "New Model"},
                ...utils.sort(Object.values(state.fixtures), rec => rec.label),
            ],
        },

        methods: {
            addOrSelect(channel, evt) {
                let deviceIDs = this.usedChannels[channel] || [];
                if (deviceIDs.length > 1) {
                    // if there is more than one device (edge case), we should check which one they want
                    this.pickDevice = {
                        elem: evt.target,
                        ids: this.usedChannels[channel],
                    };
                } else {
                    this.selectDevice(deviceIDs[0], channel);
                }
            },

            selectDevice(deviceID, channel) {
                this.currentDevice = JSON.parse(
                    JSON.stringify(this.devices[deviceID] || {id: "new", address: channel, channels: 3})
                );
            },

            selectFixture(fixture) {
                if (this.currentDevice) {
                    this.currentDevice.fixtureID = fixture.id;
                }
                if (fixture.id == "new") {
                    this.currentFixture = {
                        id: "new",
                        modes: {
                            default: {id: "default", name: "3ch", channels: 3, props: []},
                        },
                    };
                    this.currentMode = this.currentFixture.modes.default;
                } else {
                    this.currentFixture = JSON.parse(JSON.stringify(this.fixtures[fixture.id]));
                }
            },

            selectMode(mode) {
                this.currentMode = this.currentFixture.modes[mode];
            },

            updateMode({channel, field, val}) {
                if (channel === null) {
                    this.currentMode[field] = val;
                } else {
                    utils.setDefault(this.currentMode.props, channel, {})[field] = val;
                }
            },
            sendFixtureDMX({channel, val}) {
                this.dmx.update({[this.currentDevice.address + channel]: val});
            },
        },

        async mounted() {},

        beforeUnmount() {},
    };
</script>

<template>
    <Modal v-if="currentDevice" class="add-new-device">
        <template #header>
            <template v-if="currentDevice.id == 'new'"> Add Fixture </template>
            <template v-else> Edit {{ fixtures[currentDevice.fixtureID].name }} </template>
        </template>

        <div class="general-settings">
            <label>Address:</label>
            <Inp type="number" min="1" max="255" v-model="currentDevice.address" style="width: 3em" />

            <label>Model:</label>
            <FilteredDropdown :src="models" :value="currentDevice.fixtureID" @change="selectFixture($event)" />
            <button class="link" v-if="currentDevice.fixtureID">Change</button>
        </div>

        <template v-if="currentMode">
            <FixtureModeEditor :mode="currentMode" @update="updateMode($event)" @send="sendFixtureDMX($event)" />
        </template>

        <template #buttons>
            <Btn class="action" @click="selectFixture({id: 'new'})" v-if="!currentDevice.fixtureID">
                Add New Model
            </Btn>
            <div class="spacer" />
            <Btn class="action" v-if="currentDevice.fixtureID">Save</Btn>
            <Btn class="cancel" @click="currentDevice = null">Close</Btn>
        </template>
    </Modal>

    <Popup class="select-device-popup menu" v-if="pickDevice" :elem="pickDevice.elem" @dismiss="pickDevice = null">
        <button v-for="deviceID in pickDevice.ids" :key="deviceID" class="menu-item" @click="selectDevice(deviceID)">
            Device one
        </button>
    </Popup>

    <div class="edit-room">
        <div class="toolbar">
            {{ room.name }}

            <div class="spacer" />
            <LightsConnectorToggle />
        </div>

        <main>
            <label style="display: inline-block; padding-bottom: 0.5em">
                DMX Mapping
                <div class="description">Click on any channel box to add/edit device</div>
            </label>
            <div class="dmx-mapping-box">
                <template v-for="channel in range(1, 513)">
                    <button
                        class="channel-box"
                        v-tooltip="pickDevice ? '' : channel"
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
                    >
                        <div class="inner" />
                    </button>
                </template>
            </div>
        </main>
    </div>
</template>

<style lang="scss">
    .modal.add-new-device {
        .modal-dialog {
            min-width: 30em;
        }

        .general-settings {
            display: grid;
            grid-template-columns: repeat(6, auto);
            align-items: center;
            gap: 0.5em;

            label {
                margin-left: 1.5em;

                &:first-child {
                    margin-left: 0;
                }
            }

            .filtered-dropdown {
                width: 10em;
            }
        }

        .fixture-mode-editor {
            margin-top: 2em;
        }
    }

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

            hr {
                grid-column: 1/-1;
                border: none;
            }

            .channel-box {
                --color: var(--base-2);
                aspect-ratio: 1/1;

                overflow: hidden;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 300ms ease, box-shadow 300ms ease;

                padding: 1px;

                .inner {
                    height: 100%;
                    width: 100%;
                    background: var(--color);
                }

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
