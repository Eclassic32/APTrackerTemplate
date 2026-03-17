/**
 * Router configuration — uses hash-based history (URLs like /#/text-client).
 *
 * To add a new page:
 * 1. Create a .vue file in src/pages/
 * 2. Import it here and add a route entry
 * 3. Add a tab entry in NavBar.vue to make it navigable
 */
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
