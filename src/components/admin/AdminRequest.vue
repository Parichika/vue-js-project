<template>
  <v-app>
    <v-main>
      <v-container>

        <!-- หัวข้อ -->
        <!-- <v-row class="mb-4" justify="center">
          <v-col cols="auto" class="text-center">
            <h2 class="text-h5 font-weight-bold mb-0">{{ t('adminReq.title') }}</h2>
          </v-col>
        </v-row> -->

        <!-- ตารางการจอง -->
        <v-table style="table-layout: fixed;">
          <thead style="background-color: #009199; color: white;">
            <tr>
              <th class="text-center" style="width: 15%;">{{ t('adminReq.col_date') }}</th>
              <th class="text-center" style="width: 15%;">{{ t('adminReq.col_time') }}</th>
              <th class="text-center" style="width: 35%;">{{ t('adminReq.col_type') }}</th>
              <th class="text-center" style="width: 20%;">{{ t('adminReq.col_booker') }}</th>
              <th class="text-center" style="width: 15%;">{{ t('adminReq.col_status') }}</th>
            </tr>
          </thead>

          <tbody style="background-color: #f0fafa;">
            <tr v-for="item in paginatedBookings" :key="item.appointment_ID">
              <td class="text-center"><span class="one-line">{{ formatDate(item.date) }}</span></td>

              <td class="text-center"><span class="one-line">{{ item.time }}</span></td>

              <td class="text-center">
                <div style="padding: 8px 12px;"><span class="one-line">
                    {{ serviceLabel(item.service_ID, item.service_type, item.other_type) }}</span>
                </div>
              </td>

              <td class="text-center"><span class="one-line">{{ item.full_name || '-' }}</span></td>

              <td class="text-center">
                <v-chip v-if="item.status === 'pending'" color="#FF6F00" text-color="black"
                  @click="openAssignDialog(item)">
                  <v-icon start small>mdi-timer-sand</v-icon>
                  {{ t('status.pending') }}
                </v-chip>
                <v-chip v-else-if="item.status === 'approved'" color="green" text-color="white">
                  <v-icon start small>mdi-check-circle</v-icon>
                  {{ t('status.approved') }}
                </v-chip>
                <v-chip v-else-if="item.status === 'rejected'" color="red" text-color="white">
                  <v-icon start small>mdi-close-circle</v-icon>
                  {{ t('status.rejected') }}
                </v-chip>
                <v-chip v-else-if="item.status === 'cancelled'" color="grey" text-color="white">
                  <v-icon start small>mdi-cancel</v-icon>
                  {{ t('status.cancelled') }}
                </v-chip>
                <v-chip v-else-if="item.status === 'completed'" color="blue" text-color="white">
                  <v-icon start small>mdi-check-decagram</v-icon>
                  {{ t('status.completed') }}
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>

        <v-pagination v-model="page" :length="pageCount" :total-visible="5" next-icon="mdi-chevron-right"
          prev-icon="mdi-chevron-left" class="mt-6 d-flex justify-center" />

        <!-- Dialog รายละเอียด/อนุมัติ/ปฏิเสธ -->
        <v-dialog v-model="showDialog" max-width="600px">
          <v-card class="pa-6 dialog-card" style="border-radius:12px; position:relative;">
            <v-btn icon size="small" variant="text" class="close-btn" @click="showDialog = false">
              <v-icon size="22">mdi-close</v-icon>
            </v-btn>

            <v-card-title class="text-h6 font-weight-bold pa-3 mb-4"
              style="background-color:#009199; color:#fff; border-radius:8px;">
              {{ t('adminReq.dialog_title') }}
            </v-card-title>

            <v-card-text v-if="selectedAppointment" class="pa-0">
              <div class="mb-4 pa-3" style="line-height: 1.6; background-color: #f5f5f5; border-radius: 6px;">
                <p><strong>{{ t('adminReq.f_name') }}:</strong> {{ selectedAppointment.full_name || '-' }}</p>
                <p><strong>{{ t('adminReq.f_email') }}:</strong> {{ selectedAppointment.user_email }}</p>
                <p><strong>{{ t('adminReq.f_phone') }}:</strong> {{ selectedAppointment.phone_number }}</p>
              </div>

              <div class="pa-3" style="line-height: 1.6; background-color: #fafafa; border-radius: 6px;">
                <p><strong>{{ t('adminReq.f_date') }}:</strong> {{ formatDate(selectedAppointment.date) }}</p>
                <p><strong>{{ t('adminReq.f_time') }}:</strong> {{ selectedAppointment.time }}</p>
                <p><strong>{{ t('adminReq.f_type') }}:</strong>
                  {{ serviceLabel(selectedAppointment.service_ID, selectedAppointment.service_type,
                    selectedAppointment.other_type) }}
                </p>
                <p><strong>{{ t('adminReq.f_place') }}:</strong> {{ displayPlaceName(selectedAppointment) }}</p>
              </div>
            </v-card-text>

            <v-card-actions class="justify-end mt-6 pa-0">
              <v-btn color="green" variant="flat" class="text-white" @click="confirmAssign">
                {{ t('adminReq.btn_approve') }}
              </v-btn>
              <v-btn color="red" variant="flat" class="text-white" @click="openRejectDialog">
                {{ t('adminReq.btn_reject') }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Dialog กรอกเหตุผลการปฏิเสธ -->
        <v-dialog v-model="showRejectDialog" max-width="520px" persistent>
          <v-card class="pa-6" style="border-radius: 12px;">
            <v-card-title class="text-h6 font-weight-bold pa-0 mb-4">
              {{ t('adminReq.reject_title') }}
            </v-card-title>

            <v-card-text class="pa-0">
              <v-textarea v-model="rejectReason" :label="t('adminReq.reject_reason_label')" auto-grow variant="outlined"
                rows="3" counter="500" :rules="[v => !!v && v.trim().length > 0 || t('adminReq.reject_reason_rule')]" />
            </v-card-text>

            <v-card-actions class="justify-end mt-4 pa-0">
              <v-btn variant="text" @click="closeRejectDialog">{{ t('adminReq.btn_cancel') }}</v-btn>
              <v-btn color="red" variant="flat" class="text-white" @click="submitReject">
                {{ t('adminReq.btn_confirm_reject') }}
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
import { useI18n } from 'vue-i18n'
import axios from 'axios'

axios.defaults.withCredentials = true

const { t, locale } = useI18n()

const page = ref(1)
const appointments = ref([])
const showDialog = ref(false)
const selectedAppointment = ref(null)
const showRejectDialog = ref(false)
const rejectReason = ref('')

const openAssignDialog = (appointment) => {
  selectedAppointment.value = appointment
  showDialog.value = true
}
const openRejectDialog = () => {
  rejectReason.value = ''
  showRejectDialog.value = true
}
const closeRejectDialog = () => { showRejectDialog.value = false }

// รับเคส
const confirmAssign = async () => {
  if (!selectedAppointment.value?.appointment_ID) return
  try {
    const apptId = selectedAppointment.value.appointment_ID
    await axios.put(
      `http://localhost:3000/api/admin/appointments/assign/${apptId}`,
      null,
      { withCredentials: true }
    )
    showDialog.value = false
    await fetchAppointments()
  } catch (err) {
    alert(err?.response?.data?.error || 'Assign failed')
  }
}

// ปฏิเสธเคส + เหตุผล
const submitReject = async () => {
  const reason = (rejectReason.value || '').trim()
  if (!reason || !selectedAppointment.value?.appointment_ID) return
  try {
    const apptId = selectedAppointment.value.appointment_ID
    await axios.put(
      `http://localhost:3000/api/admin/appointments/reject/${apptId}`,
      { reject_reason: reason },
      { withCredentials: true }
    )
    showRejectDialog.value = false
    showDialog.value = false
    await fetchAppointments()
  } catch (err) {
    alert(err?.response?.data?.error || 'Reject failed')
  }
}

// วันที่ตาม locale
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return '-'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = locale.value === 'th' ? d.getFullYear() + 543 : d.getFullYear()
  return `${day}/${month}/${year}`
}

// โหลดข้อมูล
const fetchAppointments = async () => {
  const res = await axios.get('http://localhost:3000/api/admin/appointments', { withCredentials: true })
  appointments.value = res.data || []
}

// เพจิเนชัน
const filteredBookings = computed(() => appointments.value)
const paginatedBookings = computed(() => {
  const start = (page.value - 1) * 5
  return filteredBookings.value.slice(start, start + 5)
})
const pageCount = computed(() => Math.ceil(filteredBookings.value.length / 5))

onMounted(fetchAppointments)

function displayPlaceName(p = {}) {
  const code = String(locale.value || '').toLowerCase();
  const th = (p.place_name_th || p.name_th || '').trim();
  const en = (p.place_name_en || p.name_en || '').trim();
  const name = code.startsWith('en') ? (en || th) : (th || en);
  return name || '-'
}

function serviceLabel(serviceId, serviceType, otherType) {
  if (serviceId === 1) return t('appointment.life')
  if (serviceId === 2) return t('appointment.study')
  if (serviceId === 3) return t('appointment.emotion')
  if (serviceId === 4) return otherType || t('appointment.other')
  const norm = (serviceType || '').toLowerCase()
  if (!norm) return t('adminReq.unspecified')
  if (/(ชีวิต|ปรับตัว|life|adjustment)/.test(norm)) return t('appointment.life')
  if (/(เรียน|academic|study)/.test(norm)) return t('appointment.study')
  if (/(สุขภาพจิต|emotion|mental)/.test(norm)) return t('appointment.emotion')
  if (/(other|อื่น)/.test(norm)) return otherType || t('appointment.other')
  return serviceType || t('adminReq.unspecified')
}
</script>

<style scoped>
.one-line {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

h2 {
  font-weight: bold;
  color: #009199;
}

.dialog-card {
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