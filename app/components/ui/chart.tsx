import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions, ChartData } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Default chart options
const defaultLineOptions: ChartOptions<'line'> = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
};

const defaultBarOptions: ChartOptions<'bar'> = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
};

// Line Chart Component
export const LineChart = ({
  data,
  options = {},
}: {
  data: ChartData<'line'>;
  options?: ChartOptions<'line'>;
}) => {
  const mergedOptions = { ...defaultLineOptions, ...options };
  return <Line data={data} options={mergedOptions} />;
};

// Bar Chart Component
export const BarChart = ({
  data,
  options = {},
}: {
  data: ChartData<'bar'>;
  options?: ChartOptions<'bar'>;
}) => {
  const mergedOptions = { ...defaultBarOptions, ...options };
  return <Bar data={data} options={mergedOptions} />;
};
