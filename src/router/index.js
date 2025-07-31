import { createRouter, createWebHistory } from "vue-router";
import RoleSelect from "@/login.vue";
import SignIn from "@/Home.vue";
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
    meta: { requiresRole: ["staff"] }, // ✅ เฉพาะ staff เท่านั้น
  },
  {
    path: "/admin/AdminRequest",
    name: "AdminRequest",
    component: AdminRequest,
    meta: { requiresRole: ["admin"] }, // ✅ เฉพาะ admin เท่านั้น
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation Guard
router.beforeEach((to, from, next) => {
  const role = localStorage.getItem("role");

  if (to.meta.requiresRole) {
    // หน้าต้องการ role
    if (!role) {
      alert("กรุณาเข้าสู่ระบบก่อน");
      return next({ name: "RoleSelect" });
    }
    if (!to.meta.requiresRole.includes(role)) {
      alert("คุณไม่มีสิทธิ์เข้าหน้านี้");
      return next({ name: "RoleSelect" });
    }
  }

  next();
});

export default router;
