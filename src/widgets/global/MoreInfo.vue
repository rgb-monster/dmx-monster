<script>
    export default {
        name: "MoreInfo",
        emits: ["open", "close", "toggle"],
        props: {
            title: String,
            extraClasses: String,
        },

        methods: {
            onToggle(toggled) {
                this.$emit(toggled ? "open" : "close");
                this.$emit("toggle", toggled);
            },
        },
    };
</script>
<template>
    <div class="more-info-dropper" :class="extraClasses">
        {{ title }}
        <Dropdown
            class="plain"
            :menu-class="`more-info-dropper ${extraClasses}`"
            :close-on-click="false"
            @toggle="onToggle"
        >
            <template #toggle>
                <slot name="callout" />
                <Icon name="help" v-if="!$slots.callout" />
            </template>
            <template #menu>
                <slot />
            </template>
        </Dropdown>
    </div>
</template>

<style lang="scss">
    .more-info-dropper:not(.plain) {
        display: inline-flex;
        align-items: center;
        font-size: 0.85em;
        color: var(--label);
        gap: 0.3em;

        .toggle {
            align-self: center;
            justify-self: center;
            color: var(--control);
            text-decoration: underline;
            display: flex;
            align-items: center;

            .icon {
                color: var(--label);
                font-size: 1.3em;
            }
        }

        ul {
            margin: 0;
            padding: 0;
            padding-left: 20px;
        }
    }

    #popups .menu.more-info-dropper {
        width: 20em;
        padding: 20px;
        color: var(--base-text);
        font-size: 1em;

        em {
            font-style: normal;
            font-weight: 600;
            color: var(--label);
        }

        li {
            line-height: 180%;
        }
    }
</style>
