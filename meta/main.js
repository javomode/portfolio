import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// ===== GLOBAL LAYOUT =====
const svgWidth = 800;
const svgHeight = 400;
const margin = { top: 20, right: 20, bottom: 40, left: 60 };
const usableArea = {
    left: margin.left,
    right: svgWidth - margin.right,
    top: margin.top,
    bottom: svgHeight - margin.bottom
};

// ===== DATA LOADING =====
async function loadData() {
    const data = await d3.csv('loc.csv', row => ({
        ...row,
        line: +row.line,
        depth: +row.depth,
        length: +row.length,
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime)
    }));
    return data;
}

// ===== PROCESS COMMITS =====
function processCommits(data) {
    return d3.groups(data, d => d.commit).map(([commit, lines]) => {
        const first = lines[0];
        const { author, date, time, timezone, datetime } = first;
        const ret = {
            id: commit,
            url: `https://github.com/vis-society/lab-7/commit/${commit}`,
            author,
            date,
            time,
            timezone,
            datetime,
            hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
            totalLines: lines.length,
        };
        Object.defineProperty(ret, 'lines', {
            value: lines,
            enumerable: false,
            writable: false,
            configurable: false
        });
        return ret;
    });
}

// ===== RENDER STATS (updated for filtered commits) =====
function renderCommitInfo(commits) {
    const dl = d3.select('#stats');
    dl.html(''); // clear previous stats

    if (!commits || commits.length === 0) return;

    const firstDate = d3.min(commits, d => d.datetime);

    const hourCounts = d3.rollup(
        commits,
        v => v.length,
        d => d.datetime.getHours()
    );
    const [activeHour] = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0];

    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(commits.reduce((acc, c) => acc + c.totalLines, 0));

    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    dl.append('dt').text('First commit');
    dl.append('dd').text(firstDate.toLocaleDateString());

    dl.append('dt').text('Most active hour');
    dl.append('dd').text(`${activeHour}:00`);
}

// ===== SCATTER PLOT =====
function renderScatterPlot(commits) {
    const width = svgWidth;
    const height = svgHeight;
    const container = d3.select('#chart');
    let svg = container.select('svg#scatter-svg');

    if (svg.empty()) {
        svg = container.append('svg')
            .attr('id', 'scatter-svg')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .style('width', '100%')
            .style('height', 'auto');
    } else {
        svg.selectAll('*').remove();
    }

    const xScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    const rScale = d3.scaleSqrt()
        .domain(d3.extent(commits, d => d.totalLines))
        .range([2, 20]);

    svg.node().__scales__ = { xScale, yScale, rScale, usableArea };

    // AXES
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${usableArea.bottom})`)
        .call(d3.axisBottom(xScale));

    svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${usableArea.left},0)`)
        .call(d3.axisLeft(yScale).tickFormat(d => String(d).padStart(2, '0') + ':00'));

    // GRIDLINES
    svg.append("g")
        .attr("class", "y-grid grid")
        .attr("transform", `translate(${usableArea.left},0)`)
        .attr("opacity", 0.2)
        .call(d3.axisLeft(yScale)
            .tickSize(-(usableArea.right - usableArea.left))
            .tickFormat('')
        );

    // DOTS
    const dotsG = svg.append('g').attr('class', 'dots');
    dotsG.selectAll('circle')
        .data(commits, d => d.id)
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .attr('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).attr('fill-opacity', 1);
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).attr('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });

    // BRUSH
    const brush = d3.brushX()
        .extent([[usableArea.left, usableArea.top], [usableArea.right, usableArea.bottom]])
        .on('brush end', (event) => {
            const selection = event.selection;
            const dotsG = svg.select('g.dots');

            if (!selection) {
                dotsG.selectAll('circle').attr('fill', 'steelblue');
                updateBrushedInfo([]); // update only the summary at bottom
                return;
            }

            const [x0, x1] = selection.map(xScale.invert);
            const selected = commits.filter(d => d.datetime >= x0 && d.datetime <= x1);

            dotsG.selectAll('circle')
                .attr('fill', d => (selected.includes(d) ? 'orange' : 'steelblue'));

            updateBrushedInfo(selected); // only update bottom summary
            // REMOVE tooltip updates here — tooltip stays only on hover
        });


    svg.append('g').attr('class', 'brush').call(brush);
}

// ===== UPDATE DOTS =====
function updateScatterPlot(commits) {
    const svg = d3.select('#chart svg#scatter-svg');
    if (svg.empty()) return;

    const { xScale, yScale, rScale, usableArea } = svg.node().__scales__;
    xScale.domain(d3.extent(commits, d => d.datetime)).nice();

    svg.select('g.x-axis').call(d3.axisBottom(xScale));
    svg.select('g.y-axis').call(d3.axisLeft(yScale).tickFormat(d => String(d).padStart(2, '0') + ':00'));
    svg.select('g.y-grid').call(d3.axisLeft(yScale).tickSize(-(usableArea.right - usableArea.left)).tickFormat(''));

    const dotsG = svg.select('g.dots');
    dotsG.selectAll('circle')
        .data(commits, d => d.id)
        .join(
            enter => enter.append('circle')
                .attr('cx', d => xScale(d.datetime))
                .attr('cy', d => yScale(d.hourFrac))
                .attr("r", 0) // start from 0
                // .attr('r', d => rScale(d.totalLines))
                .attr('fill', 'steelblue')
                .attr('fill-opacity', 0.7)
                .on('mouseenter', (event, commit) => {
                    d3.select(event.currentTarget).attr('fill-opacity', 1);
                    renderTooltipContent(commit);
                    updateTooltipVisibility(true);
                    updateTooltipPosition(event);
                })
                .on('mouseleave', (event) => {
                    d3.select(event.currentTarget).attr('fill-opacity', 0.7);
                    updateTooltipVisibility(false);
                }),
            update => update
                .attr('cx', d => xScale(d.datetime))
                .attr('cy', d => yScale(d.hourFrac))
                .attr('r', d => rScale(d.totalLines))
                .attr('fill', 'steelblue')
                .attr('fill-opacity', 0.7),
            exit => exit.remove()
        );
}

// ===== TOOLTIP =====
function renderTooltipContent(commit) {
    const linkEl = document.getElementById('commit-link');
    const dateEl = document.getElementById('commit-date');
    const timeEl = document.getElementById('tooltip-commit-time');
    const authorEl = document.getElementById('commit-author');
    const linesEl = document.getElementById('commit-lines-edited');

    if (!commit) {
        [linkEl, dateEl, timeEl, authorEl, linesEl].forEach(el => {
            if (el) el.textContent = '';
            if (el === linkEl && el) el.href = '';
        });
        return;
    }

    if (linkEl) { linkEl.href = commit.url; linkEl.textContent = commit.id; }
    if (dateEl) dateEl.textContent = commit.datetime?.toLocaleDateString('en', { dateStyle: 'full' }) || '';
    if (timeEl) timeEl.textContent = commit.datetime?.toLocaleTimeString('en', { timeStyle: 'short' }) || '';
    if (authorEl) authorEl.textContent = commit.author || '';
    if (linesEl) linesEl.textContent = commit.totalLines ?? '';
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    if (tooltip) isVisible ? tooltip.removeAttribute('hidden') : tooltip.setAttribute('hidden', '');
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.pageX + 12}px`;
    tooltip.style.top = `${event.pageY + 12}px`;
}

// ===== SELECTION INFO =====
function updateBrushedInfo(selected) {
    const countEl = document.getElementById('selection-count');
    if (countEl) countEl.textContent = `${selected.length || 'No'} commits selected`;

    const breakdownContainer = document.getElementById('language-breakdown');
    if (!breakdownContainer) return;
    if (!selected || selected.length === 0) {
        breakdownContainer.innerHTML = '';
        return;
    }

    const lines = selected.flatMap(c => Array.isArray(c.lines) ? c.lines : []);
    const breakdown = d3.rollup(lines, v => v.length, d => d.type || 'Unknown');

    breakdownContainer.innerHTML = '';
    for (const [lang, count] of breakdown) {
        const pct = d3.format('.1~%')(count / (lines.length || 1));
        breakdownContainer.innerHTML += `<dt>${lang}</dt><dd>${count} lines (${pct})</dd>`;
    }
}

// ===== FILES RENDERING =====
function updateFiles(filteredCommits) {
    const container = d3.select('#files');
    container.html(''); // clear old content

    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    if (!filteredCommits || filteredCommits.length === 0) return;

    // Step 1: flatten lines and group by file
    const lines = filteredCommits.flatMap(d => d.lines).filter(d => d.file);
    let files = d3.groups(lines, d => d.file)
        .map(([name, lines]) => ({ name, lines }))
        .sort((a, b) => b.lines.length - a.lines.length);  // sort descending by line count

    // Step 2: bind files to divs
    const filesContainer = container.selectAll('div')
        .data(files, d => d.name)
        .join(
            enter => enter.append('div')
                .style('margin-bottom', '0.5em')
                .call(div => {
                    div.append('dt');
                    div.append('dd');
                })
        );


    // Step 3: add filename and line count stacked
    filesContainer.select('dt')
        .html('') // clear previous
        .append('div')   // stack container
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .call(div => {
            div.append('code').text(d => d.name);
            div.append('small')
                .text(d => `${d.lines.length} lines`)
                .style('opacity', 0.6)
                .style('font-size', '0.8em');
        });

    // Step 4: add the per-line dots inside <dd>
    filesContainer.select('dd')
        .selectAll('div.loc')
        .data(d => d.lines)
        .join('div')
        .attr('class', 'loc')
        .attr('style', (d) => `--color: ${colors(d.type)}`);
}

// ===== MAIN =====
(async () => {
    const data = await loadData();
    const commits = processCommits(data);

    // Outer-scoped variable for filtered commits
    let filtered = commits;

    renderCommitInfo(filtered);
    renderScatterPlot(filtered);

    const commitSlider = document.getElementById('commit-progress');
    const commitTimeDisplay = document.getElementById('commit-time');

    const timeScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([0, 100]);

    function onTimeSliderChange() {
        const progress = +commitSlider.value;
        const maxTime = timeScale.invert(progress);
        commitTimeDisplay.textContent = maxTime.toLocaleString();

        filtered = commits.filter(d => d.datetime <= maxTime);
        updateScatterPlot(filtered);
        renderCommitInfo(filtered);
        updateFiles(filtered); // update your files here
    }

    commitSlider.addEventListener('input', onTimeSliderChange);
    onTimeSliderChange();

})();

