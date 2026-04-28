async function loadTrend() {
  if (trendChart) trendChart.destroy();

  if (activeDays === 1) {
    await loadTodayByHour();
  } else {
    await loadScansOverTime();
  }
}

async function loadTodayByHour() {
  document.getElementById('trendTitle').textContent = 'Scans by Hour — Today';

  const res  = await fetch('/api/reports/heatmap?days=1');
  const raw  = await res.json();

  const hourCounts = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: raw.filter(d => d.hour === h).reduce((s, d) => s + d.count, 0)
  }));

  const colors = hourCounts.map(d =>
    (d.hour >= 22 || d.hour < 6) ? 'rgba(59,130,246,0.75)'
    : d.hour < 14                ? 'rgba(5,150,105,0.75)'
                                 : 'rgba(245,158,11,0.75)'
  );

  trendChart = new Chart(document.getElementById('trendChart'), {
    type: 'bar',
    data: {
      labels: hourCounts.map(d => hourLabel(d.hour)),
      datasets: [{
        label: 'Scans',
        data: hourCounts.map(d => d.count),
        backgroundColor: colors,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: item => ` ${item.raw} scan${item.raw !== 1 ? 's' : ''}`,
          }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
        x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } }
      }
    }
  });
}

async function loadScansOverTime() {
  document.getElementById('trendTitle').textContent = 'Scans Over Time';

  const res  = await fetch(`/api/reports/trend?days=${activeDays}`);
  const raw  = await res.json();
  const data = fillDates(raw, activeDays);

  const labels = data.map(d => {
    const dt = new Date(d.date + 'T12:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  trendChart = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Scans',
        data: data.map(d => d.count),
        borderColor: '#059669',
        backgroundColor: 'rgba(5,150,105,0.08)',
        borderWidth: 2,
        pointRadius: activeDays <= 7 ? 4 : 2,
        pointBackgroundColor: '#059669',
        fill: true,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
        x: { grid: { display: false }, ticks: { maxTicksLimit: 14 } }
      }
    }
  });
}
