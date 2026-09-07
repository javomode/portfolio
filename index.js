import { fetchJSON, renderProjects, initGlobal } from './global.js';

// initialize nav, color scheme, forms
initGlobal();

// fetch projects and render first 3
const projects = await fetchJSON('./lib/projects.json');
const latestProjects = projects.slice(0, 3);

const projectsContainer = document.querySelector('.projects');
renderProjects(latestProjects, projectsContainer, 'h2');