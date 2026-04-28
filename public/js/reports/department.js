async function loadDept() {
  const res  = await fetch(`/api/reports/by-department?days=${activeDays}`);
  const data = await res.json();
  const palette = ['#059669', '#0d9488', '#0284c7', '#7c3aed', '#db2777', '#d97706'];

  if (deptChart) deptChart.destroy();
  deptChart = new Chart(document.getElementById('deptChart'), {
    type: 'bar',
    data: {
      labels: data.map(d => d.department),
      datasets: [{
        label: 'Scans',
        data: data.map(d => d.count),
        backgroundColor: data.map((_, i) => palette[i % palette.length]),
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
        y: { grid: { display: false } }
      }
    }
  });
}
