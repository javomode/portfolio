import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
    const data = await d3.csv('loc.csv', row => ({
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
    return d3.groups(data, d => d.commit).map(([commit, lines]) => {
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
    const dl = d3.select('#stats');
    const firstDate = d3.min(commits, d => d.datetime);

    const hourCounts = d3.rollup(
        commits,
        v => v.length,
        d => d.datetime.getHours()
    );
    const [activeHour] = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0];

    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    dl.append('dt').text('First commit');
    dl.append('dd').text(firstDate.toLocaleDateString());

    dl.append('dt').text('Most active hour');
    dl.append('dd').text(`${activeHour}:00`);
}

function renderScatterPlot(commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };

    const svg = d3.select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    const usableArea = {
        left: margin.left,
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom
    };

    const xScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

    const dots = svg.append('g').attr('class', 'dots');

    const tooltip = d3.select('#commit-tooltip');

    // Circles
    dots.selectAll('circle')
        .data(commits)
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .attr('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            renderTooltipContent(commit);
            tooltip.style('opacity', 1);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            tooltip.style('opacity', 0);
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });

    // Axes
    svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(d3.axisBottom(xScale));

    svg.append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(d3.axisLeft(yScale).tickFormat(d => String(d % 24).padStart(2, '0') + ':00'));

    // Gridlines
    svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .attr('opacity', 0.2)
        .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    // BRUSH
    const brush = d3.brush()
        .extent([[usableArea.left, usableArea.top], [usableArea.right, usableArea.bottom]])
        .on('brush end', brushed);

    const brushGroup = svg.append('g')
        .attr('class', 'brush')
        .call(brush);

    // Raise the dots above the brush so circles remain interactive
    svg.select('.dots').raise();

    function brushed(event) {
        const selection = event.selection;
        d3.selectAll('circle').classed('selected', d => isCommitSelected(selection, d));
        renderSelectionCount(selection);
        renderLanguageBreakdown(selection);
    }

    function isCommitSelected(selection, commit) {
        if (!selection) return false;
        const [[x0, y0], [x1, y1]] = selection;
        const cx = xScale(commit.datetime);
        const cy = yScale(commit.hourFrac);
        return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
    }

    function renderSelectionCount(selection) {
        const selectedCommits = selection
            ? commits.filter(d => isCommitSelected(selection, d))
            : [];
        const countElement = document.querySelector('#selection-count');
        countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
        return selectedCommits;
    }

    function renderLanguageBreakdown(selection) {
        const selectedCommits = selection
            ? commits.filter(d => isCommitSelected(selection, d))
            : [];
        const container = document.getElementById('language-breakdown');
        if (!container) return;
        if (selectedCommits.length === 0) {
            container.innerHTML = '';
            return;
        }

        const lines = selectedCommits.flatMap(d => d.lines);
        const breakdown = d3.rollup(lines, v => v.length, d => d.type);

        container.innerHTML = '';
        for (const [language, count] of breakdown) {
            const proportion = count / lines.length;
            const formatted = d3.format('.1~%')(proportion);
            container.innerHTML += `<dt>${language}</dt><dd>${count} lines (${formatted})</dd>`;
        }
    }
}

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
    if (isVisible) tooltip.removeAttribute('hidden');
    else tooltip.setAttribute('hidden', '');
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.pageX + 12}px`;
    tooltip.style.top = `${event.pageY + 12}px`;
}

// MAIN EXECUTION
(async () => {
    const data = await loadData();
    const commits = processCommits(data);
    renderCommitInfo(data, commits);
    renderScatterPlot(commits);
})();
