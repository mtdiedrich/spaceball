import { gsap } from 'gsap';

export function initScene1() {
    // Create timeline for sequential animations with initial delay
    const tl = gsap.timeline({ delay: 0.3 });
    
    tl.to('#scene-1 h1', {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power2.out'
    })
    .to('#scene-1 p:not(.scroll-prompt)', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out'
    }, '+=0.15')
    .to('#scene-1 .scroll-prompt', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out'
    }, '+=0.3');
}