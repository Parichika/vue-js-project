<template>
  <div class="chart-container">
    <Pie :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { Pie } from "vue-chartjs";

ChartJS.register(Title, Tooltip, Legend, ArcElement);

const chartData = {
  labels: [
    "ปรึกษาด้านการเรียน",
    "ระบายความรู้สึกต่าง ๆ",
    "ปรึกษาด้านการใช้ชีวิตและสุขภาพจิต",
  ],
  datasets: [
    {
      backgroundColor: ["#f5bebe", "#b7edc1", "#f3e5b5"],
      data: [28, 32, 34],
    },
  ],
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false, // ✅ สำคัญมากสำหรับความยืดหยุ่น
  plugins: {
    legend: {
      position: "right",
    },
    tooltip: {
      callbacks: {
        label: function (context) {
          return `${context.label} : ${context.raw} %`;
        },
      },
    },
  },
};
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  max-width: 600px;
  height: 400px;
  margin: auto;
}
</style>
