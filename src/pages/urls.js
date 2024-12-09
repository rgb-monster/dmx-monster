let routes = [
    {
        path: "/",
        name: "home",
        component: () => import("./KnobsGalore.vue"),
        meta: {
            pageTitle: "DMX Monster",
            cameFrom: "/",
        },
    },
];

export default routes;
