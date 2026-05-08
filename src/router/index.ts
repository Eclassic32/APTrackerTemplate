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
import CellsPage from "@/pages/CellsPage.vue";
import GroupedCellsPage from "@/pages/GroupedCellsPage.vue";
import MapPage from "@/pages/MapPage.vue";
import ProgressBarPage from "@/pages/ProgressBarPage.vue";

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
  {
    path: "/cells",
    name: "Cells",
    component: CellsPage,
  },
  {
    path: "/grouped-cells",
    name: "GroupedCells",
    component: GroupedCellsPage,
  },
  {
    path: "/map",
    name: "Map",
    component: MapPage,
  },
  {
    path: "/progress-bar",
    name: "ProgressBar",
    component: ProgressBarPage,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
