<!-- src/views/AdminManageStaff.vue -->
<template>
  <v-container class="py-6">
    <!-- ===== Staff Management ===== -->
    <v-row justify="space-between" align="center" class="mb-4">
      <h2 class="text-h6 font-weight-bold">{{ t('manage.staff.title') }}</h2>
      <v-btn color="pink-lighten-4" prepend-icon="mdi-plus" @click="dialogStaff = true" elevation="0">
        {{ t('manage.staff.btn_add') }}
      </v-btn>
    </v-row>

    <v-table density="comfortable">
      <thead class="bg-cyan-darken-2 text-white">
        <tr>
          <th>{{ t('manage.staff.col_name') }}</th>
          <th>{{ t('manage.staff.col_email') }}</th>
          <th>{{ t('manage.staff.col_phone') }}</th>
          <th>{{ t('manage.staff.col_status') }}</th>
        </tr>
      </thead>
      <tbody v-if="nonAdminStaff.length > 0">
        <tr v-for="staff in nonAdminStaff" :key="staff.email">
          <!-- 1) Full name -->
          <td>{{ staffDisplayName(staff) }}</td>

          <!-- 2) Email -->
          <td>{{ staff.email }}</td>

          <!-- 3) Phone -->
          <td>{{ staff.phone || '-' }}</td>

          <!-- 4) Status -->
          <td>
            <v-switch v-model="staff.active" inset color="green"
              :label="staff.active ? t('common.on') : t('common.off')" @change="updateStaffStatus(staff)"
              hide-details />
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Dialog: Add Staff -->
    <v-dialog v-model="dialogStaff" max-width="500">
      <v-card>
        <v-card-title class="text-h6 font-weight-bold text-white bg-pink-darken-2">
          {{ t('manage.staff.dialog_title') }}
        </v-card-title>

        <v-card-text class="pb-0">
          <v-form ref="formStaffRef">

            <!-- name TH -->
            <div class="mb-2 text-medium-emphasis">{{ t('manage.staff.section_th') }}</div>
            <v-text-field v-model="formStaff.first_name_th" density="comfortable" variant="outlined"
              prepend-inner-icon="mdi-account">
              <template #label>
                <span style="color:black">{{ t('manage.staff.first_name_th') }}</span>
                <span style="color:red"> *</span>
              </template>
            </v-text-field>

            <v-text-field v-model="formStaff.last_name_th" density="comfortable" variant="outlined"
              prepend-inner-icon="mdi-account">
              <template #label>
                <span style="color:black">{{ t('manage.staff.last_name_th') }}</span>
                <span style="color:red"> *</span>
              </template>
            </v-text-field>

            <!-- name EN -->
            <div class="mt-4 mb-2 text-medium-emphasis">{{ t('manage.staff.section_en') }}</div>
            <v-text-field v-model="formStaff.first_name_en" density="comfortable" variant="outlined"
              prepend-inner-icon="mdi-account-outline">
              <template #label>
                <span style="color:black">{{ t('manage.staff.first_name_en') }}</span>
                <span style="color:red"> *</span>
              </template>
            </v-text-field>

            <v-text-field v-model="formStaff.last_name_en" density="comfortable" variant="outlined"
              prepend-inner-icon="mdi-account-outline">
              <template #label>
                <span style="color:black">{{ t('manage.staff.last_name_en') }}</span>
                <span style="color:red"> *</span>
              </template>
            </v-text-field>

            <v-text-field v-model="formStaff.email" variant="outlined" prepend-inner-icon="mdi-email" type="email"
              density="comfortable" color="teal">
              <template #label>
                <span style="color:black">{{ t('manage.staff.email') }}</span>
                <span style="color:red"> *</span>
              </template>
            </v-text-field>

            <v-text-field v-model.trim="formStaff.phone" variant="outlined" prepend-inner-icon="mdi-phone" type="tel"
              inputmode="numeric" pattern="[0-9]*" :maxlength="10" counter @keydown="onPhoneKeydown"
              @paste="onPhonePaste">
              <template #label>
                <span style="color:black">{{ t('manage.staff.phone') }}</span>
                <span style="color:red"> *</span>
              </template>
            </v-text-field>

          </v-form>
        </v-card-text>

        <v-card-actions class="justify-end py-2">
          <v-btn variant="text" @click="dialogStaff = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="pink-darken-2" class="text-white" @click="addStaff" :disabled="!isStaffComplete">
            {{ t('common.add') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ===== Place Management ===== -->
    <v-row justify="space-between" align="center" class="my-8">
      <h2 class="text-h6 font-weight-bold">{{ t('manage.place.title') }}</h2>
      <v-btn color="blue-lighten-4" prepend-icon="mdi-plus" @click="dialogPlace = true" elevation="0">
        {{ t('manage.place.btn_add') }}
      </v-btn>
    </v-row>

    <v-table density="comfortable">
      <thead class="bg-cyan-darken-2 text-white">
        <tr>
          <th>{{ t('manage.place.col_name') }}</th>
          <th>{{ t('manage.place.col_target') }}</th>
          <th>{{ t('manage.place.col_active') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="place in placeList" :key="place.id">
          <!-- ✅ ชื่อสถานที่ในตาราง แปล 2 ภาษา -->
          <td>{{ displayPlaceName(place) }}</td>

          <td>{{ targetLabel(place.target) }}</td>
          <td>
            <v-switch v-model="place.active" inset color="green"
              :label="place.active ? t('common.on') : t('common.off')" @change="updatePlaceStatus(place)"
              hide-details />
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Dialog: Add Place -->
    <v-dialog v-model="dialogPlace" max-width="500">
      <v-card>
        <v-card-title class="text-h6 font-weight-bold text-white bg-blue-darken-2">
          {{ t('manage.place.dialog_title') }}
        </v-card-title>

        <v-card-text class="pb-0">
          <v-form ref="formPlaceRef">

            <v-text-field v-model="formPlace.name_th" variant="outlined" density="comfortable"
              prepend-inner-icon="mdi-map-marker" class="mb-3" color="teal" hide-details>
              <template #label>
                <span style="color:black">{{ t('manage.place.name_th') }}</span>
                <span style="color:red"> *</span>
              </template>
            </v-text-field>

            <v-text-field v-model="formPlace.name_en" variant="outlined" density="comfortable"
              prepend-inner-icon="mdi-map-marker-outline" class="mb-3" color="teal" hide-details>
              <template #label>
                <span style="color:black">{{ t('manage.place.name_en') }}</span>
                <span style="color:red"> *</span>
              </template>
            </v-text-field>

            <v-select v-model="formPlace.target" :label="t('manage.place.target_label')" :items="placeTargetItems"
              item-title="label" item-value="value" prepend-inner-icon="mdi-account-group" variant="outlined"
              density="comfortable" class="mb-3" color="teal" hide-details>
              <template #label>
                <span style="color:black">{{ t('manage.place.target_label') }}</span>
                <span style="color:red"> *</span>
              </template>
            </v-select>

          </v-form>
        </v-card-text>

        <v-card-actions class="justify-end py-2">
          <v-btn variant="text" @click="dialogPlace = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="blue-darken-2" class="text-white" @click="addPlace" :disabled="!isPlaceComplete">
            {{ t('common.add') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

/** รับภาษาและซิงค์ i18n.locale จากพาเรนต์ */
const props = defineProps({ lang: { type: String, default: 'th' } })
const { t, locale } = useI18n()
watch(
  () => props.lang,
  l => {
    const code = String(l || '').toLowerCase();   // normalize
    if (code === 'th' || code === 'en') locale.value = code;
  },
  { immediate: true }
)

function getStaffDisplayNameFromLS() {
  const th = (localStorage.getItem('name_th') || '').trim()
  const en = (localStorage.getItem('name_en') || '').trim()
  const legacy = (localStorage.getItem('name') || '').trim()
  return locale.value === 'en'
    ? (en || th || legacy)
    : (th || en || legacy)
}

/* ===== Staff ===== */
const dialogStaff = ref(false)
const formStaff = ref({
  first_name_th: '',
  last_name_th: '',
  first_name_en: '',
  last_name_en: '',
  email: '',
  phone: ''
})

const staffList = ref([])
const nonAdminStaff = computed(() => staffList.value.filter(s => s && s.role !== 'admin'))

function staffDisplayName(s) {
  const th = [s.first_name_th, s.last_name_th].filter(Boolean).join(' ').trim()
  const en = [s.first_name_en, s.last_name_en].filter(Boolean).join(' ').trim()
  return (locale.value === 'en' ? (en || th) : (th || en)) || '-'
}

const fetchStaffList = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/admin/staff')
    staffList.value = res.data.map(s => ({
      email: s.email,
      phone: s.phone || s.phone_number || '-',
      active: s.active === true || s.staff_status === 'active',
      role: s.role,
      first_name_th: s.first_name_th || '',
      last_name_th: s.last_name_th || '',
      first_name_en: s.first_name_en || '',
      last_name_en: s.last_name_en || ''
    }))
  } catch (err) {
    console.error('Failed to fetch staff list:', err)
  }
}

const addStaff = async () => {
  const f = formStaff.value
  if (!isStaffComplete.value) return
  try {
    await axios.post('http://localhost:3000/api/admin/staff/add', {
      first_name_th: f.first_name_th,
      last_name_th: f.last_name_th,
      first_name_en: f.first_name_en,
      last_name_en: f.last_name_en,
      email: f.email,
      phone_number: f.phone,
      role: 'staff'
    })
    await fetchStaffList()
    formStaff.value = { first_name_th: '', last_name_th: '', first_name_en: '', last_name_en: '', email: '', phone: '' }
    dialogStaff.value = false
  } catch (err) {
    console.error('Failed to add staff:', err)
  }
}

const updateStaffStatus = async (staff) => {
  const prev = staff.active
  try {
    const status = staff.active ? 'active' : 'inactive'
    await axios.put('http://localhost:3000/api/admin/staff/status', { email: staff.email, status })
  } catch (err) {
    console.error('Failed to update staff status:', err)
    staff.active = !prev
  }
}

watch(dialogStaff, (open) => {
  if (!open) {
    formStaff.value = { first_name_th: '', last_name_th: '', first_name_en: '', last_name_en: '', email: '', phone: '' }
  }
})

/* ===== Staff เบอร์โทร 10หลัก ===== */
const onPhoneKeydown = (e) => {
  if (e.isComposing) return // กัน IME
  const k = e.key
  const ctrl = e.ctrlKey || e.metaKey
  const allow = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter']
  const allowCtrl = ['a', 'c', 'v', 'x']

  if (allow.includes(k)) return
  if (ctrl && allowCtrl.includes(k.toLowerCase())) return

  // ห้ามเกิน 10 หลัก
  if (/^\d$/.test(k) && String(formStaff.value.phone || '').length >= 10) {
    e.preventDefault(); return
  }
  // ถ้าไม่ใช่เลข 0-9 ให้บล็อก
  if (!/^\d$/.test(k)) e.preventDefault()
}

// ตัดให้เหลือ 10 หลัก
const onPhonePaste = (e) => {
  e.preventDefault()
  const raw = (e.clipboardData?.getData('text') || '').replace(/\D/g, '')
  const input = e.target
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? input.value.length
  const next = (input.value.slice(0, start) + raw + input.value.slice(end)).slice(0, 10)
  input.value = next
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

// safety net
watch(() => formStaff.value.phone, (v) => {
  const clean = String(v || '').replace(/\D/g, '').slice(0, 10)
  if (v !== clean) formStaff.value.phone = clean
})

/* ===== Places ===== */
const dialogPlace = ref(false)
const formPlace = ref({ name_th: '', name_en: '', target: '' })
const placeList = ref([])

const fetchPlaceList = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/admin/places')
    placeList.value = res.data.map(p => ({
      id: p.place_ID,
      // key ใหม่จาก backend
      name_th: p.name_th || p.place_name_th || '',
      name_en: p.name_en || p.place_name_en || '',
      target: p.target_group === 'ไทย' ? 'ไทย'
        : p.target_group === 'ต่างชาติ' ? 'ต่างชาติ' : '-',
      active: p.place_status === 'open'
    }))
  } catch (err) {
    console.error('Failed to fetch places:', err)
  }
}

const placeTargetItems = computed(() => [
  { label: t('manage.place.target_th'), value: 'ไทย' },
  { label: t('manage.place.target_intl'), value: 'ต่างชาติ' }
])

const targetLabel = (code) => (code === 'ไทย' ? t('manage.place.target_th') : code === 'ต่างชาติ' ? t('manage.place.target_intl') : '-')

function displayPlaceName(p = {}) {
  const code = String(locale.value || '').toLowerCase();
  const th = (p.name_th || p.place_name_th || '').trim();
  const en = (p.name_en || p.place_name_en || '').trim();
  const name = code.startsWith('en') ? (en || th) : (th || en);
  return name || '-'
}

const updatePlaceStatus = async (place) => {
  try {
    const status = place.active ? 'open' : 'closed'
    await axios.put(`http://localhost:3000/api/admin/places/status/${place.id}`, { status })
  } catch (err) {
    console.error('Failed to update place status:', err)
  }
}

const addPlace = async () => {
  const f = formPlace.value
  if (!isPlaceComplete.value) return
  try {
    const res = await axios.post('http://localhost:3000/api/admin/places/add', {
      name_th: f.name_th,
      name_en: f.name_en,
      target: f.target
    })
    placeList.value.push({
      id: res.data.place_ID,
      name_th: res.data.name_th,
      name_en: res.data.name_en,
      target: res.data.target,
      active: true
    })
    formPlace.value = { name_th: '', name_en: '', target: '' }
    dialogPlace.value = false
  } catch (err) {
    console.error('Failed to add place:', err)
  }
}

// ===== เช็กกรอกครบทุกช่องก่อนเปิดปุ่ม =====
const isStaffComplete = computed(() => {
  const f = formStaff.value
  return (
    !!f.first_name_th &&
    !!f.last_name_th &&
    !!f.first_name_en &&
    !!f.last_name_en &&
    !!f.email &&
    typeof f.phone === 'string' &&
    f.phone.replace(/\D/g, '').length === 10
  )
})

const isPlaceComplete = computed(() => {
  const f = formPlace.value
  return !!f.name_th && !!f.name_en && !!f.target
})

onMounted(() => {
  fetchStaffList()
  fetchPlaceList()
})
</script>

<style scoped>
.v-table thead th {
  font-weight: bold;
}
</style>