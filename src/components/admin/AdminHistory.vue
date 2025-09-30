<!-- src/views/AdminHistory.vue -->
<template>
  <v-app>
    <v-main>
      <v-container>
        <!-- หัวเรื่อง + ช่องค้นหา -->
        <v-row class="mb-4" align="center" justify="space-between">
          <v-col cols="auto" class="text-center">
            <h2 class="text-h5 font-weight-bold mb-0" style="color:#009199;">
              {{ t('history.title') }}
            </h2>
          </v-col>

          <!-- ช่องค้นหาอยู่ขวา -->
          <v-col cols="12" sm="5" md="4" lg="3" class="d-flex justify-end">
            <v-text-field v-model="search" :label="t('history.search')" prepend-inner-icon="mdi-magnify"
              variant="outlined" density="compact" hide-details style="min-height:38px; max-width:260px;" clearable />
          </v-col>
        </v-row>

        <v-table style="table-layout:fixed;">
          <thead style="background-color:#009199; color:white;">
            <tr>
              <th class="text-center" style="width:7%;">{{ t('history.col_date') }}</th>
              <th class="text-center" style="width:9%;">{{ t('history.col_time') }}</th>
              <th class="text-center" style="width:12%;">{{ t('history.col_location') }}</th>
              <th class="text-center" style="width:15%;">{{ t('history.col_type') }}</th>
              <th class="text-center" style="width:15%;">{{ t('history.col_name') }}</th>
              <th class="text-center" style="width:14%;">{{ t('history.col_email') }}</th>
              <th class="text-center" style="width:9%;">{{ t('history.col_phone') }}</th>
              <th class="text-center" style="width:10%;">{{ t('history.col_status') }}</th>
              <th class="text-center" style="width:19%;">{{ t('history.col_summary') }}</th>
            </tr>
          </thead>

          <tbody style="background-color:#f0fafa;">
            <tr v-for="item in paginatedBookings" :key="item.appointment_ID">
              <td class="text-center">
                <span class="one-line">{{ formatDate(item.date) }}</span>
              </td>
              <td class="text-center">
                <span class="one-line">{{ item.time }}</span>
              </td>

              <!-- ✅ แปลสถานที่ตามภาษา -->
              <td class="text-start">
                <span class="one-line">{{ displayPlaceName(item) }}</span>
              </td>

              <!-- ✅ แปลประเภทบริการตามภาษา -->
              <td>
                <div style="padding:8px 12px;">
                  <span class="one-line">
                    {{ serviceLabel(item.service_ID, item.service_type, item.other_type) }}
                  </span>
                </div>
              </td>

              <td>
                <span class="one-line">{{ item.full_name }}</span>
              </td>
              <td class="text-center">
                <span class="one-line">{{ item.user_email }}</span>
              </td>
              <td class="text-center">
                <span class="one-line">{{ item.phone_number }}</span>
              </td>

              <td>
                <div class="d-flex align-center justify-center">
                  <v-chip v-if="item.status === 'approved'" color="green" text-color="white"
                    :disabled="!canSeeSummary(item)" :class="{ 'cursor-pointer': canSeeSummary(item) }"
                    @click="openDialog(item)"
                    :title="canSeeSummary(item) ? t('history.click_to_add_advice') : t('history.advice_owner_only')">
                    <v-icon start small>mdi-check-circle</v-icon>
                    {{ t('status.approved') }}
                  </v-chip>

                  <v-chip v-else-if="item.status === 'rejected'" color="red" text-color="white">
                    <v-icon start small>mdi-close-circle</v-icon>
                    {{ t('status.rejected') }}
                  </v-chip>

                  <v-chip v-else-if="item.status === 'completed'" color="blue" text-color="white">
                    <v-icon start small>mdi-check-decagram</v-icon>
                    {{ t('status.completed') }}
                  </v-chip>

                  <v-chip v-else-if="item.status === 'cancelled'" color="grey" text-color="white">
                    <v-icon start small>mdi-cancel</v-icon>
                    {{ t('status.cancelled') }}
                  </v-chip>
                </div>
              </td>

              <td class="text-start">
                <span class="truncate" :title="canSeeSummary(item) ? (item.appointment_summary || '-') : '-'">
                  {{ canSeeSummary(item) ? (item.appointment_summary || '-') : '-' }}
                </span>
              </td>
            </tr>
          </tbody>
        </v-table>

        <v-pagination v-model="page" :length="pageCount" :total-visible="5" next-icon="mdi-chevron-right"
          prev-icon="mdi-chevron-left" class="mt-6 d-flex justify-center" />
      </v-container>

      <!-- Dialog สำหรับใส่คำแนะนำ (กดจากสถานะ approved) -->
      <v-dialog v-model="dialog" max-width="560" persistent transition="dialog-bottom-transition"
        scrim="rgba(0,0,0,.35)">
        <v-card elevation="12" rounded="xl" class="py-4 px-4 md:px-6">
          <!-- Header -->
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center ga-3">
              <v-avatar size="36" color="#E6F4F4">
                <v-icon color="#009199">mdi-lightbulb-on-outline</v-icon>
              </v-avatar>
              <div class="d-flex flex-column">
                <span class="text-h6 font-weight-bold">{{ t('history.advice_title') }}</span>
                <span class="text-body-2 text-medium-emphasis">
                  {{ t('history.advice_subtitle') || t('history.advice_helper') }}
                </span>
              </div>
            </div>
            <v-btn icon variant="text" :disabled="saving" @click="closeDialog()">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>

          <!-- Body -->
          <v-card-text class="pt-2">
            <v-textarea v-model="adviceDetail" :rules="[v => !!(v && v.trim()) || t('history.advice_required')]"
              variant="outlined" auto-grow rows="4" max-rows="10" counter="500" :maxlength="500" clearable
              :label="t('history.advice_label')"
              placeholder="e.g. Self-care steps, recommended resources, next session plan">
              <template #prepend>
                <v-icon class="mr-2">mdi-text-box-edit-outline</v-icon>
              </template>
            </v-textarea>
          </v-card-text>

          <!-- Actions -->
          <v-card-actions>
            <v-spacer />
            <v-btn variant="outlined" color="grey-darken-1" rounded="lg" :disabled="saving" @click="closeDialog()">
              {{ t('history.btn_cancel') }}
            </v-btn>
            <v-btn color="primary" variant="flat" :loading="saving" @click="submitCompletion">
              {{ t('history.btn_save') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Snackbar แจ้งผล -->
      <v-snackbar v-model="snack.show" :timeout="2800" location="top" rounded="lg">
        {{ snack.msg }}
      </v-snackbar>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const { t, locale } = useI18n()

const role = localStorage.getItem('role') || ''
const staffIdNum = Number(localStorage.getItem('staff_ID')) || 0

const page = ref(1)
const staffBookings = ref([])
const dialog = ref(false)
const selectedItem = ref(null)
const adviceDetail = ref('')
const search = ref('')
const saving = ref(false)
const snack = ref({ show: false, msg: '' })

watch(search, () => {
  page.value = 1
})

// วันที่ตาม locale ปัจจุบัน
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return '-'

  if (locale.value === 'th') {
    // แสดงเป็น วัน/เดือน/พ.ศ.
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear() + 543
    return `${day}/${month}/${year}`
  } else {
    // แสดงเป็น วัน/เดือน/ค.ศ.
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }
}

// ประเภทบริการ: ใช้รหัสก่อน ถ้าไม่มีลองเดาจากข้อความ
function serviceLabel(serviceId, serviceType, otherType) {
  if (serviceId === 1) return t('appointment.life')
  if (serviceId === 2) return t('appointment.study')
  if (serviceId === 3) return t('appointment.emotion')
  if (serviceId === 4) return otherType || t('appointment.other')

  const norm = (serviceType || '').toLowerCase()
  if (!norm) return t('history.unspecified')
  if (/(ชีวิต|ปรับตัว|life|adjustment)/.test(norm)) return t('appointment.life')
  if (/(เรียน|academic|study)/.test(norm)) return t('appointment.study')
  if (/(สุขภาพจิต|emotion|mental)/.test(norm)) return t('appointment.emotion')
  if (/(other|อื่น)/.test(norm)) return otherType || t('appointment.other')
  return serviceType || t('history.unspecified')
}

/** ===== Data ===== */
const translatedBookings = computed(() =>
  staffBookings.value.filter(item =>
    ['approved', 'rejected', 'completed', 'cancelled'].includes(item.status)
  )
)

function displayPlaceName(p = {}) {
  const code = String(locale.value || '').toLowerCase()
  const th = (p.place_name_th || p.name_th || '').trim()
  const en = (p.place_name_en || p.name_en || '').trim()
  const name = code.startsWith('en') ? (en || th) : (th || en)
  return name || '-' // เผื่อว่างทั้งคู่
}

/** ค้นหา: ชื่อ, อีเมล, เบอร์, สถานที่, ประเภท, สถานะ, รหัสนักศึกษาหน้าอีเมล */
const filteredBookings = computed(() => {
  const keyword = (search.value || '').toLowerCase().trim()
  if (!keyword) return translatedBookings.value
  return translatedBookings.value.filter((item) => {
    const studentIdPart = item.user_email?.split('@')[0]?.toLowerCase() || ''
    const fields = [
      item.full_name,
      item.user_email,
      item.phone_number,
      item.place_name_th,
      item.place_name_en,
      item.other_type,
      item.service_type,
      item.status
    ]
    return studentIdPart.includes(keyword) ||
      fields.some(x => (x || '').toString().toLowerCase().includes(keyword))
  })
})

/** เพจิเนชัน */
const paginatedBookings = computed(() => {
  const start = (page.value - 1) * 5
  return filteredBookings.value.slice(start, start + 5)
})
const pageCount = computed(() => Math.ceil(filteredBookings.value.length / 5))

/** Dialog: บันทึกคำแนะนำ -> เปลี่ยนสถานะเป็น completed */
async function submitCompletion() {
  // กันเคสกดบันทึกตอนยังไม่กรอก
  if (!adviceDetail.value || !adviceDetail.value.trim()) {
    snack.value = { show: true, msg: t('history.advice_required') }
    return
  }

  saving.value = true
  try {
    await axios.post('http://localhost:3000/api/appointments/complete', {
      appointment_ID: selectedItem.value.appointment_ID,
      advice_detail: adviceDetail.value.trim(),
      staff_ID: staffIdNum,
    })
    selectedItem.value.status = 'completed'
    selectedItem.value.appointment_summary = adviceDetail.value.trim()
    dialog.value = false
    snack.value = { show: true, msg: t('history.saved_success') || 'Saved successfully' }
  } catch (error) {
    console.error('Error submitting completion:', error)
    snack.value = { show: true, msg: t('history.saved_error') || 'Failed to save' }
  } finally {
    saving.value = false
  }
}

function openDialog(item) {
  selectedItem.value = item
  adviceDetail.value = ''
  dialog.value = true
}

function canSeeSummary(item) {
  if (!item) return false
  const ownerId = Number(item.staff_ID || 0)
  return ownerId === staffIdNum // ทั้ง admin และ staff เห็นเฉพาะเคสที่ "ตัวเองเป็น owner"
}

function closeDialog() {
  dialog.value = false
  // เคลียร์ค่าหลังปิด เพื่อกันค่าค้าง
  adviceDetail.value = ''
  selectedItem.value = null
}

/** โหลดข้อมูล */
onMounted(async () => {
  try {
    const params = { role, staff_ID: staffIdNum }
    const res = await axios.get('http://localhost:3000/api/history', { params })
    staffBookings.value = res.data
  } catch (error) {
    console.error('Error loading appointments history:', error)
  }
})
</script>

<style scoped>
td span.truncate {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

table {
  table-layout: fixed;
  width: 100%;
}

.one-line {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>