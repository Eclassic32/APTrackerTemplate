/**
 * Application entry point.
 *
 * Bootstraps the Vue 3 app with the hash router and global styles.
 * The settings store import triggers initial CSS variable application.
 */
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./styles/global.css";
import "./stores/settings";

const app = createApp(App);
app.use(router);
app.mount("#app");
