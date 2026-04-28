async function loadPersonTable() {
  const res  = await fetch(`/api/reports/by-person?days=${activeDays}`);
  const data = await res.json();
  const tbody = document.getElementById('personTableBody');
  const summary = document.getElementById('complianceSummary');

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No data for this period.</td></tr>';
    summary.textContent = '';
    return;
  }

  const expected = dailyTarget * activeDays;

  const withCompliance = data.map(p => ({
    ...p,
    compliance: Math.min(100, Math.round((p.count / expected) * 100))
  })).sort((a, b) => b.count - a.count); // most scans first

  const avgCompliance = Math.round(
    withCompliance.reduce((s, p) => s + p.compliance, 0) / withCompliance.length
  );

  summary.innerHTML = `
    <span class="compliance-stat">
      Overall compliance:
      <span class="compliance-badge ${badgeClass(avgCompliance)}">${avgCompliance}%</span>
    </span>
    <span class="compliance-meta">
      Target: ${dailyTarget} washes/person/day &nbsp;·&nbsp; ${withCompliance.length} active staff
    </span>
  `;

  const max = Math.max(...withCompliance.map(p => p.count));
  tbody.innerHTML = withCompliance.map((p, i) => `
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
      <td><span class="compliance-badge ${badgeClass(p.compliance)}">${p.compliance}%</span></td>
    </tr>
  `).join('');
}

function badgeClass(pct) {
  if (pct >= 80) return 'badge-green';
  if (pct >= 50) return 'badge-amber';
  return 'badge-red';
}
