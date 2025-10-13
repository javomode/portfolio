console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "resume/", title: "Resume" },
  { url: "contact/", title: "Contact" },
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

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/website/";         // GitHub Pages repo name
  if (!url.startsWith('http')) {
  url = !url.startsWith('http') ? BASE_PATH + url : url;
}
