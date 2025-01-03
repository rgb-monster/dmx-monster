import {defineStore} from "pinia";
import {DMX} from "dmx-web-api";
import {useConfig} from "@/stores/config.js";

export const useDMX = defineStore("dmx", {
    state: () => {
        let config = useConfig();

        return {
            config,
            connector: new DMX(),
            backendLabel: config.backendLabel,
            accessible: false,
        };
    },

    getters: {
        backendClass: state => DMX.backends.find(backend => backend.label == state.backendLabel) || DMX.backends[0],
    },

    actions: {
        _onTick(accessible) {
            this.accessible = accessible;
        },

        async connect(requestAccess) {
            try {
                this.accessible = await this.connector.connect(this._onTick, this.backendClass, requestAccess);
            } catch (error) {
                // just log to console and avoid sending to sentry
                console.error(error);
            }
        },

        update(dmx) {
            // sends dmx values to all connectors. expects a {channel: val} dict
            this.connector.update(dmx);
        },

        disconnect() {
            this.connector.close();
        },
    },
});
