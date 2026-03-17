import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./styles/global.css";

// Initialize settings (triggers CSS variable application)
import "./stores/settings";

const app = createApp(App);
app.use(router);
app.mount("#app");
