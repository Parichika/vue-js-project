<template>
  <v-app>
    <v-main>
      <v-container>

        <v-row class="mb-4" justify="center">
          <v-col cols="auto" class="text-center">
            <h2 class="text-h5 font-weight-bold mb-0">รายการคำขอเข้ารับคำปรึกษา</h2>
          </v-col>
        </v-row>

        <!-- ตารางการจอง -->
        <v-table style="table-layout: fixed;">
          <thead style="background-color: #009199; color: white;">
            <tr>
              <th class="text-center" style="width: 8%;">วันที่</th>
              <th class="text-center" style="width: 14%;">เวลา</th>
              <th class="text-center" style="width: 10%;">สถานที่</th>
              <th class="text-center" style="width: 18%;">ประเภท</th>
              <th class="text-center" style="width: 26%;">ผู้จอง</th>
              <th class="text-center" style="width: 15%;">อีเมล</th>
              <th class="text-center" style="width: 10%;">เบอร์โทร</th>
              <th class="text-center" style="width: 12%;">สถานะ</th>
            </tr>
          </thead>

          <tbody style="background-color: #f0fafa;">
            <tr v-for="item in paginatedBookings" :key="item.appointment_ID">
              <td>{{ formatDate(item.date) }}</td>
              <td>{{ item.time }}</td>
              <td>{{ item.place_name }}</td>
              <td>
                <div style="padding: 8px 12px;">{{ item.service_ID == 4 && item.other_type ? item.other_type :
                  item.service_type || 'ไม่ระบุ' }} </div>
              </td>
              <td>{{ item.full_name || '-' }}</td>
              <td>{{ item.user_email }}</td>
              <td>{{ item.phone_number }}</td>
              <td class="text-center">
                <v-chip v-if="item.status === 'pending'" color="#FF6F00" text-color="black"
                  @click="openAssignDialog(item)">
                  <v-icon start small>mdi-timer-sand</v-icon>
                  รอดำเนินการ
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
        <v-pagination v-model="page" :length="pageCount" :total-visible="5" next-icon="mdi-chevron-right"
          prev-icon="mdi-chevron-left" class="mt-6 d-flex justify-center" />

        <!-- dialog -->
        <v-dialog v-model="showDialog" max-width="600px">
          <v-card class="pa-6 dialog-card" style="border-radius:12px; position:relative;">

            <!-- ปุ่มปิด (ลอยนอก title bar) -->
            <v-btn icon size="small" variant="text" class="close-btn" @click="showDialog = false">
              <v-icon size="22">mdi-close</v-icon>
            </v-btn>

            <!-- หัวข้อ -->
            <v-card-title class="text-h6 font-weight-bold pa-3 mb-4"
              style="background-color:#009199; color:#fff; border-radius:8px;">
              ข้อมูลผู้รับบริการ
            </v-card-title>

            <!-- เนื้อหา -->
            <v-card-text v-if="selectedAppointment" class="pa-0">
              <!-- กลุ่ม 1: ข้อมูลส่วนตัว -->
              <div class="mb-4 pa-3" style="line-height: 1.6; background-color: #f5f5f5; border-radius: 6px;">
                <p><strong>ชื่อ:</strong> {{ selectedAppointment.full_name || '-' }}</p>
                <p><strong>อีเมล:</strong> {{ selectedAppointment.user_email }}</p>
                <p><strong>เบอร์โทร:</strong> {{ selectedAppointment.phone_number }}</p>
              </div>

              <!-- กลุ่ม 2: รายละเอียดการนัด -->
              <div class="pa-3" style="line-height: 1.6; background-color: #fafafa; border-radius: 6px;">
                <p><strong>วันที่นัด:</strong> {{ formatDate(selectedAppointment.date) }}</p>
                <p><strong>เวลา:</strong> {{ selectedAppointment.time }}</p>
                <p>
                  <strong>ประเภทการบริการ:</strong>
                  {{ selectedAppointment.service_ID == 4 && selectedAppointment.other_type
                    ? selectedAppointment.other_type
                    : selectedAppointment.service_type || 'ไม่ระบุ' }}
                </p>
                <p><strong>สถานที่:</strong> {{ selectedAppointment.place_name }}</p>
              </div>
            </v-card-text>

            <!-- ปุ่ม -->
            <v-card-actions class="justify-end mt-6 pa-0">
              <v-btn color="green" variant="flat" class="text-white" @click="confirmAssign">
                อนุมัติ
              </v-btn>
              <v-btn color="red" variant="flat" class="text-white" @click="openRejectDialog">
                ปฏิเสธ
              </v-btn>

            </v-card-actions>
          </v-card>
        </v-dialog>
        <!-- Dialog ย่อย: กรอกเหตุผลการปฏิเสธ -->
        <v-dialog v-model="showRejectDialog" max-width="520px" persistent>
          <v-card class="pa-6" style="border-radius: 12px;">
            <v-card-title class="text-h6 font-weight-bold pa-0 mb-4">
              ระบุเหตุผลการปฏิเสธ
            </v-card-title>

            <v-card-text class="pa-0">
              <v-textarea v-model="rejectReason" label="เหตุผล (ต้องกรอก)" auto-grow variant="outlined" rows="3"
                counter="500" :rules="[v => !!v && v.trim().length > 0 || 'โปรดระบุเหตุผล']" />
            </v-card-text>

            <v-card-actions class="justify-end mt-4 pa-0">
              <v-btn variant="text" @click="closeRejectDialog">ยกเลิก</v-btn>
              <v-btn color="red" variant="flat" class="text-white" @click="submitReject">
                ยืนยันปฏิเสธ
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const page = ref(1)

const router = useRouter()
const appointments = ref([])
const showDialog = ref(false)
const selectedAppointment = ref(null)
const showRejectDialog = ref(false)
const rejectReason = ref('')


// เปิด Dialog
const openAssignDialog = (appointment) => {
  selectedAppointment.value = appointment
  showDialog.value = true
}
// เปิด/ปิด Dialog เหตุผลการปฏิเสธ
const openRejectDialog = () => {
  rejectReason.value = ''
  showRejectDialog.value = true
}

const closeRejectDialog = () => {
  showRejectDialog.value = false
}

// รับเคส
const confirmAssign = async () => {
  try {
    const staff_ID = localStorage.getItem('staff_ID')
    console.log("📤 staff_ID ที่จะส่ง:", staff_ID)
    await axios.put(`http://localhost:3000/api/appointments/${selectedAppointment.value.appointment_ID}/assign`, {
      staff_ID,
    })

    alert('รับเคสสำเร็จ')

    showDialog.value = false
    fetchAppointments() // โหลดรายการใหม่
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการรับเคส')
  }
}

// ส่งปฏิเสธ + เหตุผล
const submitReject = async () => {
  try {
    const reason = (rejectReason.value || '').trim()
    if (!reason) return alert('โปรดระบุเหตุผลการปฏิเสธ')

    const staff_ID = localStorage.getItem('staff_ID')
    await axios.put(`http://localhost:3000/api/appointments/${selectedAppointment.value.appointment_ID}/reject`, {
      staff_ID,
      reason,               // <-- เผื่อ backend อ่านชื่อนี้
      reject_reason: reason // <-- และชื่อนี้ด้วย
    })

    alert('ปฏิเสธเคสสำเร็จ')
    showRejectDialog.value = false
    showDialog.value = false
    await fetchAppointments()
  } catch (err) {
    console.error(err)
    alert('เกิดข้อผิดพลาดในการปฏิเสธเคส')
  }
}



// แปลงวันที่
const formatDate = (dateString) => {
  if (!dateString) return "-"
  return new Date(dateString).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// โหลดข้อมูล
const fetchAppointments = async () => {
  const res = await axios.get("http://localhost:3000/api/appointments")
  console.log("appointments =", res.data)
  appointments.value = res.data
}

// แสดงเฉพาะหน้าปัจจุบัน
const filteredBookings = computed(() => appointments.value)

const paginatedBookings = computed(() => {
  const start = (page.value - 1) * 5
  return filteredBookings.value.slice(start, start + 5)
})

const pageCount = computed(() =>
  Math.ceil(filteredBookings.value.length / 5)
)

onMounted(fetchAppointments)
</script>

<style scoped>
h2 {
  font-weight: bold;
  color: #009199;
}

.dialog-card {
  /* เผื่อพื้นที่ด้านบนสำหรับปุ่มปิด */
  padding-top: 56px !important;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  color: #666;
}

@media (max-width: 600px) {
  .dialog-card {
    padding-top: 48px !important;
  }
}
</style>