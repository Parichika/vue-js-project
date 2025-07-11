import { createRouter, createWebHistory } from "vue-router";
import RoleSelect from "@/login.vue"; // login.vue อยู่ใน src
import SignIn from "@/Home.vue"; // Home.vue อยู่ใน src
import Appointment from "@/components/user/UserLayout.vue";
import StaffRequest from "@/components/staff/StaffLayout.vue";
import AdminRequest from "@/components/admin/AdminLayout.vue";

const routes = [
  { path: "/", name: "RoleSelect", component: RoleSelect },
  { path: "/login", name: "SignIn", component: SignIn },
  { path: "/user/appointment", name: "Appointment", component: Appointment },
  {
    path: "/staff/StaffRequest",
    name: "StaffRequest",
    component: StaffRequest,
  },
  {
    path: "/admin/AdminRequest",
    name: "AdminRequest",
    component: AdminRequest,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
