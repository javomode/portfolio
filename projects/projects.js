// projects.js
import { fetchJSON, renderProjects, initGlobal } from '../global.js';

// initialize navbar, color scheme, and form handling
initGlobal();

// fetch and render projects
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');
