import { initScene1 } from './scene1.js';
import { initScene2 } from './scene2.js';
initScene1();
const scene2 = initScene2();
window.addEventListener('resize', () => {
    scene2.resize();
});
