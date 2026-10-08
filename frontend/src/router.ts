import { createRouter, createWebHistory, createWebHashHistory } from "vue-router";
import { nativePlatform } from "./lib/platform";
import Home from "./pages/Home.vue";
export const router = createRouter({
  history: nativePlatform() ? createWebHashHistory() : createWebHistory(),
  routes: [
    { path: "/", component: Home },
    { path: "/history", component: () => import("./pages/History.vue") },
    {
      path: "/session/:id/:stage?",
      component: () => import("./pages/Session.vue"),
    },
    { path: "/admin", component: () => import("./pages/AdminDashboard.vue") },
    { path: "/segments", component: () => import("./pages/SegmentsView.vue") },
    { path: "/debug", component: () => import("./pages/DebugDB.vue") },
  ],
  scrollBehavior: (to, from, savedPosition) => {
    // Knowledge navigation focuses the reader instead of resetting the whole page.
    if (to.path === from.path && to.query.knowledge !== from.query.knowledge)
      return savedPosition || false;
    return { top: 0 };
  },
});
