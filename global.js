console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: "/", title: "Home" },
  { url: "/projects/", title: "Projects" },
  { url: "/resume/", title: "Resume" },
  { url: "/contact/", title: "Contact" },
];

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let link = document.createElement("a");
  link.href = p.url;
  link.textContent = p.title;
  nav.appendChild(link);
}

// highlight current page
let navLinks = $$("nav a");
let currentLink = navLinks.find(
  (a) => a.host === location.host && a.pathname === location.pathname
);
currentLink?.classList.add("current");

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
