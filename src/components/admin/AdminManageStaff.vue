<template>
  <v-container class="mt-8">
    <!-- ส่วนจัดการบุคลากร -->
    <v-row justify="space-between" align="center" class="mb-4">
      <h2 class="text-h6 font-weight-bold">จัดการบุคลากร</h2>
      <v-btn color="#009199" prepend-icon="mdi-plus" @click="dialogStaff = true">
        เพิ่มบุคลากร
      </v-btn>

    </v-row>

    <v-table density="comfortable">
      <thead class="bg-cyan-darken-2 text-white">
        <tr>
          <th>ชื่อ - นามสกุล</th>
          <th>อีเมล</th>
          <th>เบอร์โทร</th>
          <th>สถานะบัญชี</th>
        </tr>
      </thead>
      <!-- face do--------------------- -->
      <tbody v-if="nonAdminStaff.length > 0">
        <tr v-for="(staff, index) in nonAdminStaff" :key="staff.email">
          <td>{{ staff.name }}</td>
          <td>{{ staff.email }}</td>
          <td>{{ staff.phone }}</td>
          <td>
            <v-switch v-model="staff.active" inset color="green" :label="staff.active ? 'เปิด' : 'ปิด'"
              @change="updateStaffStatus(staff)" hide-details />
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Dialog เพิ่มบุคลากร -->
    <v-dialog v-model="dialogStaff" max-width="500">
      <v-card>
        <v-card-text>
          <v-text-field v-model="formStaff.name" label="ชื่อ" />
          <v-text-field v-model="formStaff.surname" label="นามสกุล" />
          <v-text-field v-model="formStaff.email" label="อีเมล" />
          <v-text-field v-model="formStaff.phone" label="เบอร์โทรติดต่อ" />
        </v-card-text>
        <v-card-actions>
          <v-btn color="green" block class="text-white" @click="addStaff">
            เพิ่ม
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ส่วนจัดการสถานที่ -->
    <v-row justify="space-between" align="center" class="my-8">
      <h2 class="text-h6 font-weight-bold">จัดการสถานที่ให้บริการ</h2>
      <v-btn color="#009199" prepend-icon="mdi-plus" @click="dialogPlace = true">
        เพิ่มสถานที่
      </v-btn>

    </v-row>

    <v-table density="comfortable">
      <thead class="bg-cyan-darken-2 text-white">
        <tr>
          <th>ชื่อสถานที่</th>
          <th>สำหรับนักศึกษา</th>
          <th>ใช้งานอยู่</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(place, index) in placeList" :key="index">
          <td>{{ place.name }}</td>
          <td>{{ place.target }}</td>
          <td>
            <v-switch v-model="place.active" inset color="green" :label="place.active ? 'เปิด' : 'ปิด'"
              @change="updatePlaceStatus(place)" hide-details />
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Dialog เพิ่มสถานที่ -->
    <v-dialog v-model="dialogPlace" max-width="500">
      <v-card>
        <v-card-title class="text-h6">เพิ่มสถานที่</v-card-title>
        <v-card-text>
          <v-text-field v-model="formPlace.name" label="ชื่อสถานที่" />
          <v-select v-model="formPlace.target" label="สำหรับนักศึกษา" :items="['นักศึกษาไทย', 'นักศึกษาต่างชาติ']" />
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn text @click="dialogPlace = false">ยกเลิก</v-btn>
          <v-btn color="#009199" @click="addPlace">เพิ่ม</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed } from "vue"; // face do------------------เพิ่ม computed
import { onMounted } from "vue";
import axios from "axios";

// บุคลากร
const dialogStaff = ref(false);
const formStaff = ref({ name: "", surname: "", email: "", phone: "" });

// face do------------------
// ใช้ computed filter แยก admin
const nonAdminStaff = computed(() =>
  staffList.value.filter((s) => s && s.role !== "admin")
);

const staffList = ref([]);

const fetchStaffList = async () => {
  try {
    const res = await axios.get("http://localhost:3000/api/staff");
    console.log("📥 staff from API:", res.data);

    staffList.value = res.data.map((s) => ({
      name: s.name || `${s.first_name || ""} ${s.last_name || ""}`,
      email: s.email,
      phone: s.phone || s.phone_number || "-",
      active: s.active === true || s.staff_status === "active",
      role: s.role,
    }));

  } catch (err) {
    console.error("❌ Failed to fetch staff list:", err);
  }
};

const addStaff = async () => {
  if (formStaff.value.name && formStaff.value.surname && formStaff.value.email) {
    try {
      await axios.post("http://localhost:3000/api/staff", {
        first_name: formStaff.value.name,
        last_name: formStaff.value.surname,
        email: formStaff.value.email,
        phone_number: formStaff.value.phone,
        role: "staff", // <<< ต้องมี role เสมอ
      });

      // ✅ โหลด staff list ใหม่จาก backend
      await fetchStaffList();

      // ✅ ล้างฟอร์มและปิด dialog
      formStaff.value = { name: "", surname: "", email: "", phone: "" };
      dialogStaff.value = false;
    } catch (err) {
      console.error("❌ Failed to add staff:", err);
      alert("เกิดข้อผิดพลาดในการเพิ่มบุคลากร");
    }
  }
};

const updateStaffStatus = async (staff) => {
  try {
    const status = staff.active ? "active" : "inactive";
    await axios.put(`http://localhost:3000/api/staff/status`, {
      email: staff.email, // ✅ ต้องแน่ใจว่ามี email
      status: status,
    });
  } catch (err) {
    console.error("❌ Failed to update staff status:", err);
    alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะบัญชี");
  }
};


// สถานที่ ----------
const dialogPlace = ref(false);
const formPlace = ref({ name: "", target: "" });

const placeList = ref([]);

onMounted(() => {
  fetchPlaceList();
  fetchStaffList();
});

const fetchPlaceList = async () => {
  const res = await axios.get("http://localhost:3000/api/places");
  placeList.value = res.data.map((p) => ({
    id: p.place_ID,
    name: p.place_name,
    target: p.target_group === "ไทย" ? "ไทย"
      : p.target_group === "ต่างชาติ" ? "ต่างชาติ"
        : "-", // กรณี null หรือไม่มีค่า
    active: p.place_status === "open"
  }));
};

const updatePlaceStatus = async (place) => {
  const status = place.active ? "open" : "closed";
  await axios.put(`http://localhost:3000/api/places/${place.id}/status`, {
    status: status,
  });
};

const addPlace = async () => {
  if (formPlace.value.name && formPlace.value.target) {
    try {
      const res = await axios.post("http://localhost:3000/api/places", {
        name: formPlace.value.name,
        target:
          formPlace.value.target === "นักศึกษาไทย"
            ? "ไทย"
            : formPlace.value.target === "นักศึกษาต่างชาติ"
              ? "ต่างชาติ"
              : "",
      });

      // เพิ่มเข้า list แบบ sync กับค่าจาก backend
      placeList.value.push({
        id: res.data.place_ID,
        name: res.data.name,
        target: res.data.target,
        active: true,
      });

      formPlace.value = { name: "", target: "" };
      dialogPlace.value = false;
    } catch (err) {
      console.error("❌ Failed to add place:", err);
      alert("เกิดข้อผิดพลาดในการเพิ่มสถานที่");
    }
  }
};
</script>

<style scoped>
.v-table thead th {
  font-weight: bold;
}
</style>