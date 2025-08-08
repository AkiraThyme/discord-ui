import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/components/Dashboard.vue'),
    },
    {
      path: '/members',
      name: 'members',
      component: () => import('@/components/Members.vue'),
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('@/components/ReportList.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/components/Settings.vue'),
    },
  ],
})

export default router
