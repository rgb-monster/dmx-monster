import ejs from "ejs";
import fs from "fs";
import {defineConfig, loadEnv} from "vite";
import vue from "@vitejs/plugin-vue";
import viteCompression from "vite-plugin-compression";

const ejsTransformer = () => {
    // embedded javascript transformer is lodashes mini-language we use in index
    function inlineFile(path) {
        // for embedding svgs
        if (!fs.existsSync(path)) {
            return "";
        }

        return fs.readFileSync(path).toString().replace(/\s+/g, " ");
    }

    return {
        name: "html-ejs",
        transformIndexHtml: {
            order: "pre",
            handler(html, ctx) {
                let env;
                if (ctx.server) {
                    env = ctx.server.config.env;
                } else {
                    let mode = "prod";
                    if (process.argv.includes("--mode")) {
                        mode = process.argv[process.argv.indexOf("--mode") + 1];
                    }
                    env = loadEnv(mode, process.cwd());
                }

                // Vite right now doesn't cooperate with `<%`, so use square brackets
                let transformed = ejs.render(html, {inlineFile, env});
                return transformed;
            },
        },
    };
};

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [ejsTransformer(), vue(), viteCompression({algorithm: "brotliCompress", verbose: false})],
    resolve: {
        alias: [{find: "@", replacement: "/src"}],
    },
    css: {
        preprocessorOptions: {
            scss: {
                additionalData: `@use "@/styles/mixins.scss" as mixins;`,
                api: "modern-compiler", // or "modern"
            },
        },
    },
    server: {
        port: 8085,
    },
});
