<template>
  <v-app>
    <v-main>
      <v-container>

        <!-- ตารางการจอง -->
        <v-table style="table-layout: fixed;">
          <thead style="background-color: #009199; color: white;">
            <tr>
              <th class="text-center" style="width: 8%;">วันที่</th>
              <th class="text-center" style="width: 14%;">เวลา</th>
              <th class="text-center" style="width: 9%;">สถานที่</th>
              <th class="text-center" style="width: 18%;">ประเภท</th>
              <th class="text-center" style="width: 20%;">ผู้จอง</th>
              <th class="text-center" style="width: 15%;">อีเมล</th>
              <th class="text-center" style="width: 10%;">เบอร์โทร</th>
              <th class="text-center" style="width: 12%;">สถานะ</th>
            </tr>
          </thead>

          <tbody style="background-color: #f0fafa;">
            <tr v-for="item in appointments" :key="item.appointment_ID">
              <td>{{ formatDate(item.date) }}</td>
              <td>{{ item.time }}</td>
              <td>{{ item.place_name }}</td>
              <td>
                <div style="padding: 8px 12px;">{{ item.service_type || item.other_type }} </div>
              </td>
              <td>{{ item.full_name || '-' }}</td>
              <td>{{ item.user_email }}</td>
              <td>{{ item.phone_number }}</td>
              <td class="text-center">
                <v-btn v-if="item.status === 'pending'" size="small" variant="flat"
                  style="background-color:#EACE7B;color:#7A601D" @click="openAssignDialog(item)">
                  <v-icon start small>mdi-timer-sand</v-icon> รอรับเคส
                </v-btn>
                <span v-else-if="item.status === 'approved'" style="color:green;">✔ รับแล้ว</span>
                <span v-else-if="item.status === 'rejected'" style="color:red;">❌ ปฏิเสธแล้ว</span>
                <span v-else>{{ item.status }}</span>
              </td>
            </tr>
          </tbody>
        </v-table>

        <!-- ✅ ปรับความกว้าง dialog จาก 450px → 600px -->
        <v-dialog v-model="showDialog" max-width="600px">
          <v-card class="pa-6" style="border-radius: 12px; position: relative;">

            <!-- ปุ่มปิด -->
            <v-btn icon size="small" variant="plain" class="ma-0 pa-0"
              style="position: absolute; top: 12px; right: 12px;" @click="showDialog = false">
              <v-icon size="20">mdi-close</v-icon>
            </v-btn>

            <!-- หัวข้อ -->
            <v-card-title class="text-h6 font-weight-bold pa-0 mb-4">
              ข้อมูลผู้รับบริการ
            </v-card-title>

            <!-- เนื้อหา -->
            <v-card-text v-if="selectedAppointment" class="pa-0">
              <!-- กลุ่ม 1: ข้อมูลส่วนตัว -->
              <div class="mb-4" style="line-height: 1.6;">
                <p><strong>ชื่อ:</strong> {{ selectedAppointment.full_name || '-' }}</p>
                <p><strong>อีเมล:</strong> {{ selectedAppointment.user_email }}</p>
                <p><strong>เบอร์โทร:</strong> {{ selectedAppointment.phone_number }}</p>
              </div>

              <!-- กลุ่ม 2: รายละเอียดการนัด -->
              <div style="line-height: 1.6;">
                <p><strong>วันที่นัด:</strong> {{ formatDate(selectedAppointment.date) }}</p>
                <p><strong>เวลา:</strong> {{ selectedAppointment.time }}</p>
                <p><strong>ประเภทการบริการ:</strong> {{ selectedAppointment.service_type ||
                  selectedAppointment.other_type }}</p>
                <p><strong>สถานที่:</strong> {{ selectedAppointment.place_name }}</p>
              </div>
            </v-card-text>

            <!-- ปุ่ม -->
            <v-card-actions class="justify-end mt-6 pa-0">
              <v-btn color="green" variant="flat" class="text-white" @click="confirmAssign">
                อนุมัติ
              </v-btn>
              <v-btn color="red" variant="flat" class="text-white" @click="rejectCase">
                ปฏิเสธ
              </v-btn>
            </v-card-actions>

          </v-card>
        </v-dialog>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const appointments = ref([])
const showDialog = ref(false)
const selectedAppointment = ref(null)

// ✅ เปิด Dialog
const openAssignDialog = (appointment) => {
  selectedAppointment.value = appointment
  showDialog.value = true
}

// ✅ รับเคส
const confirmAssign = async () => {
  try {
    const staff_ID = localStorage.getItem('staff_ID')
    console.log("📤 staff_ID ที่จะส่ง:", staff_ID)
    await axios.put(`http://localhost:3000/api/appointments/${selectedAppointment.value.appointment_ID}/assign`, {
      staff_ID,
    })

    alert('รับเคสสำเร็จ')

    showDialog.value = false
    fetchAppointments() // 🔁 โหลดรายการใหม่
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการรับเคส')
  }
}


// ✅ ปฏิเสธเคส
const rejectCase = async () => {
  try {
    const staff_ID = localStorage.getItem('staff_ID') // ✅ ดึง staff_ID มา
    await axios.put(`http://localhost:3000/api/appointments/${selectedAppointment.value.appointment_ID}/reject`, {
      staff_ID, // ✅ ส่งไปด้วย
    })
    alert('ปฏิเสธเคสสำเร็จ')
    showDialog.value = false
    fetchAppointments()
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการปฏิเสธเคส')
  }
}



// ✅ แปลงวันที่
const formatDate = (dateString) => {
  if (!dateString) return "-"
  return new Date(dateString).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ✅ โหลดข้อมูล
const fetchAppointments = async () => {
  const res = await axios.get("http://localhost:3000/api/appointments")
  appointments.value = res.data
}

onMounted(fetchAppointments)
</script>

<style scoped>
h2 {
  font-weight: bold;
  color: #009199;
}
</style>
