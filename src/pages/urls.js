let routes = [
    {
        path: "/",
        name: "home",
        component: () => import("./KnobsGalore.vue"),
        meta: {
            pageTitle: "DMX Monster",
        },
    },

    {
        path: "/:roomID",
        name: "room",
        component: () => import("./Room.vue"),
        meta: {
            pageTitle: "Edit Room - DMX Monster",
        },
    },
];

export default routes;
