// projects.js
import { fetchJSON, renderProjects, initGlobal } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Initialize global features
initGlobal();

// Fetch projects
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

// Select search bar
const searchInput = document.querySelector('.searchBar');

// SVG setup
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');

const width = 250;
const height = 250;
const radius = Math.min(width, height) / 2;

svg.attr('width', width).attr('height', height);

const g = svg.append('g')
  .attr('transform', `translate(${width / 2}, ${height / 2})`);

// 🔹 Consistent color mapping by year
const allYears = Array.from(new Set(projects.map(p => p.year)));
const colors = d3.scaleOrdinal(d3.schemeTableau10).domain(allYears);

// Arc & pie generators
const arcGen = d3.arc().innerRadius(0).outerRadius(radius);
const pieGen = d3.pie().value(d => d.value);

// Track selected year
let selectedYear = null;

// Utility: get projects filtered by search + pie slice
function getFilteredProjects() {
  const searchValue = searchInput.value.toLowerCase();
  let filtered = projects.filter(p =>
    p.title.toLowerCase().includes(searchValue)
  );

  if (selectedYear) {
    filtered = filtered.filter(p => p.year === selectedYear);
  }

  return filtered;
}

// Render projects, pie, and legend
function renderFilteredProjects() {
  const filtered = getFilteredProjects();
  renderProjects(filtered, projectsContainer, 'h2');

  // Recalculate pie data
  const pieData = Array.from(
    d3.rollups(filtered, v => v.length, d => d.year),
    ([year, count]) => ({ label: year, value: count })
  );

  const arcs = pieGen(pieData);

  // 🔹 Redraw pie slices with smooth transitions
  const paths = g.selectAll('path')
    .data(arcs, d => d.data.label); // key by year

  // ENTER + UPDATE + EXIT
  paths.join(
    enter => enter.append('path')
      .attr('fill', d => colors(d.data.label))
      .attr('d', arcGen)
      .attr('class', d => d.data.label === selectedYear ? 'selected' : '')
      .on('click', (_, d) => {
        selectedYear = selectedYear === d.data.label ? null : d.data.label;
        renderFilteredProjects();
      })
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1)
      .attrTween('d', function(d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return t => arcGen(i(t));
      }),
    update => update
      .transition()
      .duration(500)
      .attr('d', arcGen)
      .attr('fill', d => colors(d.data.label))
      .attr('class', d => d.data.label === selectedYear ? 'selected' : ''),
    exit => exit.transition().duration(300).style('opacity', 0).remove()
  );

  // Update legend
  renderLegend(filtered);
}

// Render legend based on filtered projects
function renderLegend(filteredProjects) {
  legend.selectAll('li').remove();

  const counts = d3.rollups(
    filteredProjects,
    v => v.length,
    d => d.year
  );

  const pieData = Array.from(
    d3.rollups(filteredProjects, v => v.length, d => d.year),
    ([year, count]) => ({ label: year, value: count })
  );

  pieData.forEach(d => {
    const count = counts.find(([year]) => year === d.label)?.[1] ?? 0;
    legend.append('li')
      .attr('style', `--color:${colors(d.label)}`)
      .attr('class', d.label === selectedYear ? 'selected' : '')
      .html(`<span class="swatch"></span> ${d.label} <em>(${count})</em>`)
      .on('click', () => {
        selectedYear = selectedYear === d.label ? null : d.label;
        renderFilteredProjects();
      });
  });
}

// Hook up search bar
searchInput.addEventListener('input', () => {
  renderFilteredProjects();
});

// Initial render
renderFilteredProjects();
