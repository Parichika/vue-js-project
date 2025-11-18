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

          <!-- ช่องค้นหา + ปุ่ม Export Excel อยู่ข้างกัน -->
          <v-col cols="12" sm="5" md="4" lg="3" class="d-flex justify-end align-center search-export-box">
            <v-text-field v-model="search" :label="t('history.search')" prepend-inner-icon="mdi-magnify"
              variant="outlined" density="compact" hide-details style="min-height:38px; max-width:260px;" clearable />

            <!-- ปุ่ม Export Excel -->
            <v-btn icon variant="tonal" color="green-darken-1" class="export-btn"
              :title="t('history.export_excel') || 'Export Excel'" @click="exportXlsx">
              <v-icon>mdi-file-excel</v-icon>
            </v-btn>
          </v-col>
        </v-row>

        <!-- ตาราง + Hover & Click Row -->
        <v-table class="history-table">
          <thead style="background-color:#009199; color:white;">
            <tr>
              <th class="text-center" style="width:15%;">{{ t('history.col_date') }}</th>
              <th class="text-center" style="width:15%;">{{ t('history.col_time') }}</th>
              <th class="text-center" style="width:35%;">{{ t('history.col_type') }}</th>
              <th class="text-center" style="width:20%;">{{ t('history.col_name') }}</th>
              <th class="text-center" style="width:15%;">{{ t('history.col_status') }}</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="item in paginatedBookings" :key="item.appointment_ID" class="hoverable-row" tabindex="0"
              @click="openDetailDialog(item)" @keydown.enter.prevent="openDetailDialog(item)"
              @keydown.space.prevent="openDetailDialog(item)">
              <td class="text-center">
                <span class="one-line">{{ formatDate(item.date) }}</span>
              </td>

              <td class="text-center">
                <span class="one-line">{{ item.time }}</span>
              </td>

              <!-- ประเภทบริการ -->
              <td class="text-center">
                <div style="padding:8px 12px;">
                  <span class="one-line">
                    {{ serviceLabel(item.service_ID, item.service_type, item.other_type) }}
                  </span>
                </div>
              </td>

              <td class="text-center">
                <span class="one-line">{{ item.full_name }}</span>
              </td>

              <td class="text-center">
                <div class="d-flex align-center justify-center">
                  <!-- approved: เปิดกล่องบันทึกคำแนะนำ (เฉพาะ owner) -->
                  <v-chip v-if="item.status === 'approved'" color="green" text-color="white"
                    :disabled="!canSeeSummary(item)" :class="{ 'cursor-pointer': canSeeSummary(item) }"
                    @click.stop="canSeeSummary(item) && openAdviceDialog(item)"
                    :title="canSeeSummary(item) ? t('history.click_to_add_advice') : t('history.advice_owner_only')">
                    <v-icon start small>mdi-check-circle</v-icon>
                    {{ t('status.approved') }}
                  </v-chip>

                  <v-chip v-else-if="item.status === 'rejected'" color="red" text-color="white" @click.stop>
                    <v-icon start small>mdi-close-circle</v-icon>
                    {{ t('status.rejected') }}
                  </v-chip>

                  <v-chip v-else-if="item.status === 'completed'" color="blue" text-color="white" @click.stop>
                    <v-icon start small>mdi-check-decagram</v-icon>
                    {{ t('status.completed') }}
                  </v-chip>

                  <v-chip v-else-if="item.status === 'cancelled'" color="grey" text-color="white" @click.stop>
                    <v-icon start small>mdi-cancel</v-icon>
                    {{ t('status.cancelled') }}
                  </v-chip>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>

        <v-pagination v-model="page" :length="pageCount" :total-visible="5" next-icon="mdi-chevron-right"
          prev-icon="mdi-chevron-left" class="mt-6 d-flex justify-center" />
      </v-container>

      <!-- Dialog: รายละเอียด (เปิดจากการคลิกแถว) -->
      <v-dialog v-model="detailDialog" max-width="640" transition="dialog-bottom-transition" scrim="rgba(0,0,0,.35)">
        <v-card class="pa-6 dialog-card" rounded="xl" elevation="12">
          <v-btn icon size="small" variant="text" class="close-btn" @click="detailDialog = false">
            <v-icon size="22">mdi-close</v-icon>
          </v-btn>

          <v-card-title class="text-h6 font-weight-bold pa-3 mb-4"
            style="background-color:#009199; color:#fff; border-radius:8px;">
            {{ t('history.detail_title') || t('adminReq.dialog_title') }}
          </v-card-title>

          <v-card-text v-if="selectedDetail" class="pa-0">
            <div class="mb-4 pa-3 info-block">
              <p><strong>{{ t('adminReq.f_name') }}:</strong> {{ selectedDetail.full_name || '-' }}</p>
              <p><strong>{{ t('adminReq.f_email') }}:</strong> {{ selectedDetail.user_email || '-' }}</p>
              <p><strong>{{ t('adminReq.f_phone') }}:</strong> {{ selectedDetail.phone_number || '-' }}</p>
            </div>

            <div class="pa-3 info-block">
              <p><strong>{{ t('adminReq.f_date') }}:</strong> {{ formatDate(selectedDetail.date) }}</p>
              <p><strong>{{ t('adminReq.f_time') }}:</strong> {{ selectedDetail.time }}</p>
              <p><strong>{{ t('adminReq.f_type') }}:</strong>
                {{ serviceLabel(selectedDetail.service_ID, selectedDetail.service_type, selectedDetail.other_type) }}
              </p>
              <p><strong>{{ t('adminReq.f_place') }}:</strong> {{ displayPlaceName(selectedDetail) }}</p>
            </div>

            <!-- สรุปคำแนะนำ -->
            <div class="pa-3 info-block  mt-4">
              <p class="mb-2"><strong>{{ t('history.summary_label') }}:</strong></p>
              <div v-if="canSeeSummary(selectedDetail)">
                <p v-if="selectedDetail?.appointment_summary && selectedDetail.appointment_summary.trim()">
                  {{ selectedDetail.appointment_summary }}
                </p>
                <p v-else class="text-medium-emphasis">
                  {{ t('history.summary_empty') }}
                </p>
              </div>
              <p v-else class="text-medium-emphasis">
                {{ t('history.advice_owner_only') }}
              </p>
            </div>
          </v-card-text>

          <v-card-actions class="justify-end mt-6 pa-0">
            <v-btn v-if="selectedDetail?.status === 'approved' && canSeeSummary(selectedDetail)" color="primary"
              variant="flat" @click="detailDialog = false; openAdviceDialog(selectedDetail)">
              {{ t('history.advice_quick') || t('history.btn_save') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Dialog: บันทึกคำแนะนำ (approved -> completed) -->
      <v-dialog v-model="adviceDialog" max-width="560" persistent transition="dialog-bottom-transition"
        scrim="rgba(0,0,0,.35)">
        <v-card elevation="12" rounded="xl" class="py-4 px-4 md:px-6">
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
            <v-btn icon variant="text" :disabled="saving" @click="closeAdviceDialog()">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>

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

          <v-card-actions>
            <v-spacer />
            <v-btn variant="outlined" color="grey-darken-1" rounded="lg" :disabled="saving"
              @click="closeAdviceDialog()">
              {{ t('history.btn_cancel') }}
            </v-btn>
            <v-btn color="primary" variant="flat" :loading="saving" @click="submitCompletion">
              {{ t('history.btn_save') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Snackbar -->
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

axios.defaults.withCredentials = true

const { t, locale } = useI18n()

const staffIdNum = ref(0)

const page = ref(1)
const staffBookings = ref([])
const search = ref('')

const detailDialog = ref(false)
const selectedDetail = ref(null)

const adviceDialog = ref(false)
const selectedItem = ref(null)
const adviceDetail = ref('')
const saving = ref(false)
const snack = ref({ show: false, msg: '' })

watch(search, () => { page.value = 1 })

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return '-'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const thYear = d.getFullYear() + 543
  const enYear = d.getFullYear()
  return locale.value === 'th' ? `${day}/${month}/${thYear}` : `${day}/${month}/${enYear}`
}

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

function displayPlaceName(p = {}) {
  const code = String(locale.value || '').toLowerCase()
  const th = (p.place_name_th || p.name_th || '').trim()
  const en = (p.place_name_en || p.name_en || '').trim()
  const name = code.startsWith('en') ? (en || th) : (th || en)
  return name || '-'
}

const translatedBookings = computed(() =>
  staffBookings.value.filter(item =>
    ['approved', 'rejected', 'completed', 'cancelled'].includes(item.status)
  )
)

const filteredBookings = computed(() => {
  const keyword = (search.value || '').toLowerCase().trim()
  if (!keyword) return translatedBookings.value
  return translatedBookings.value.filter((item) => {
    const studentIdPart = item.user_email?.split('@')[0]?.toLowerCase() || ''
    const fields = [
      item.full_name, item.user_email, item.phone_number,
      item.place_name_th, item.place_name_en,
      item.other_type, item.service_type, item.status
    ]
    return studentIdPart.includes(keyword) ||
      fields.some(x => (x || '').toString().toLowerCase().includes(keyword))
  })
})

const paginatedBookings = computed(() => {
  const start = (page.value - 1) * 5
  return filteredBookings.value.slice(start, start + 5)
})
const pageCount = computed(() => Math.ceil(filteredBookings.value.length / 5))

function openDetailDialog(item) {
  selectedDetail.value = item
  detailDialog.value = true
}

function openAdviceDialog(item) {
  selectedItem.value = item
  adviceDetail.value = ''
  adviceDialog.value = true
}
function closeAdviceDialog() {
  adviceDialog.value = false
  adviceDetail.value = ''
  selectedItem.value = null
}
function canSeeSummary(item) {
  if (!item) return false
  return Number(item.staff_ID || 0) === Number(staffIdNum.value || 0)
}

async function submitCompletion() {
  if (!adviceDetail.value || !adviceDetail.value.trim()) {
    snack.value = { show: true, msg: t('history.advice_required') }
    return
  }
  if (!selectedItem.value?.appointment_ID) return
  saving.value = true
  try {
    await axios.post(
      '/api/admin/appointments/complete',
      {
        appointment_ID: selectedItem.value.appointment_ID,
        advice_detail: adviceDetail.value.trim(),
      },
      { withCredentials: true }
    )
    selectedItem.value.status = 'completed'
    selectedItem.value.appointment_summary = adviceDetail.value.trim()
    if (selectedDetail.value && selectedDetail.value.appointment_ID === selectedItem.value.appointment_ID) {
      selectedDetail.value.status = 'completed'
      selectedDetail.value.appointment_summary = adviceDetail.value.trim()
    }
    adviceDialog.value = false
    snack.value = { show: true, msg: t('history.saved_success') || 'Saved successfully' }
  } catch (error) {
    snack.value = { show: true, msg: t('history.saved_error') || 'Failed to save' }
  } finally {
    saving.value = false
  }
}

async function loadMe() {
  try {
    const { data } = await axios.get('/api/me', { withCredentials: true })
    staffIdNum.value = Number(data?.staff_ID || 0)
  } catch (e) {
    staffIdNum.value = 0
  }
}

const exportXlsx = () => {
  const params = new URLSearchParams()
  const url = `/api/admin/dashboard/xlsx?${params.toString()}`
  window.open(url, '_blank')
}

onMounted(async () => {
  try {
    await loadMe()
    const res = await axios.get('/api/admin/history', { withCredentials: true })
    staffBookings.value = res.data
  } catch (error) {
    console.error('Error loading appointments history:', error)
  }
})
</script>

<style scoped>
.one-line {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-table {
  table-layout: fixed;
  width: 100%;
}

tbody tr.hoverable-row {
  background-color: #f0fafa;
  transition: background-color .18s ease, transform .12s ease, box-shadow .18s ease, border-left-color .18s ease;
  border-left: 4px solid transparent;
  cursor: pointer;
}

tbody tr.hoverable-row:hover,
tbody tr.hoverable-row:focus-within {
  background-color: #e9f5f5;
  transform: translateY(-1px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, .06);
  border-left-color: #00a8af;
}

.hoverable-row {
  transition: background-color 0.2s ease;
}

.hoverable-row:hover {
  background-color: white !important;
  cursor: pointer;
}

.dialog-card {
  padding-top: 56px !important;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  color: #666;
}

.info-block {
  line-height: 1.6;
  background-color: #fafafa;
  border-radius: 6px;
}

@media (max-width: 600px) {
  .dialog-card {
    padding-top: 48px !important;
  }
}

.cursor-pointer {
  cursor: pointer;
}

.search-export-box {
  gap: 14px;
  /* ระยะห่างระหว่างช่องค้นหาและปุ่ม Excel */
}

.export-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
}
</style>
