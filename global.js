console.log("IT’S ALIVE!");

// Nav, color scheme, form handling — runs automatically
export function initGlobal() {
  function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }

  // Detect if running on GitHub Pages
  const isGithubPages = window.location.hostname.includes("github.io");
  const repo = "portfolio";

  // Base path depending on environment
  const basePath = isGithubPages ? `/${repo}` : "";

  // Define pages
  let pages = [
    { url: `${basePath}/index.html`, title: "Home" },
    { url: `${basePath}/projects/`, title: "Projects" },
    { url: `${basePath}/resume/`, title: "Resume" },
    { url: `${basePath}/contact/`, title: "Contact" },
    { url: `${basePath}/meta/`, title: "Meta" },
    { url: "https://github.com/javomode", title: "GitHub", external: true },
  ];

  // create navbar if it doesn't exist
  if (!document.querySelector("nav")) {
    let nav = document.createElement("nav");
    document.body.prepend(nav);

    for (let p of pages) {
      let link = document.createElement("a");
      link.href = p.url;
      link.textContent = p.title;

      if (p.external) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      nav.appendChild(link);
    }
  }

  // highlight current page
  let navLinks = $$("nav a");
  let currentLink = navLinks.find(
    (a) => a.host === location.host && a.pathname === location.pathname
  );
  currentLink?.classList.add("current");

  // insert color scheme switcher if it doesn't exist
  if (!document.querySelector(".color-scheme")) {
    const colorSwitcherHTML = `
<label class="color-scheme">Theme:
  <select>
    <option value="light dark">Automatic</option>
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
</label>`;
    document.body.insertAdjacentHTML('afterbegin', colorSwitcherHTML);
  }

  const select = document.querySelector('.color-scheme select');

  function setColorScheme(theme) {
    if (theme === 'dark') {
      document.body.style.backgroundColor = '#111';
      document.body.style.color = '#eee';
    } else {
      document.body.style.backgroundColor = 'white';
      document.body.style.color = 'black';
    }
    select.value = theme;
    localStorage.colorScheme = theme;
  }

  // initialize theme
  if ('colorScheme' in localStorage) {
    setColorScheme(localStorage.colorScheme);
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setColorScheme(prefersDark ? 'dark' : 'light');
  }

  // event listener for dropdown
  select.addEventListener('input', (event) => {
    setColorScheme(event.target.value);
  });

  // email form
  const form = document.querySelector("form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = encodeURIComponent(data.get("name") || "");
    const email = encodeURIComponent(data.get("email") || "");
    const message = encodeURIComponent(data.get("message") || "");
    const subject = `Message from ${name}`;
    const body = `Name: ${name}%0AEmail: ${email}%0A%0A${message}`;
    window.location.href = `mailto:j9vo@ucsd.com?subject=${encodeURIComponent(subject)}&body=${body}`;
  });
}

// reusable functions
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    return await response.json();
  } catch (err) {
    console.error('Error fetching JSON:', err);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  containerElement.innerHTML = '';

  if (!projects || projects.length === 0) {
    containerElement.innerHTML = '<p>No projects found.</p>';
    return;
  }

  for (const project of projects) {
    const article = document.createElement('article');
    article.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <${headingLevel}>${project.title}</${headingLevel}>
        <small style="color: gray;">${project.year}</small>
      </div>
      <img src="${project.image}" alt="${project.title}">
      <p>${project.description}</p>
    `;
    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}
