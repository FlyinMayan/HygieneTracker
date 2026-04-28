async function loadHeatmap() {
  const res  = await fetch(`/api/reports/heatmap?days=${activeDays}`);
  const data = await res.json();

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const grid = {};
  data.forEach(d => { grid[`${d.day_of_week}-${d.hour}`] = d.count; });
  const maxCount = d3.max(data, d => d.count) || 1;

  const container = document.getElementById('heatmapContainer');
  container.innerHTML = '';

  const totalW = container.clientWidth || 420;
  const margin = { top: 16, right: 12, bottom: 28, left: 40 };
  const cellW  = Math.floor((totalW - margin.left - margin.right) / 7);
  const cellH  = 16;
  const svgH   = cellH * 24 + margin.top + margin.bottom;

  const svg = d3.select('#heatmapContainer')
    .append('svg')
    .attr('width', totalW)
    .attr('height', svgH)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const color = d3.scaleSequential()
    .domain([0, maxCount])
    .interpolator(d3.interpolate('#e8f5e9', '#047857'));

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const count = grid[`${day}-${hour}`] || 0;
      svg.append('rect')
        .attr('x', day * cellW)
        .attr('y', hour * cellH)
        .attr('width', cellW - 2)
        .attr('height', cellH - 2)
        .attr('rx', 2)
        .attr('fill', count === 0 ? '#f1f5f9' : color(count))
        .append('title')
        .text(`${dayLabels[day]} ${hourLabel(hour)}: ${count} scan${count !== 1 ? 's' : ''}`);
    }
  }

  svg.selectAll('.day-label')
    .data(dayLabels)
    .enter().append('text')
    .attr('x', (d, i) => i * cellW + cellW / 2 - 1)
    .attr('y', 24 * cellH + 18)
    .attr('text-anchor', 'middle')
    .attr('font-size', '11px')
    .attr('fill', '#6b7280')
    .text(d => d);

  [0, 6, 12, 18].forEach(h => {
    svg.append('text')
      .attr('x', -6)
      .attr('y', h * cellH + cellH / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('fill', '#6b7280')
      .text(hourLabel(h));
  });
}
