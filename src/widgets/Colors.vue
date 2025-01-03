<script>
    import chroma from "chroma-js";
    import utils from "@/scripts/utils.js";

    import * as conversions from "@/scripts/colorconversion.js";

    function toHex(h, s, l) {
        let oklab = _okhslToOklab(h / 360, s / 100, l / 100);
        return chroma.oklab(...oklab).hex();
    }

    function toHSL(color) {
        let [h, s, l] = conversions.srgb_to_okhsl(...chroma(color).rgb());
        return [h * 360, s * 100, l * 100];
    }

    function _okhslToOklab(h, s, l) {
        if (l == 1) {
            return [1, 0, 0];
        } else if (l == 0) {
            return [0, 0, 0];
        }
        const srgb = conversions.okhsl_to_srgb(h, s, l);
        const rgb = srgb.map(v => conversions.srgb_transfer_function_inv(v / 255));
        return conversions.linear_srgb_to_oklab(...rgb);
    }

    function getGradients(hue, saturation, lightness) {
        // `linear-gradient(to right, ${stops})`
        return {
            hue: new Array(16).fill(String()).map((_v, i) => {
                return toHex((i / 15) * 360, saturation, lightness);
            }),

            lightness: new Array(16).fill(String()).map((_v, i) => {
                return toHex(hue, saturation || 1, (i / 15) * 100);
            }),

            saturation: new Array(16).fill(String()).map((_v, i) => {
                return toHex(hue, (i / 15) * 100, lightness);
            }),
        };
    }

    let colorPresets = [
        "#FF0000",
        "#FF8000",
        "#FFFF00",
        "#80FF00",
        "#00FF00",
        "#00FF80",
        "#00FFFF",
        "#0080FF",
        "#0000FF",
        "#8000FF",
        "#FF00FF",
        "#FF0080",

        // "#fff", // white
        // "#FEFE33", // yellow
        // "#FCCC1A", // yellow orange
        // "#FFA500", //orange

        // "#FC600A", // red-orange
        // "#FF0000", //red
        // "#FF5161", // neon red
        // "#FF53cd", // neon pink
        // "#9461fd", // neon purple

        // "#00fe9b", // neon green
        // "#00ffff", // cyan
        // "#2dd9fe", // neon blue
    ];

    /*
        {chVal: 0, val: "white"},
        {chVal: 8, val: "orange"},
        {chVal: 16, val: "lime green"},
        {chVal: 24, val: "cyan"},
        {chVal: 32, val: "red"},
        {chVal: 40, val: "green"},
        {chVal: 48, val: "magenta"},
        {chVal: 56, val: "yellow"},
        {chVal: 64, val: "white"},

        Red = Anger, Jealousy, Fear
        Pink = Love, Light and Airy
        Yellow = Poppy, Bright and Happy
        Amber = Awakening, Rootsy and Raw
        Green = Rootsy, Organic, Calming, Earthy
        Aqua = Gentle, Simple, Water
        Blue = Water, Night-time, Calm, Sullen
        White = Open, Raw, Unfiltered
    */

    export default {
        name: "Colors",
        props: {
            color: String,
            mode: {
                type: String,
                default: "hsl",
            },
            monochrome: Boolean,
        },
        emits: ["update", "set-mode"],
        data() {
            // pseudoscientific garbage but who knows, maybe helpful
            // https://www.studiobinder.com/blog/what-is-color-temperature-definition/
            let tempStops = [
                {label: "Embers", color: "#ff0200"},
                {label: "Candle", color: "#ff4300"},
                {label: "Golden Hr", color: "#ff9500"},
                {label: "Flourescent", color: "#ffc500"},
                {label: "Daylight", color: "#fffdf0"},
                {label: "Overcast", color: "#89f3ff"},
            ];
            let tempScale = chroma
                .scale(tempStops.map(mark => mark.color))
                .domain(tempStops.map((_mark, idx) => (idx / (tempStops.length - 1)) * 100))
                .mode("lab");

            return {
                localMode: null,
                colorPresets,
                hueStops: getGradients(0, 100, 63).hue,
                hsl: null,
                currentColor: "#00a894",

                tempStops,
                tempScale,
                tempColors: utils.range(0, 105, 5).map(idx => tempScale(idx).hex()),
                searchMode: utils.range(0, 100.02, 0.2).map(idx => tempScale(idx).hex()),

                temp: 0,
            };
        },
        computed: {
            hslStops: state => getGradients(...state.hsl),
        },

        watch: {
            mode: {
                immediate: true,
                handler(mode) {
                    this.localMode = mode;
                },
            },

            color: {
                immediate: true,
                handler(color) {
                    if (color != this.currentColor) {
                        color = color || this.currentColor;
                        this.currentColor = color;
                        this.hsl = toHSL(color);
                        this.temp = this.searchMode.indexOf(color) / 5;
                    }
                },
            },
        },

        methods: {
            setColor(color) {
                this.$emit("update", color);
            },

            setMode(mode) {
                this.localMode = mode;
                this.$emit("set-mode", mode);
            },

            setHSL(h, s, l) {
                this.hsl = [h, s, l];
                this.currentColor = toHex(h || 0, s || 0, l || 0);
                this.setColor(this.currentColor);
            },

            setTemp(temp) {
                this.temp = temp;
                this.currentColor = this.tempScale(temp).hex();
                this.setColor(this.currentColor);
                this.hsl = toHSL(this.currentColor);
            },
        },
    };
</script>

<template>
    <div class="color-picker">
        <div class="color-mode" v-if="!monochrome">
            <Btn icon="looks" :class="{active: localMode == 'hsl'}" @click.stop="setMode('hsl')" />
            <Btn icon="tungsten" :class="{active: localMode == 'temp'}" @click.stop="setMode('temp')" />
        </div>
        <div class="temp-sliders" v-if="localMode == 'temp'">
            <div class="range hue" :style="{background: `linear-gradient(to right, ${tempColors})`}">
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.2"
                    :value="temp"
                    @input="setTemp($event.target.value)"
                    list="temp_markers"
                />
            </div>

            <datalist id="temp_markers">
                <option v-for="mark in tempStops" :key="mark.color" :value="mark.color">{{ mark.label }}</option>
            </datalist>
        </div>

        <div class="hsl-sliders" :class="{monochrome}" v-if="localMode == 'hsl'">
            <div class="range hue" :style="{background: `linear-gradient(to right, ${hueStops})`}" v-if="!monochrome">
                <input
                    type="range"
                    min="0"
                    max="360"
                    step="0.1"
                    :value="hsl[0]"
                    @input="setHSL($event.target.value, hsl[1], hsl[2])"
                />
            </div>

            <div class="range lightness" :style="{background: `linear-gradient(to right, ${hslStops.lightness})`}">
                <input
                    type="range"
                    :value="hsl[2]"
                    min="0"
                    max="100"
                    step="0.1"
                    @input="setHSL(hsl[0], hsl[1], $event.target.value)"
                />
            </div>

            <div
                class="range saturation"
                :style="{background: `linear-gradient(to right, ${hslStops.saturation})`}"
                v-if="!monochrome"
            >
                <input
                    type="range"
                    :value="hsl[1]"
                    min="0"
                    max="100"
                    step="0.1"
                    @input="setHSL(hsl[0], $event.target.value, hsl[2])"
                />
            </div>
        </div>

        <div class="color-presets" v-if="!monochrome">
            <button :style="{background: color}" v-for="color in colorPresets" :key="color" @click="setColor(color)" />
        </div>
    </div>
</template>

<style lang="scss">
    .color-picker {
        display: flex;
        gap: 10px;

        .color-mode {
            .btn .button-contents {
                margin: -3px;
            }
        }

        .btn {
            &.active,
            &.active:hover {
                background: var(--control);
                color: #fff;
            }
        }

        .hsl-sliders {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            padding: 6px 3px;
            flex-grow: 1;

            .range.hue {
                grid-column: 1/-1;
            }

            &.monochrome {
                grid-template-columns: 1fr;
                align-content: center;
            }
        }

        .temp-sliders {
            display: grid;
            padding: 6px 3px;
            flex-grow: 1;
            align-content: center;
            gap: 5px;

            datalist {
                display: flex;
                justify-content: space-around;
                font-size: 0.7em;
                gap: 0.5em;
            }
        }
        .color-presets {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
            max-width: calc(18px * 5);
            align-self: start;

            button {
                height: 18px;
                width: 18px;
            }
        }

        .range {
            border-radius: 10px;
            --bar-height: 20px;
            height: var(--bar-height);
            display: flex;
            align-items: center;

            input {
                border-radius: 10px;
                width: 100%;
                height: 100%;
                appearance: none;
                background: none;
                user-select: none;
                border: none;
                cursor: pointer;

                &::-webkit-slider-thumb {
                    height: calc(var(--bar-height) - 4px);
                    width: calc(var(--bar-height) - 4px);
                    background: none;
                    border: 1px solid #eee;
                    box-shadow: 0px 0px 0px 1px #333;
                }
            }
        }

        .presets {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            max-width: 15em;
            button {
                height: 25px;
                width: 25px;
                border: 1px solid var(--base-6);
            }
        }
    }
</style>
