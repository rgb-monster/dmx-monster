export default {
    name: "focus",
    mounted(el) {
        let hasMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        if (hasMouse) {
            el.focus();
        }
    },
};
