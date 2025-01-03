<script>
    import {useConfig} from "@/stores/config.js";
    import {useDMX} from "@/stores/dmx.js";

    export default {
        name: "LightsConnectorToggle",
        data() {
            return {
                config: useConfig(),
                dmx: useDMX(),
            };
        },
        computed: {
            accessible: state => state.dmx.accessible,
        },

        methods: {
            checkCtrl(event) {
                if (!event.ctrlKey) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.dmx.connect(true);
                }
            },

            changeBackend(backend) {
                this.config.setBackend(backend);
                this.dmx.accessible = false;
                this.dmx.connect(true);
            },
        },
    };
</script>

<template>
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
</template>

<style lang="scss">
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
</style>
