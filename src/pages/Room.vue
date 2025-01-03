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

                currentFixture: null, // this will always be clone so that we can do save/cancel
                currentMode: null, // pointer to the mode within currentFixture
            };
        },
        computed: {
            roomID: state => state.$route.params.roomID,
            room: state => state.config.rooms[state.roomID] || {},
            devices: state => state.room?.devices || {},
            fixtures: state => state.config.fixtures,
            sortedFixtures: state => state.config.sortedFixtures,

            usedChannels() {
                let res = utils.defaultDict(Array);
                Object.values(this.devices).forEach(device => {
                    utils
                        .range(device.address, device.address + this.fixtures[device.model].modes[device.mode].channels)
                        .forEach(channel => {
                            res[channel].push(device.id);
                        });
                });
                console.log("Tttttt", res);
                return res;
            },

            models: state => [
                {id: undefined, label: "---"},
                {id: "new", label: "New Model"},
                ...utils
                    .sort(Object.values(state.fixtures), fixture => fixture.name)
                    .map(fixture => ({value: fixture.id, label: fixture.name})),
            ],

            changed: state =>
                state.currentFixture &&
                JSON.stringify(state.currentFixture) !=
                    JSON.stringify(state.config.fixtures[state.currentFixture.id] || {}),

            newFixture: state => state.currentDevice?.model == "new",
        },

        methods: {
            addOrSelect(channel, evt) {
                let deviceIDs = this.usedChannels[channel];
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

                console.log("ffffffffffffF", this.currentDevice);
            },

            selectFixture(fixture) {
                if (this.currentDevice) {
                    this.currentDevice.model = fixture.id;
                }
                if (fixture.id == "new") {
                    let id = utils.randomID([]);
                    this.currentFixture = {
                        id: "new",
                        modes: {
                            [id]: {id, name: "3ch", channels: 3, props: []},
                        },
                    };
                    this.currentMode = this.currentFixture.modes[id];
                } else {
                    this.currentFixture = JSON.parse(JSON.stringify(this.fixtures[fixture.id]));
                }
            },

            selectMode(fixture, mode) {
                this.currentDevice.model = fixture.id;
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

            saveFixture() {
                let fixture = JSON.parse(JSON.stringify(this.currentFixture));
                if (fixture.id == "new") {
                    fixture.id = utils.randomID(this.sortedFixtures.map(fixture => fixture.id));
                }

                this.config.updateFixture(fixture.id, fixture);
                this.currentDevice.model = fixture.id;
                this.currentFixture = null;
            },

            addDevice(fixture, mode) {
                let id = utils.randomID(Object.values(this.devices).map(device => device.id));
                let device = {
                    id,
                    address: this.currentDevice.address,
                    model: fixture.id,
                    mode: mode.id,
                };
                this.config.updateRoom(this.room.id, {[`devices.${id}`]: device});
                this.currentDevice = null;
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
            <template v-else> Edit {{ fixtures[currentDevice.model].name }} </template>
        </template>

        <div class="general-settings">
            <label>Address:</label>
            <Inp type="number" min="1" max="255" v-model="currentDevice.address" style="width: 3em" />

            <template v-if="false && !newFixture">
                <label>Model:</label>
                <FilteredDropdown :src="models" :value="currentDevice.model" @change="selectFixture($event)" />
                <button class="link" v-if="currentDevice.model">Change</button>
            </template>

            <template v-else-if="currentFixture">
                <label>Model Name:</label>
                <Inp type="text" v-model="currentFixture.name" />
            </template>
        </div>

        <div v-if="!currentMode" class="fixtures-list">
            <template v-for="fixture in sortedFixtures">
                <div>{{ fixture.name }}</div>
                <div class="modes pills">
                    <button
                        v-for="mode in sort(Object.values(fixture.modes), mode => normalize(mode.name))"
                        :key="mode.id"
                        @click="addDevice(fixture, mode)"
                    >
                        {{ mode.name }}
                    </button>
                </div>
            </template>
        </div>

        <template v-if="currentMode">
            <FixtureModeEditor :mode="currentMode" @update="updateMode($event)" @send="sendFixtureDMX($event)" />
        </template>

        <template #buttons>
            <Btn class="action" @click="selectFixture({id: 'new'})" v-if="!currentDevice.model">
                Add New Model
            </Btn>
            <div class="spacer" />
            <Btn class="cancel" @click="currentDevice = null">Close</Btn>
            <Btn class="action" v-if="currentDevice.model" @click="saveFixture" :disabled="!changed">
                Save&hellip;
            </Btn>
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
                                !isEmpty(usedChannels[channel]) &&
                                usedChannels[channel].join('-') == usedChannels[channel - 1]?.join('-'),
                            'same-next':
                                !isEmpty(usedChannels[channel]) &&
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

        .fixtures-list {
            display: grid;
            grid-template-columns: 1fr auto;
            padding-top: 2em;
            align-items: center;

            & > * {
                padding: 10px 0;
                border-bottom: 1px solid var(--border);
                height: 100%;
                display: flex;
                align-items: center;
            }

            .pills button:hover {
                transition: background 300ms ease, color 300ms ease;
                background: var(--control);
                color: var(--light);
            }
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
                        --color: var(--constructive);
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

                &.same-prev .inner {
                    box-shadow: -1px 0 0px 0px var(--color);
                }

                &.same-next .inner {
                    box-shadow: 1px 0 0px 0px var(--color);
                }

                &.same-prev.same-next .inner {
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
