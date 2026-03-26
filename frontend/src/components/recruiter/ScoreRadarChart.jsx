import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip,
} from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

export default function ScoreRadarChart({ scores }) {
  if (!scores) return null;

  const data = {
    labels: ['Technical', 'Communication', 'Depth', 'Consistency'],
    datasets: [
      {
        label: 'Score',
        data: [
          scores.technical || 0,
          scores.communication || 0,
          scores.depth || 0,
          scores.consistency || 0,
        ],
        backgroundColor: 'rgba(115, 83, 246, 0.15)',
        borderColor: '#7353F6',
        borderWidth: 2,
        pointBackgroundColor: '#7353F6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          font: { family: 'Montserrat', size: 10 },
          color: '#6b6b80',
          backdropColor: 'transparent',
        },
        pointLabels: {
          font: { family: 'Montserrat', size: 12, weight: '600' },
          color: '#a0a0b0',
        },
        grid: { color: 'rgba(255,255,255,0.06)' },
        angleLines: { color: 'rgba(255,255,255,0.06)' },
      },
    },
  };

  return <Radar data={data} options={options} />;
}
