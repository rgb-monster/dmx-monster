import utils from "@/scripts/utils.js";
import {defineStore} from "pinia";


let _getLocal = key => {
    return JSON.parse(localStorage.getItem(`dmx-monster-${key}` || "{}"));
};

let _updateLocal = (key, val) => {
    return localStorage.setItem(`dmx-monster-${key}`, JSON.stringify(val));
};

export const useConfig = defineStore("config", {
    state: () => {
        return {
            fixtures: _getLocal("fixtures"),
            rooms: _getLocal("rooms"),
        };
    },

    getters: {
        sortedFixtures: state => utils.sort(Object.values(state.fixtures), fixture => fixture.name),
    },

    actions: {
        updateFixture(fixtureID, changes) {
            // this is fixture channel mappings
            // need a good way to simply identify those
            // e.g. brand + model + number of channels / mode
            // but also some sort of unique slug that doesn't change when config changes so that it doesn't create a
            // mayhem
            this.fixtures[fixtureID] = this.fixtures[fixtureID] || {};
            utils.applyDotChanges(this.fixtures[fixtureID], changes);
            this._updateLocal("fixtures", this.fixtures);
        },

        updateRoom(roomID, changes) {
            // room consists of devices, device groups, scenes and effects
            // devices is what fixture are sitting on which addresses (fixture + address = specific device)
            // then these devices can be grouped to be animated together
            // and then we have presets (scenes, effects) to run those
        },
    },
});
