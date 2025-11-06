import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: +row.line,
        depth: +row.depth,
        length: +row.length,
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
    return data;
}

function processCommits(data) {
    return d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            const first = lines[0];
            const { author, date, time, timezone, datetime } = first;
            const ret = {
                id: commit,
                url: 'https://github.com/vis-society/lab-7/commit/' + commit,
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

function renderCommitInfo(data, commits) {
    // USE THE EXISTING DL (#stats) instead of appending a new one
    const dl = d3.select('#stats');

    const firstDate = d3.min(commits, d => d.datetime);

    const hourCounts = d3.rollup(
        commits,
        v => v.length,
        d => d.datetime.getHours()
    );
    const [activeHour] = Array.from(hourCounts.entries())
        .sort((a, b) => b[1] - a[1])[0];

    // append stats as dt/dd pairs
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    dl.append('dt').text('First commit');
    dl.append('dd').text(firstDate.toLocaleDateString());

    dl.append('dt').text('Most active hour');
    dl.append('dd').text(`${activeHour}:00`);
}

// async wrapper for top-level await
(async () => {
    const data = await loadData();
    const commits = processCommits(data);
    renderCommitInfo(data, commits);
})();

function renderScatterPlot(data, commits) {
    // Put all the JS code of Steps inside this function
    const width = 1000;
    const height = 600;
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible')

    const xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([0, width])
        .nice();

    const yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

    const dots = svg.append('g').attr('class', 'dots');

    const tooltip = d3.select('#commit-tooltip');

    const margin = { top: 10, right: 10, bottom: 30, left: 20 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    // Update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    dots.selectAll('circle')
        .data(commits)
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', 5)
        .attr('fill', 'steelblue')
        .on('mouseenter', (event, commit) => {
            renderTooltipContent(commit);
            tooltip.style('opacity', 1);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', () => {
            tooltip.style('opacity', 0);
            updateTooltipVisibility(false);
        });

    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    // Add X axis
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    // Add Y axis
    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    // Add gridlines BEFORE the axes
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .attr('opacity', 0.2);


    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
}

let data = await loadData();
let commits = processCommits(data);

renderScatterPlot(data, commits);

function renderTooltipContent(commit) {
    if (!commit) return;

    const linkEl = document.getElementById('commit-link');
    const dateEl = document.getElementById('commit-date');
    const timeEl = document.getElementById('commit-time');
    const authorEl = document.getElementById('commit-author');
    const linesEl = document.getElementById('commit-lines-edited');

    linkEl.href = commit.url;
    linkEl.textContent = commit.id;

    dateEl.textContent = commit.datetime?.toLocaleDateString('en', { dateStyle: 'full' });
    timeEl.textContent = commit.datetime?.toLocaleTimeString('en', { timeStyle: 'short' });

    authorEl.textContent = commit.author;
    linesEl.textContent = commit.totalLines;
}


function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}