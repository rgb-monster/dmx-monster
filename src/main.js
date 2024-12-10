import {createApp} from "vue";
import {createRouter, createWebHistory} from "vue-router";
import {createPinia} from "pinia";

import App from "./App.vue";
import utils from "./scripts/utils.js";
import routes from "./pages/urls.js";

window.addEventListener("beforeinstallprompt", e => {
    // Prevent the mini-infobar from appearing on mobile - noisy
    e.preventDefault();
});

// see if i can kill the print statement as i sometimes occassionally do a print instead of a log
window.print = console.log;

const app = createApp(App);

let router = createRouter({
    history: createWebHistory(),
    routes,
});

app.use(router);

const pinia = createPinia();
app.use(pinia);

// global widgets
// nicked from https://vuejs.org/v2/guide/components-registration.html#Automatic-Global-Registration-of-Base-Components
const globalWidgets = utils.importToComp(import.meta.glob("./widgets/global/*.vue", {eager: true}));
for (const name in globalWidgets) {
    app.component(name, globalWidgets[name]);
}

app.mixin({
    // make utils.filters available as global methods so we don't have to spell them out individually
    methods: utils.filters,
});

// discover and register directives
const directives = utils.importToComp(import.meta.glob("./directives/*.js", {eager: true}));
for (const name in directives) {
    app.directive(name, directives[name]);
}

function mountApp() {
    // on an in-page reload on mob, sometimes the cached script loads before the rest of the page; not sure
    // how or why but it's rather brutal; setting a timeout so that dom gets a chance to build
    if (document.getElementById("app")) {
        app.mount("#app");
    } else {
        window.setTimeout(mountApp, 50);
    }
}
mountApp();
