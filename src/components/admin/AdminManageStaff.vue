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
          <td>{{ staff.name }}</td>
          <td>{{ staff.email }}</td>
          <td>{{ staff.phone }}</td>
          <td>
            <v-switch
              v-model="staff.active"
              inset color="green"
              :label="staff.active ? t('common.on') : t('common.off')"
              @change="updateStaffStatus(staff)"
              hide-details
            />
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
          <v-text-field v-model="formStaff.name" :label="t('manage.staff.first_name')" variant="outlined"
                        prepend-inner-icon="mdi-account" density="comfortable" class="mb-3" color="teal" />
          <v-text-field v-model="formStaff.surname" :label="t('manage.staff.last_name')" variant="outlined"
                        prepend-inner-icon="mdi-account" density="comfortable" class="mb-3" color="teal" />
          <v-text-field v-model="formStaff.email" :label="t('manage.staff.email')" variant="outlined"
                        prepend-inner-icon="mdi-email" type="email" density="comfortable" class="mb-3" color="teal" />
          <v-text-field v-model="formStaff.phone" :label="t('manage.staff.phone')" variant="outlined"
                        prepend-inner-icon="mdi-phone" type="tel" density="comfortable" class="mb-3" color="teal" />
        </v-card-text>
        <v-card-actions class="justify-end py-2">
          <v-btn variant="text" @click="dialogStaff = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="pink-darken-2" class="text-white" @click="addStaff">{{ t('common.add') }}</v-btn>
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
          <td>{{ placeLabel(place.name) }}</td>
          <td>{{ targetLabel(place.target) }}</td>
          <td>
            <v-switch
              v-model="place.active"
              inset color="green"
              :label="place.active ? t('common.on') : t('common.off')"
              @change="updatePlaceStatus(place)"
              hide-details
            />
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
          <v-text-field v-model="formPlace.name" :label="t('manage.place.name')" prepend-inner-icon="mdi-map-marker"
                        variant="outlined" density="comfortable" color="teal" class="mb-3" />
          <v-select
            v-model="formPlace.target"
            :label="t('manage.place.target_label')"
            :items="placeTargetItems"
            item-title="label" item-value="value"
            prepend-inner-icon="mdi-account-group"
            variant="outlined" density="comfortable" color="teal" class="mb-3"
          />
        </v-card-text>
        <v-card-actions class="justify-end py-2">
          <v-btn variant="text" @click="dialogPlace = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="blue-darken-2" class="text-white" @click="addPlace">{{ t('common.add') }}</v-btn>
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
watch(() => props.lang, l => { if (l === 'th' || l === 'en') locale.value = l }, { immediate: true })

/* ===== Staff ===== */
const dialogStaff = ref(false)
const formStaff = ref({ name: '', surname: '', email: '', phone: '' })

const staffList = ref([])
const nonAdminStaff = computed(() => staffList.value.filter(s => s && s.role !== 'admin'))

const fetchStaffList = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/staff')
    staffList.value = res.data.map(s => ({
      name: s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
      email: s.email,
      phone: s.phone || s.phone_number || '-',
      active: s.active === true || s.staff_status === 'active',
      role: s.role
    }))
  } catch (err) {
    console.error('Failed to fetch staff list:', err)
  }
}

const addStaff = async () => {
  if (!formStaff.value.name || !formStaff.value.surname || !formStaff.value.email) {
    alert(t('manage.staff.err_required'))
    return
  }
  try {
    await axios.post('http://localhost:3000/api/staff', {
      first_name: formStaff.value.name,
      last_name: formStaff.value.surname,
      email: formStaff.value.email,
      phone_number: formStaff.value.phone,
      role: 'staff'
    })
    await fetchStaffList()
    formStaff.value = { name: '', surname: '', email: '', phone: '' }
    dialogStaff.value = false
  } catch (err) {
    console.error('Failed to add staff:', err)
    alert(t('manage.staff.err_add'))
  }
}

const updateStaffStatus = async (staff) => {
  try {
    const status = staff.active ? 'active' : 'inactive'
    await axios.put('http://localhost:3000/api/staff/status', { email: staff.email, status })
  } catch (err) {
    console.error('Failed to update staff status:', err)
    alert(t('manage.staff.err_toggle'))
  }
}

/* ===== Places ===== */
const dialogPlace = ref(false)
const formPlace = ref({ name: '', target: '' })
const placeList = ref([])

const fetchPlaceList = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/places')
    placeList.value = res.data.map(p => ({
      id: p.place_ID,
      name: p.place_name,
      target: p.target_group === 'ไทย' ? 'ไทย' : p.target_group === 'ต่างชาติ' ? 'ต่างชาติ' : '-',
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

/** ✅ ฟังก์ชันแปลชื่อสถานที่ในตารางแบบ 2 ภาษา (ไม่กระทบค่าที่เก็บใน DB) */
function placeLabel(name = '') {
  const map = new Map([
    // TH -> key
    ['อาคาร C1 ห้อง 112', 'appointment.on_site'],
    ['ออนไลน์', 'appointment.online'],
    ['M4U (ตึก M-square)', 'appointment.msquare'],
    // EN -> key (กรณี backend ส่งอังกฤษมา)
    ['Building C1 Room 112', 'appointment.on_site'],
    ['Online', 'appointment.online'],
    ['M4U (M-square building)', 'appointment.msquare']
  ])
  const key = map.get(name.trim())
  return key ? t(key) : name
}

const updatePlaceStatus = async (place) => {
  try {
    const status = place.active ? 'open' : 'closed'
    await axios.put(`http://localhost:3000/api/places/${place.id}/status`, { status })
  } catch (err) {
    console.error('Failed to update place status:', err)
    alert(t('manage.place.err_toggle'))
  }
}

const addPlace = async () => {
  if (!formPlace.value.name || !formPlace.value.target) {
    alert(t('manage.place.err_required'))
    return
  }
  try {
    const res = await axios.post('http://localhost:3000/api/places', {
      name: formPlace.value.name,
      target: formPlace.value.target // 'ไทย' | 'ต่างชาติ'
    })
    placeList.value.push({
      id: res.data.place_ID,
      name: res.data.name,     // เก็บชื่อดิบตาม backend
      target: res.data.target, // 'ไทย' | 'ต่างชาติ'
      active: true
    })
    formPlace.value = { name: '', target: '' }
    dialogPlace.value = false
  } catch (err) {
    console.error('Failed to add place:', err)
    alert(t('manage.place.err_add'))
  }
}

onMounted(() => {
  fetchStaffList()
  fetchPlaceList()
})
</script>

<style scoped>
.v-table thead th { font-weight: bold; }
</style>
 