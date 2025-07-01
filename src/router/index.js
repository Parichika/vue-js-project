import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/login.vue'
import Appointment from '@/components/user/UserLayout.vue'
import StaffRequest from '@/components/staff/StaffLayout.vue'
import AdminRequest from '@/components/admin/AdminLayout.vue'

const routes = [
  { path: '/', name: 'Login', component: Login },
  { path: '/user/appointment', name: 'Appointment', component: Appointment },
  { path: '/staff/StaffRequest', name: 'StaffRequest', component: StaffRequest },
  { path: '/admin/AdminRequest', name: 'AdminRequest', component: AdminRequest },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
