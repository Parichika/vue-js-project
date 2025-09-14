<!-- src/views/AdminDashboard.vue -->
<template>
  <v-container class="py-6">
    <!-- Header -->
    <v-row>
      <v-col cols="12" class="d-flex justify-space-between align-center">
        <div class="d-flex align-center gap-2">
          <v-icon size="30" color="#009199" class="mr-2">mdi-chart-bar</v-icon>
          <h1 class="text-h5 font-weight-bold">{{ t('dashboard.title') }}</h1>
        </div>

        <!-- Date Range Picker -->
        <v-menu v-model="menu" :close-on-content-click="false" transition="scale-transition" offset-y min-width="auto">
          <template #activator="{ props }">
            <v-text-field
              v-model="dateRangeText"
              :label="t('dashboard.pick_range')"
              prepend-icon="mdi-calendar"
              readonly
              clearable
              @click:clear="clearRange"
              v-bind="props"
              variant="outlined"
              density="comfortable"
              color="#009199"
              style="max-width: 260px;"
            />
          </template>

          <!-- ไฮไลต์ช่วง -->
          <v-date-picker
            v-model="dateRangeArr"
            multiple="range"
            :max="today"
            color="#009199"
            @update:model-value="onDateRangeChange"
          />
        </v-menu>
      </v-col>
    </v-row>

    <!-- Summary Cards -->
    <v-row class="d-flex flex-wrap justify-center" style="gap: 24px;">
      <div v-for="(item, index) in summaryCards" :key="index" style="width: 220px;">
        <v-card class="pa-4 text-center" :style="{ backgroundColor: item.color }">
          <div class="caption d-flex align-center justify-center mb-1">
            <v-icon size="20" color="white" class="mr-1">{{ item.icon }}</v-icon>
            <span style="color: white !important;">{{ item.label }}</span>
          </div>
          <div class="text-h4 font-weight-bold" style="color: white;">
            {{ item.value }}
          </div>
        </v-card>
      </div>
    </v-row>

    <!-- Bar Charts: type totals & completed -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card class="pa-4">
          <div class="d-flex align-center mb-2">
            <v-icon size="20" color="#009199" class="mr-2">mdi-folder-multiple</v-icon>
            <h3 class="subtitle-1 mb-0">{{ t('dashboard.chart_type_all') }}</h3>
          </div>
          <Bar :data="barChartServiceTypeData" :options="barChartOptions" style="height:300px" />
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card class="pa-4">
          <div class="d-flex align-center mb-2">
            <v-icon size="20" color="#009199" class="mr-2">mdi-check-circle</v-icon>
            <h3 class="subtitle-1 mb-0">{{ t('dashboard.chart_type_completed') }}</h3>
          </div>
          <Bar :data="barChartCompletedTypeData" :options="barChartOptions" style="height:300px" />
        </v-card>
      </v-col>
    </v-row>

    <!-- Bar Charts by day/time -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card class="pa-4">
          <h3 class="subtitle-1 mb-2">{{ t('dashboard.chart_by_day') }}</h3>
          <Bar :data="barChartDayData" :options="barChartOptions" style="height:300px" />
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card class="pa-4">
          <h3 class="subtitle-1 mb-2">{{ t('dashboard.chart_by_time') }}</h3>
          <Bar :data="barChartTimeData" :options="barChartOptions" style="height:300px" />
        </v-card>
      </v-col>
    </v-row>

    <!-- NEW: By Year -->
<v-row>
  <v-col cols="12" md="12">
    <v-card class="pa-4">
      <div class="d-flex align-center mb-2">
        <h3 class="subtitle-1 mb-0">{{ t('dashboard.chart_year') }}</h3>
      </div>
      <Bar :data="barChartYearData" :options="barChartOptions" style="height:300px" />
    </v-card>
  </v-col>
</v-row>


    <!-- By Faculty -->
    <v-row>
      <v-col cols="12" md="12">
        <v-card class="pa-4">
          <div class="d-flex align-center mb-2">
            <h3 class="subtitle-1 mb-0">{{ t('dashboard.chart_faculty') }}</h3>
          </div>
          <!-- ใช้ barChartOptions เหมือนกราฟอื่นๆ และคงความสูง 400px -->
          <Bar :data="barChartFacultyData" :options="barChartOptions" style="height:400px" />
        </v-card>
      </v-col>
    </v-row>

  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import { Bar } from 'vue-chartjs'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend, CategoryScale, LinearScale, BarElement
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, CategoryScale, LinearScale, BarElement, ChartDataLabels)

const { t, locale } = useI18n()

// date range picker state
const menu = ref(false)
const dateRangeArr = ref([]) // ['YYYY-MM-DD','YYYY-MM-DD']
const today = new Date().toISOString().slice(0, 10)

const fmtTH = d => new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtEN = d => new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
const dateRangeText = computed(() => {
  if (dateRangeArr.value.length !== 2) return ''
  const [s, e] = [...dateRangeArr.value].sort()
  const fmt = locale.value === 'th' ? fmtTH : fmtEN
  return `${fmt(s)} – ${fmt(e)}`
})

const clearRange = () => {
  dateRangeArr.value = []
  loadDashboardData()
}

const onDateRangeChange = (val) => {
  if (!val || val.length < 2) return
  const [start, end] = [...val].sort()
  dateRangeArr.value = [start, end]
  menu.value = false
  loadDashboardData(start, end)
}

// ================= API =================
const dashboardData = ref({
  summary: {},
  serviceTypes: [],
  byDay: [],
  byTime: [],
  byFaculty: [], // [{ faculty: 'วิศวกรรมศาสตร์', count: 12 }]
  byYear: []     // [{ year: 1, count: 30 }, ...]
})

const loadDashboardData = async (startDate, endDate) => {
  try {
    const res = await axios.get('http://localhost:3000/api/dashboard', {
      params: { startDate: startDate ?? null, endDate: endDate ?? null }
    })
    dashboardData.value = res.data
  } catch (err) {
    console.error('❌ load dashboard failed:', err)
  }
}

onMounted(() => loadDashboardData())

// ===== service type helpers =====
function serviceKeyFromName(name = '') {
  const n = name.toLowerCase()
  if (/(ชีวิต|ปรับตัว|life|adjust)/.test(n)) return 'life'
  if (/(เรียน|academic|study)/.test(n)) return 'study'
  if (/(สุขภาพจิต|emotion|mental)/.test(n)) return 'emotion'
  if (/(other|อื่น)/.test(n)) return 'other'
  return null
}
function labelFromKey(key, { short = false } = {}) {
  if (!key) return t('dashboard.unspecified')
  return short ? t(`dashboard.short_${key}`) : t(`appointment.${key}`)
}
function colorFromKey(key) {
  const map = {
    life: '#81C784',
    study: '#64B5F6',
    emotion: '#E57373',
    other: '#FFD54F'
  }
  return map[key] || '#ccc'
}

// ===== summary card info =====
const summaryCards = computed(() => [
  { label: t('dashboard.card_total'), icon: 'mdi-clipboard-list', color: '#009199', value: dashboardData.value.summary.total || 0 },
  { label: t('dashboard.card_pending'), icon: 'mdi-timer-sand', color: '#F57C00', value: dashboardData.value.summary.pending || 0 },
  { label: t('dashboard.card_approved'), icon: 'mdi-check-circle', color: 'green', value: dashboardData.value.summary.approved || 0 },
  { label: t('dashboard.card_completed'), icon: 'mdi-check-decagram', color: '#2196F3', value: dashboardData.value.summary.completed || 0 },
  { label: t('dashboard.card_rejected'), icon: 'mdi-close-circle', color: 'red', value: dashboardData.value.summary.rejected || 0 },
  { label: t('dashboard.card_cancelled'), icon: 'mdi-cancel', color: 'grey', value: dashboardData.value.summary.cancelled || 0 }
])

// ===== Charts: Service Types =====
const barChartCompletedTypeData = computed(() => {
  const items = dashboardData.value.serviceTypes || []
  return {
    labels: items.map(i => labelFromKey(serviceKeyFromName(i.service_type), { short: true })),
    datasets: [{
      label: t('dashboard.ds_completed'),
      backgroundColor: items.map(i => colorFromKey(serviceKeyFromName(i.service_type))),
      data: items.map(i => i.countCompleted || 0)
    }]
  }
})
const barChartServiceTypeData = computed(() => {
  const items = dashboardData.value.serviceTypes || []
  return {
    labels: items.map(i => labelFromKey(serviceKeyFromName(i.service_type), { short: true })),
    datasets: [{
      label: t('dashboard.ds_total'),
      backgroundColor: items.map(i => colorFromKey(serviceKeyFromName(i.service_type))),
      data: items.map(i => i.count || 0)
    }]
  }
})

// ===== Charts: by day =====
const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const dayI18n = (en) => t(`dashboard.day_${en.toLowerCase()}`)
const barChartDayData = computed(() => {
  const map = Object.fromEntries((dashboardData.value.byDay || []).map(i => [i.day, i.count]))
  const pastel = ['#FFF176', '#F8BBD0', '#AED581', '#FFCC80', '#90CAF9', '#CE93D8', '#EF9A9A']
  return {
    labels: dayOrder.map(d => dayI18n(d)),
    datasets: [{
      label: t('dashboard.ds_created'),
      backgroundColor: pastel,
      data: dayOrder.map(d => map[d] || 0)
    }]
  }
})

// ===== Charts: by time =====
const fixedTimeSlots = [
  '09:00–10:30',
  '10:30–12:00',
  '13:00–14:30',
  '14:30–16:00'
]
const barChartTimeData = computed(() => {
  const timeMap = Object.fromEntries(
    (dashboardData.value.byTime || []).map(i => [
      i.time.trim().replaceAll(' ', '').replaceAll('-', '–'),
      i.count
    ])
  )
  const colors = ['#FFECB3', '#B3E5FC', '#C8E6C9', '#D1C4E9']
  return {
    labels: fixedTimeSlots,
    datasets: [{
      label: t('dashboard.ds_created'),
      backgroundColor: colors,
      data: fixedTimeSlots.map(time => timeMap[time] || 0)
    }]
  }
})

// ===== By Faculty =====
const facultyPalette = ['#A5D6A7', '#81D4FA', '#FFAB91', '#CE93D8', '#FFF59D', '#B39DDB', '#80CBC4', '#F48FB1', '#FFE082', '#C5E1A5', '#B2EBF2', '#FFCDD2', '#D1C4E9', '#DCEDC8', '#FFECB3']

const FACULTY_ORDER_TH = [
  'สำนักวิชาศิลปศาสตร์',
  'สำนักวิชาวิทยาศาสตร์',
  'สำนักวิชาการจัดการ',
  'สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์',
  'สำนักวิชาอุตสาหกรรมเกษตร',
  'สำนักวิชานิติศาสตร์',
  'สำนักวิชาวิทยาศาสตร์เครื่องสำอาง',
  'สำนักวิชาวิทยาศาสตร์สุขภาพ',
  'สำนักวิชาพยาบาลศาสตร์',
  'สำนักวิชาเวชศาสตร์ชะลอวัยและฟื้นฟูสุขภาพ',
  'สำนักวิชาแพทยศาสตร์',
  'สำนักวิชาทันตแพทยศาสตร์',
  'สำนักวิชานวัตกรรมสังคม',
  'สำนักวิชาจีนวิทยา',
  'สำนักวิชาการแพทย์บูรณาการ'
]
const FACULTY_ORDER_EN = [
  'School of Liberal Arts',
  'School of Science',
  'School of Management',
  'School of Applied Digital Technology',
  'School of Agro-Industry',
  'School of Law',
  'School of Cosmetic Science',
  'School of Health Science',
  'School of Nursing',
  'School of Anti-Aging and Regenerative Medicine',
  'School of Medicine',
  'School of Dentistry',
  'School of Social Innovation',
  'School of Chinese Studies',
  'School of Integrative Medicine'
]

const barChartFacultyData = computed(() => {
  const rows = dashboardData.value.byFaculty || []

  const countMap = {}
  rows.forEach(r => {
    const th = r.faculty_th || r.faculty_name || r.faculty || r.name
    const en = r.faculty_en
    const key = locale.value === 'th' ? (th || en) : (en || th)
    if (!key) return
    countMap[key] = (countMap[key] || 0) + (r.count || 0)
  })

  const labels = locale.value === 'th' ? FACULTY_ORDER_TH : FACULTY_ORDER_EN
  const data = labels.map(lbl => countMap[lbl] || 0)

  return {
    labels,
    datasets: [{
      label: t('dashboard.ds_created'),
      backgroundColor: labels.map((_, idx) => facultyPalette[idx % facultyPalette.length]),
      data
    }]
  }
})

// ===== By Year (1-4) =====
const YEAR_ORDER = [1, 2, 3, 4]
const yearLabel = (y) => t(`dashboard.year_${y}`)
const barChartYearData = computed(() => {
  const map = Object.fromEntries((dashboardData.value.byYear || []).map(i => [Number(i.year), i.count]))
  const colors = ['#BBDEFB', '#C8E6C9', '#FFE082', '#F48FB1']
  return {
    labels: YEAR_ORDER.map(y => yearLabel(y)),
    datasets: [{
      label: t('dashboard.ds_created'),
      backgroundColor: colors,
      data: YEAR_ORDER.map(y => map[y] || 0)
    }]
  }
})

// ===== chart options =====
const barChartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    datalabels: {
      display: true,
      color: '#000',
      anchor: 'end',
      align: 'end',
      offset: 6,
      font: { weight: 'bold', size: 14 },
      formatter: v => v
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { precision: 0 },
      afterDataLimits: (scale) => { scale.max += 1 }
    }
  }
}
</script>

<style scoped>
.text-right {
  text-align: right;
}
</style>
