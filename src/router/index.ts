import { createRouter, createWebHashHistory } from "vue-router";
import MainPage from "@/pages/Main.vue";
import SettingsPage from "@/pages/SettingsPage.vue";

const routes = [
  {
    path: "/",
    redirect: "/text-client",
  },
  {
    path: "/text-client",
    name: "TextClient",
    component: MainPage,
  },
  {
    path: "/settings",
    name: "Settings",
    component: SettingsPage,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
