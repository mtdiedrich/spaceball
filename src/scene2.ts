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
    
    // Keep parallax for middle and front layers
    const middleLayer = document.querySelector('.layer-middle');
    const frontLayer = document.querySelector('.layer-front');
    
    if (middleLayer) {
        gsap.to(middleLayer, {
            y: -400,
            ease: 'none',
            scrollTrigger: {
                trigger: '#scene-2',
                start: 'top top',
                end: 'bottom bottom',
                scrub: true
            }
        });
    }
    
    if (frontLayer) {
        gsap.to(frontLayer, {
            y: -600,
            ease: 'none',
            scrollTrigger: {
                trigger: '#scene-2',
                start: 'top top',
                end: 'bottom bottom',
                scrub: true
            }
        });
    }
            
    // Pin the sticky content to match the background layer's sticky block duration
    const stickyBlock = document.querySelector('.sticky-block');
    const stickyContent = document.querySelector('.sticky-content');

    if (stickyBlock && stickyContent) {
        const scrollContent = document.querySelector('.layer-back .scroll-content') as HTMLElement;
        
        if (scrollContent) {
            ScrollTrigger.create({
                trigger: scrollContent,
                start: 'top top',
                end: () => {
                    // The sticky block is pinned for: scrollContent height - viewport height
                    // So it should unpin when we've scrolled that distance
                    const stickyDuration = scrollContent.offsetHeight - window.innerHeight;
                    return `top+=${stickyDuration} top`;
                },
                pin: stickyContent,
                pinSpacing: false
            });
        }
    }
    
    // Only use content blocks with data-step as triggers
    const triggerBlocks = document.querySelectorAll('#scene-2 .content-block[data-step]');
    
    // First, create a trigger for returning to Item 1 using the first middle block
    const firstMiddleBlock = document.querySelector('.content-block[data-step="1"]');
    if (firstMiddleBlock) {
        ScrollTrigger.create({
            trigger: firstMiddleBlock,
            start: 'center center',
            end: 'bottom center',
            onLeaveBack: () => {
                // When scrolling back up past Middle 1, return to Item 1
                stickyItems.forEach((item, index) => {
                    if (index === 0) {
                        gsap.to(item, { opacity: 1, duration: 0.5 });
                    } else {
                        gsap.to(item, { opacity: 0, duration: 0.5 });
                    }
                });
            }
        });
    }
    
    triggerBlocks.forEach((block) => {
        const stepIndex = parseInt(block.getAttribute('data-step') || '0');
        const stickyItem = document.querySelector(`.sticky-item[data-item="${stepIndex}"]`);
        
        if (!stickyItem) return;
        
        ScrollTrigger.create({
            trigger: block,
            start: 'center center',
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
            onEnterBack: () => {
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
            }
        });
    });
    
    return {
        resize: () => ScrollTrigger.refresh()
    };
}