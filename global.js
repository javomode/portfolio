console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// let pages = [
//   { url: "/", title: "Home" },
//   { url: "/projects/", title: "Projects" },
//   { url: "/resume/", title: "Resume" },
//   { url: "/contact/", title: "Contact" },
//   { url: "https://github.com/javomode", title: "GitHub", external: true },
// ];

let repo = "portfolio";

let pages = [
  { url: `/${repo}/`, title: "Home" },
  { url: `/${repo}/projects/`, title: "Projects" },
  { url: `/${repo}/resume/`, title: "Resume" },
  { url: `/${repo}/contact/`, title: "Contact" },
  { url: "https://github.com/javomode", title: "GitHub", external: true },
];

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let link = document.createElement("a");
  link.href = p.url;
  link.textContent = p.title;

  // make external links open in new tab
  if (p.external) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  nav.appendChild(link);
}

// highlight current page (internal links only)
let navLinks = $$("nav a");
let currentLink = navLinks.find(
  (a) => a.host === location.host && a.pathname === location.pathname
);
currentLink?.classList.add("current");

// color scheme selector
document.body.insertAdjacentHTML(
  'afterbegin',
  `
	<label class="color-scheme">
		Theme:
		<select>
            <option value="light dark">Automatic</option>
			<option value="light">Light</option>
			<option value="dark">Dark</option>
		</select>
	</label>`,
);

const select = document.querySelector('.color-scheme select');

// apply color scheme and save to localStorage
function setColorScheme(theme) {
  document.documentElement.style.setProperty('color-scheme', theme);
  select.value = theme;
  localStorage.colorScheme = theme;
}

// page load: check localStorage or system preference
if ('colorScheme' in localStorage) {
  setColorScheme(localStorage.colorScheme);
} else {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setColorScheme(prefersDark ? 'dark' : 'light');
}

// handle user changes
select.addEventListener('input', (event) => {
  setColorScheme(event.target.value);
});


// handle email form submissions
const form = document.querySelector("form");

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(form);

  const name = encodeURIComponent(data.get("name") || "");
  const email = encodeURIComponent(data.get("email") || "");
  const message = encodeURIComponent(data.get("message") || "");

  const subject = `Message from ${name}`;
  const body = `Name: ${name}%0AEmail: ${email}%0A%0A${message}`;

  const mailto = `mailto:j9vo@ucsd.com?subject=${encodeURIComponent(subject)}&body=${body}`;

  window.location.href = mailto;
});
