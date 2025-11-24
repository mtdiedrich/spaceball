import * as d3 from 'd3';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initScene2() {
    const stickyItems = document.querySelectorAll('.sticky-item');
    
    // Hide all sticky items initially except Item 1
    gsap.set(stickyItems, { opacity: 0 });
    // Item 1 starts visible
    gsap.set(stickyItems[0], { opacity: 1 });
    
    // Keep parallax for middle layer only
    const middleLayer = document.querySelector('.layer-middle');
    
    if (middleLayer) {
        gsap.to(middleLayer, {
            y: -800,
            ease: 'none',
            scrollTrigger: {
                trigger: '#scene-2',
                start: 'top top',
                end: 'bottom bottom',
                scrub: true
            }
        });
    }
    
    // Only use content blocks with data-step as triggers
    const triggerBlocks = document.querySelectorAll('#scene-2 .content-block[data-step]');
    
    triggerBlocks.forEach((block) => {
        const stepIndex = parseInt(block.getAttribute('data-step') || '0');
        const stickyItem = document.querySelector(`.sticky-item[data-item="${stepIndex}"]`);
        
        if (!stickyItem) return;
        
        ScrollTrigger.create({
            trigger: block,
            start: 'top center',
            end: 'bottom center',
            onEnter: () => {
                // Hide all other items
                stickyItems.forEach(item => {
                    if (item !== stickyItem) {
                        gsap.to(item, { opacity: 0, duration: 0.5 });
                    }
                });
                // Show current item
                gsap.to(stickyItem, { opacity: 1, duration: 0.5 });
                
                triggerBlocks.forEach(b => b.classList.remove('is-active'));
                block.classList.add('is-active');
            },
            onLeaveBack: () => {
                // When leaving back (scrolling up past this trigger), show the previous item
                const prevIndex = stepIndex - 1;
                const prevItem = document.querySelector(`.sticky-item[data-item="${prevIndex}"]`);
                
                if (prevItem) {
                    stickyItems.forEach(item => {
                        if (item !== prevItem) {
                            gsap.to(item, { opacity: 0, duration: 0.5 });
                        }
                    });
                    gsap.to(prevItem, { opacity: 1, duration: 0.5 });
                }
            }
        });
    });
    
    return {
        resize: () => ScrollTrigger.refresh()
    };
}