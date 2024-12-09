<script>
    export default {
        name: "Inp",
        props: {
            type: String,
            modelValue: {
                type: [String, Number],
                default: undefined,
            },
            value: {
                type: [String, Number],
                default: undefined,
            },
        },
        emits: ["update:modelValue", "change", "navigate"],
        computed: {
            modelOrValue: state => (state.value !== undefined ? state.value : state.modelValue),
            translatedType() {
                let types = {
                    decimal: "number",
                };
                return types[this.type] || this.type;
            },
        },

        methods: {
            onChange(val) {
                if (["number", "decimal", "range"].includes(this.type)) {
                    val = parseFloat(val);
                }

                if (val === NaN) {
                    val = null;
                }

                this.$emit("update:modelValue", val);
                this.$emit("change", val);
            },

            onKeyDown(evt) {
                let key = evt.key;

                if (["Enter", "Escape", "ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes(key)) {
                    this.$emit("navigate", evt);
                }
            },

            onTouch() {
                if (this.type == "range") {
                    // range inputs on chrome touch somehow don't work
                    this.onChange(this.$refs.input.value);
                }
            },
        },
    };
</script>

<template>
    <input
        class="inp"
        :type="translatedType"
        @input="onChange($event.target.value)"
        ref="input"
        @touchmove="onTouch"
        :value="modelOrValue"
        @keydown="onKeyDown"
    />
</template>
