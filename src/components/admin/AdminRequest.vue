<template>
  <v-app>
    <v-main>
      <v-container>
        <v-table style="table-layout: fixed;">
          <thead style="background-color: #009199; color: white;">
            <tr>
              <th class="text-center text-white" style="width: 8%;">วันที่</th>
              <th class="text-center text-white" style="width: 14%;">เวลา</th>
              <th class="text-center text-white" style="width: 12%;">สถานที่</th>
              <th class="text-center text-white" style="width: 18%;">ประเภท</th>
              <th class="text-center text-white" style="width: 20%;">ชื่อเจ้าหน้าที่</th>
              <th class="text-center text-white" style="width: 15%;">อีเมลผู้จอง</th>
              <th class="text-center text-white" style="width: 10%;">เบอร์โทร</th>
              <th class="text-center text-white" style="width: 10%;">สถานะ</th>
            </tr>
          </thead>
          <tbody style="background-color: #f0fafa;">
            <tr v-for="(item, index) in appointments" :key="item.appointment_ID">
              <td>{{ item.date }}</td>
              <td>{{ item.time }}</td>
              <td>{{ item.place_ID }}</td>
              <td>{{ item.service_ID || item.other_type }}</td>
              <td>{{ item.first_name ? (item.first_name + ' ' + item.last_name) : '-' }}</td>
              <td>{{ item.user_email }}</td>
              <td>{{ item.phone_number }}</td>
              <td class="text-center">
                <v-btn
                  v-if="item.status === 'pending'"
                  size="small"
                  variant="flat"
                  style="background-color:#EACE7B;color:#7A601D"
                  @click="acceptCase(item.appointment_ID)"
                >
                  <v-icon start small>mdi-timer-sand</v-icon>
                  รอรับเคส
                </v-btn>
                <span v-else-if="item.status === 'approved'" style="color:green;">✔ รับแล้ว</span>
                <span v-else>{{ item.status }}</span>
              </td>
            </tr>
          </tbody>
        </v-table>
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

// ✅ ตรวจสอบสิทธิ์ก่อนเข้า
onMounted(async () => {
  const role = localStorage.getItem('role')
  if (role !== 'admin' && role !== 'staff') {
    alert('คุณไม่มีสิทธิ์เข้าหน้านี้')
    router.push('/') // กลับไปหน้าแรก
    return
  }
  fetchAppointments()
})

// ✅ โหลดข้อมูลจาก backend
const fetchAppointments = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/appointments')
    appointments.value = res.data
  } catch (err) {
    console.error('โหลดข้อมูลล้มเหลว', err)
  }
}

// ✅ ฟังก์ชันรับเคส
const acceptCase = async (appointmentID) => {
  try {
    const staff_ID = localStorage.getItem('staff_ID')
    if (!staff_ID) {
      alert('ไม่พบ staff_ID กรุณา login ใหม่')
      return
    }
    await axios.put(`http://localhost:3000/api/appointments/${appointmentID}/assign`, {
      staff_ID: staff_ID
    })
    alert('✅ รับเคสสำเร็จ')
    fetchAppointments()
  } catch (err) {
    alert(err.response?.data?.error || 'เกิดข้อผิดพลาด')
  }
}
</script>

<style scoped>
h2 {
  font-weight: bold;
  color: #009199;
}
</style>
