<template>
  <Pie :data="chartData" :options="chartOptions" />
  <div class="admin-dashboard">

    <!-- 📅 ปุ่มปฏิทินตรงกลาง -->
    <div class="date-picker-container">
      <v-menu
        v-model="menu"
        :close-on-content-click="false"
        transition="scale-transition"
        offset-y
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            color="#009199"
            variant="outlined"
            prepend-icon="mdi-filter"
          >
            {{ formatDate(selectedDate) || "เลือกช่วงเวลา" }}
          </v-btn>
        </template>
        <v-date-picker
          v-model="selectedDate"
          :max="maxDate"
          @update:model-value="menu = false"
        />
      </v-menu>
    </div>

    <!-- 🔗 Pie Charts แนวนอน -->
    <div class="chart-row">
      <div class="chart-wrapper">
        <PieChart :selectedDate="selectedDate" />
      </div>
      <div class="chart-wrapper">
        <PieChart :selectedDate="selectedDate" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import PieChart from "./PieChart.vue";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

ChartJS.register(Title, Tooltip, Legend, ArcElement, ChartDataLabels)

const props = defineProps({
  selectedDate: String,
})

const selectedDate = ref(new Date().toISOString().substr(0, 10));
const maxDate = new Date().toISOString().substr(0, 10);
const menu = ref(false);

function formatDate(dateStr) {
  if (!dateStr) return "";
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateStr).toLocaleDateString("th-TH", options);
}
</script>

<style scoped>
.admin-dashboard {
  max-width: 1200px;
  margin: auto;
  padding: 2rem;
}

/* ปุ่มปฏิทินให้อยู่กลาง */
.date-picker-container {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

/* Chart เรียงแนวนอน */
.chart-row {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 2rem;
}

.chart-wrapper {
  flex: 1 1 45%;
  min-width: 300px;
  height: 400px;
}
</style>
