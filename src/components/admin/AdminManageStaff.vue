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
      <tbody>
        <tr v-for="(staff, index) in staffList" :key="index">
          <td>{{ staff.name }}</td>
          <td>{{ staff.email }}</td>
          <td>{{ staff.phone }}</td>
          <td>
            <v-switch v-model="staff.active" inset color="green" :label="staff.active ? 'เปิด' : 'ปิด'" hide-details />
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
            <v-switch v-model="place.active" inset color="green" :label="place.active ? 'เปิด' : 'ปิด'" hide-details />
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
import { ref } from "vue";

// บุคลากร
const dialogStaff = ref(false);
const formStaff = ref({ name: "", surname: "", email: "", phone: "" });

const staffList = ref([
  {
    name: "แววดาว บังเขม",
    email: "6531501059@mfu.com",
    phone: "0531501059",
    active: true,
  },
  {
    name: "สุภาภรณ์ กัลยา",
    email: "6531501060@mfu.com",
    phone: "0531501060",
    active: false,
  },
]);

const addStaff = () => {
  if (formStaff.value.name && formStaff.value.surname && formStaff.value.email) {
    staffList.value.push({
      name: `${formStaff.value.name} ${formStaff.value.surname}`,
      email: formStaff.value.email,
      phone: formStaff.value.phone,
      active: true,
    });
    formStaff.value = { name: "", surname: "", email: "", phone: "" };
    dialogStaff.value = false;
  }
};

// สถานที่
const dialogPlace = ref(false);
const formPlace = ref({ name: "", target: "" });

const placeList = ref([
  { name: "อาคาร C1 ห้อง 112", target: "นักศึกษาไทย", active: true },
  { name: "M4U (ตึก M-square)", target: "นักศึกษาต่างชาติ", active: true },
]);

const addPlace = () => {
  if (formPlace.value.name && formPlace.value.target) {
    placeList.value.push({
      name: formPlace.value.name,
      target: formPlace.value.target,
      active: true,
    });
    formPlace.value = { name: "", target: "" };
    dialogPlace.value = false;
  }
};
</script>

<style scoped>
.v-table thead th {
  font-weight: bold;
}
</style>
