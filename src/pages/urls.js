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
        path: "/:room",
        name: "edit-room",
        component: () => import("./Room.vue"),
        meta: {
            pageTitle: "Edit Room - DMX Monster",
        },
    },
];

export default routes;
