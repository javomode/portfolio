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
