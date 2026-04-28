async function loadPersonTable() {
  const res  = await fetch(`/api/reports/by-person?days=${activeDays}`);
  const data = await res.json();
  const tbody = document.getElementById('personTableBody');

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No data for this period.</td></tr>';
    return;
  }

  const max = data[0].count;
  tbody.innerHTML = data.map((p, i) => `
    <tr>
      <td class="rank-cell">${i + 1}</td>
      <td>${escapeHtml(p.user_name)}</td>
      <td>${escapeHtml(p.department)}</td>
      <td>${escapeHtml(p.unit)}</td>
      <td>
        <div class="bar-cell">
          <div class="bar-track">
            <div class="bar-fill" style="width:${Math.round((p.count / max) * 100)}%"></div>
          </div>
          <span class="bar-label">${p.count}</span>
        </div>
      </td>
    </tr>
  `).join('');
}
