<script>
    export default {
        name: "Link",
        props: {
            route: String,
            params: Object,
            query: Object,
            hash: String,
            path: String,
            keep: Array,
            forceReload: Boolean,
            target: String,
            intercept: {
                type: Boolean,
                default: true,
            },
            replace: Boolean,
        },
        data() {
            return {
                isEmbed: window.location != window.parent.location,
            };
        },
        emits: ["click"],
        computed: {
            newRoute() {
                let routeConfig = {
                    name: this.route || this.$route.name,
                    path: this.path || "",
                    params: {},
                    query: {},
                    hash: this.hash,
                };
                Object.entries(this.query || {}).forEach(([key, val]) => {
                    if (val === null) {
                        delete routeConfig.query[key];
                    } else {
                        routeConfig.query[key] = val;
                    }
                });
                Object.entries(this.params || {}).forEach(([key, val]) => {
                    if (val === null) {
                        delete routeConfig.params[key];
                    } else {
                        routeConfig.params[key] = val;
                    }
                });

                let route;
                try {
                    route = this.$router.resolve(routeConfig);
                } catch (exception) {
                    console.warn(exception.message);
                    route = {href: ""};
                }
                return route;
            },
            href: state => state.newRoute.href,
        },

        methods: {
            jump(event) {
                if (this.forceReload) {
                    return;
                }

                if (
                    !this.intercept ||
                    this.isEmbed ||
                    this.target ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.metaKey ||
                    event.altKey
                ) {
                    // do not intervene with ctrl, shift, etc clicks as those need to open a new window
                    return;
                }

                this.$emit("click", event);
                if (event.defaultPrevented) {
                    // parent intercepted the click
                    return;
                }

                event.preventDefault();
                if (this.href != this.$router.resolve(this.$route).href) {
                    // move to the new state if we're not there already
                    if (this.replace) {
                        // the router.push docs are rather lacking and i can't figure out what the name
                        // of the war should be to use single func; this is just me ranting
                        this.$router.replace(this.href);
                    } else {
                        this.$router.push(this.href);
                    }
                }
            },
        },
    };
</script>

<template>
    <a :href="href" @click="jump" :target="isEmbed ? '_blank' : target">
        <slot />
    </a>
</template>
