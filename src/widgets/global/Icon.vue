<script>
    export default {
        name: "Icon",
        props: {
            name: String,
            filled: [Boolean, String],
        },
        computed: {
            filledBool: state => state.filled == true || state.filled == "true",
        },
    };
</script>

<template>
    <span class="icon material-symbols-outlined" :class="{filled}">{{ name }}</span>
</template>

<style lang="scss">
    .icon {
        box-sizing: content-box;
        font-size: 24px;
        height: 1em;
        width: 1em;
        stroke: none;
        fill: currentColor;

        &.filled {
            font-variation-settings: "FILL" 1;
        }
    }
</style>
