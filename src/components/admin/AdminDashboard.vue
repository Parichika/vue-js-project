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

        <div class="filters">
          <v-text-field v-model="start" type="date" :max="today" :label="t('dashboard.start_date')"
            density="comfortable" variant="outlined" class="date-field" @keydown.enter="applyRange" />

          <div class="sep">–</div>

          <v-text-field v-model="end" type="date" :min="start || undefined" :max="today"
            :label="t('dashboard.end_date')" density="comfortable" variant="outlined" class="date-field"
            @keydown.enter="applyRange" />

          <v-btn color="primary" class="action ml-2" @click="applyRange">
            {{ t('dashboard.filter') }}
          </v-btn>

          <v-btn variant="tonal" color="black" class="action" @click="clearAll">
            {{ t('dashboard.clear') }}
          </v-btn>
        </div>
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
          <Bar :data="barChartFacultyData" :options="barChartOptions"
            :key="(locale === 'th' ? 'th' : 'en') + '-' + barChartFacultyData.labels.join('|')" style="height:400px" />
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

// ---- Date filter (Start/End) ----
const start = ref('')                // 'YYYY-MM-DD'
const end = ref('')                // 'YYYY-MM-DD'
const today = new Date().toISOString().slice(0, 10)

const canApply = computed(() => {
  if (!start.value && !end.value) return false
  if (start.value && end.value) return start.value <= end.value
  return Boolean(start.value) // อนุญาตวันเดียว
})

const applyRange = () => {
  if (!canApply.value) return
  const s = start.value
  const e = end.value || start.value
  loadDashboardData(s, e)
}

const clearAll = () => {
  start.value = ''
  end.value = ''
  loadDashboardData()
}

// ---- Data container ----
const dashboardData = ref({
  summary: {},
  serviceTypes: [],
  byDay: [],
  byTime: [],
  byFaculty: [],
  byYear: []
})

// ---- API ----
const loadDashboardData = async (startDate, endDate) => {
  try {
    const res = await axios.get('http://localhost:3000/api/dashboard', {
      params: { startDate: startDate ?? null, endDate: endDate ?? null, _: Date.now() },
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    })
    dashboardData.value = res.data ?? {
      summary: {}, serviceTypes: [], byDay: [], byTime: [], byFaculty: [], byYear: []
    }
  } catch (err) {
    console.error('❌ load dashboard failed:', err)
  }
}

onMounted(() => {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth()

  const toYMD = (dt) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`

  const first = new Date(y, m, 1)
  const todayLocal = d

  start.value = toYMD(first)
  end.value = toYMD(todayLocal)
  loadDashboardData(start.value, end.value)
})

// ---- Helpers for labels/colors ----
function serviceKeyFromName(name = '') {
  const n = name.toLowerCase()
  if (/(ชีวิต|ปรับตัว|life|adjust)/.test(n)) return 'life'
  if (/(เรียน|academic|study)/.test(n)) return 'study'
  if (/(สุขภาพจิต|emotion|mental)/.test(n)) return 'emotion'
  if (/(other|อื่น)/.test(n)) return 'other'
  return null
}

function labelFromKey(key, { short = false } = {}) {
  if (!key) return t('dashboard.unspecified') || '—'
  return short ? t(`dashboard.short_${key}`) : t(`appointment.${key}`)
}

function colorFromKey(key) {
  const map = { life: '#81C784', study: '#64B5F6', emotion: '#F48FB1', other: '#FFD54F' }
  return map[key] || '#E5E7EB'
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
  const pastel = ['#FFD54F', '#F48FB1', '#81C784', '#FFB74D', '#64B5F6', '#BA68C8', '#E57373']
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
  const colors = ['#FFD54F', '#4DB6AC', '#FFB74D', '#9575CD']
  return {
    labels: fixedTimeSlots,
    datasets: [{
      label: t('dashboard.ds_created'),
      backgroundColor: colors,
      data: fixedTimeSlots.map(time => timeMap[time] || 0)
    }]
  }
})

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

// Mapping สีประจำสำนักวิชา
const FACULTY_COLOR = {
  'สำนักวิชาศิลปศาสตร์': '#9E9E9E', // เทา
  'School of Liberal Arts': '#9E9E9E',

  'สำนักวิชาวิทยาศาสตร์': '#FFEB3B', // เหลือง
  'School of Science': '#FFEB3B',

  'สำนักวิชาการจัดการ': '#03A9F4', // ฟ้า
  'School of Management': '#03A9F4',

  'สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์': '#0D47A1', // น้ำเงินเข้ม
  'School of Applied Digital Technology': '#0D47A1',

  'สำนักวิชาอุตสาหกรรมเกษตร': '#E1BEE7', // ชมพูอ่อน
  'School of Agro-Industry': '#E1BEE7',

  'สำนักวิชานิติศาสตร์': '#FFFFFF', // ขาว
  'School of Law': '#FFFFFF',

  'สำนักวิชาวิทยาศาสตร์เครื่องสำอาง': '#E91E63', // ชมพูเข้ม
  'School of Cosmetic Science': '#E91E63',

  'สำนักวิชาวิทยาศาสตร์สุขภาพ': '#388E3C', // เขียว
  'School of Health Science': '#388E3C',

  'สำนักวิชาพยาบาลศาสตร์': '#FF5722', // ส้มเข้ม
  'School of Nursing': '#FF5722',

  'สำนักวิชาเวชศาสตร์ชะลอวัยและฟื้นฟูสุขภาพ': '#00695C', // เขียวเข้ม
  'School of Anti-Aging and Regenerative Medicine': '#00695C',

  'สำนักวิชาแพทยศาสตร์': '#2E7D32', // เขียวหม่น
  'School of Medicine': '#2E7D32',

  'สำนักวิชาทันตแพทยศาสตร์': '#673AB7', // ม่วงเข้ม
  'School of Dentistry': '#673AB7',

  'สำนักวิชานวัตกรรมสังคม': '#FBC02D', // เหลืองเข้ม
  'School of Social Innovation': '#FBC02D',

  'สำนักวิชาจีนวิทยา': '#D32F2F', // แดง
  'School of Chinese Studies': '#D32F2F',

  'สำนักวิชาการแพทย์บูรณาการ': '#0288D1', // ฟ้าอมเขียว
  'School of Integrative Medicine': '#0288D1'
}

// ===== By Faculty =====
const facultyPalette = [
  '#A5D6A7', '#81D4FA', '#FFAB91', '#CE93D8', '#FFF59D',
  '#B39DDB', '#80CBC4', '#F48FB1', '#FFE082', '#C5E1A5',
  '#B2EBF2', '#FFCDD2', '#D1C4E9', '#DCEDC8', '#FFECB3'
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

  const bg = labels.map((lbl, idx) =>
    FACULTY_COLOR[lbl] ?? facultyPalette[idx % facultyPalette.length]
  )
  // เส้นขอบเฉพาะแท่งสีขาว
  const borders = bg.map(c => (c.toUpperCase() === '#FFFFFF' ? '#BDBDBD' : 'rgba(0,0,0,0)'))

  return {
    labels,
    datasets: [{
      label: t('dashboard.ds_created'),
      data,
      backgroundColor: bg,
      borderColor: borders,
      borderWidth: 1
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

.filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.date-field :deep(.v-field) {
  height: 56px;
}

.sep {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  margin: 0 4px;
  font-size: 20px;
  color: #616161;
}

.action {
  height: 56px;
  padding: 0 20px;
  border-radius: 12px;
}
</style>