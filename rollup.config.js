import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import postcss from "rollup-plugin-postcss";
import livereload from "rollup-plugin-livereload";
const production = !process.env.ROLLUP_WATCH;
import css from "rollup-plugin-css-only";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { spawn } from "child_process";
import sveltePreprocess from "svelte-preprocess";
import typescript from "@rollup/plugin-typescript";
import dotenv from "dotenv";

function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = spawn("npm", ["run", "start", "--", "--dev"], {
        stdio: ["ignore", "inherit", "inherit"],
        shell: true,
      });

      process.on("SIGTERM", toExit);
      process.on("exit", toExit);
    },
  };
}

function getPlugins(cssOutputFile) {
  return [
    svelte({
      include: "src/**/*.svelte",
      preprocess: sveltePreprocess({
        sourceMap: !production,
        replace: [["process.env.APP_VERSION", process.env.APP_VERSION]],
      }),
      compilerOptions: {
        dev: !production,
      },
      emitCss: true,
    }),
    postcss({
      plugins: [tailwindcss, autoprefixer],
      extract: true,
    }),
    css({ output: cssOutputFile }),

    commonjs(),
    typescript({ sourceMap: !production, inlineSources: !production }),
    production && terser(),
    !production && serve(),
    !production && livereload("public"),
    resolve({ browser: true, dedupe: ["svelte"] }),
  ];
}

dotenv.config();

export default [
  {
    input: "src/main.ts",
    output: {
      file: "public/build/bundle.js",
      format: "iife",

      name: "app",
    },
    plugins: getPlugins("bundle.css"),
    watch: {
      clearScreen: false,
    },
  },
  {
    input: "src/popup.ts",
    output: {
      file: "public/build/popup.js",
      format: "iife",

      name: "app",
    },
    plugins: getPlugins("popup.css"),
    watch: {
      clearScreen: false,
    },
  },
  {
    input: "src/services/background.ts",
    output: {
      file: "public/build/background.js",
      format: "iife",

      name: "app",
    },
    plugins: getPlugins("test.css"),
    watch: {
      clearScreen: false,
    },
  },
  {
    input: "src/services/content.ts",
    output: {
      file: "public/build/content.js",
      format: "iife",

      name: "app",
    },
    watch: {
      clearScreen: false,
    },
  },
];
