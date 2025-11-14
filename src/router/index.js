import { createRouter, createWebHistory } from "vue-router";
import axios from "axios";
// import RoleSelect from "@/login.vue";
import SignIn from "@/Home.vue";
import Appointment from "@/components/user/UserLayout.vue";
import StaffRequest from "@/components/staff/StaffLayout.vue";
import AdminRequest from "@/components/admin/AdminLayout.vue";

axios.defaults.withCredentials = true;

const routes = [
  // { path: "/", name: "RoleSelect", component: RoleSelect },
  { path: "/", name: "SignIn", component: SignIn },
  { path: "/user/appointment", name: "Appointment", component: Appointment },
  {
    path: "/staff/StaffRequest",
    name: "StaffRequest",
    component: StaffRequest,
    meta: { requiresRole: ["staff"] }, //เฉพาะ staff เท่านั้น
  },
  {
    path: "/admin/AdminRequest",
    name: "AdminRequest",
    component: AdminRequest,
    meta: { requiresRole: ["admin"] }, //เฉพาะ admin เท่านั้น
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// === ดึง role จาก backend แล้วแคชไว้ในหน่วยความจำ ===
let cachedRole = null;
let inflight = null;

async function getRole() {
  if (cachedRole) return cachedRole;
  if (inflight) return inflight;

  inflight = axios
    .get("http://localhost:3000/api/me", { withCredentials: true })
    .then((res) => {
      cachedRole = res.data?.role || null;
      inflight = null;
      return cachedRole;
    })
    .catch(() => {
      cachedRole = null;
      inflight = null;
      return null;
    });

  return inflight;
}

// Navigation Guard
router.beforeEach(async (to, _from, next) => {
  if (!to.meta?.requiresRole) return next();

  const role = await getRole();
  if (!role) {
    alert("กรุณาเข้าสู่ระบบก่อน");
    return next({ name: "SignIn" });
  }
  if (!to.meta.requiresRole.includes(role)) {
    alert("คุณไม่มีสิทธิ์เข้าหน้านี้");
    return next({ name: "SignIn" });
  }
  next();
});

// เคลียร์แคชเมื่อออกจากระบบ
export function clearRoleCache() {
  cachedRole = null;
}

export default router;
