<style lang="scss" src="./styles/base.scss"></style>

<script>
    import "@fontsource/dm-sans/latin.css";
    import "@fontsource/lato";
    import {useDMX} from "@/stores/dmx.js";

    import utils from "@/scripts/utils.js";

    function checkPageMeta(route) {
        let meta = route.meta;
        let title;
        if (meta.pageTitle && typeof meta.pageTitle == "string") {
            title = meta.pageTitle;
        } else if (meta.pageTitle) {
            title = meta.pageTitle(route);
        }

        utils.setPageTitle(title);

        if (meta.dark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }

        document.body.style["overflow-y"] = meta.showScroll ? "scroll" : null;
    }

    export default {
        data() {
            return {
                dmx: useDMX(),
            };
        },

        async mounted() {
            setTimeout(() => {
                this.dmx.connect();
            }, 50);

            this.$router.afterEach((to, _from) => {
                checkPageMeta(to);
                document.body.scrollTo(0, 0);
            });

            let wakeLock;
            try {
                wakeLock = await navigator.wakeLock.request("screen");
            } catch (_err) {
                // fail silently
            }
            document.addEventListener("visibilitychange", async () => {
                if (wakeLock && document.visibilityState == "visible") {
                    wakeLock = await navigator.wakeLock.request("screen");
                }
            });
        },

        beforeUnmount() {
            this.dmx.disconnect();
        },
    };
</script>

<template>
    <router-view />
</template>
