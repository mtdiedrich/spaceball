import scrollama from 'scrollama';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let allMarkers: Array<{name: string, lat: number, lon: number, year: string}> = [];
let years: string[] = [];
let worldData: any = null;
let centerHistory: Array<{year: string, lat: number, lon: number}> = [];
let currentYearIndex = 0;
let totalMilesCovered = 0;

let introStartTime = 0;
let introCompleted = false;
let currentStep = 'intro';
let stepProgress = 0;

function latLonToPixel(lat: number, lon: number, width: number, height: number): {x: number, y: number} {
    const clampedLat = Math.max(lat, -60);
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - clampedLat) / 150) * height;
    return {x, y};
}

async function loadWorldGeoJSON() {
    const response = await fetch('src/data/land.geojson');
    const data = await response.json();
    
    data.features = data.features.filter((feature: any) => {
        if (feature.geometry.type === 'Polygon') {
            return !feature.geometry.coordinates[0].some((coord: number[]) => coord[1] < -60);
        } else if (feature.geometry.type === 'MultiPolygon') {
            return !feature.geometry.coordinates.some((polygon: any) => 
                polygon[0].some((coord: number[]) => coord[1] < -60)
            );
        }
        return true;
    });
    
    return data;
}

function addPolygonToPath(coords: number[][], width: number, height: number) {
    coords.forEach((coord, i) => {
        const pos = latLonToPixel(coord[1], coord[0], width, height);
        if (i === 0) {
            ctx.moveTo(pos.x, pos.y);
        } else {
            ctx.lineTo(pos.x, pos.y);
        }
    });
    ctx.closePath();
}

function calculateCenterForYear(year: string): {lat: number, lon: number} | null {
    const yearIdx = years.indexOf(year);
    if (yearIdx < 0) return null;
    
    const markersUpToYear = allMarkers.filter(m => {
        const markerYearIdx = years.indexOf(m.year);
        return markerYearIdx >= 0 && markerYearIdx <= yearIdx;
    });
    
    if (markersUpToYear.length === 0) return null;
    
    let totalLat = 0;
    let totalLon = 0;
    markersUpToYear.forEach(marker => {
        totalLat += marker.lat;
        totalLon += marker.lon;
    });
    
    return {
        lat: totalLat / markersUpToYear.length,
        lon: totalLon / markersUpToYear.length
    };
}

function drawMap(opacity: number = 1) {
    if (!worldData) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.save();
    
    // Draw water
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    // Draw land
    ctx.globalAlpha = opacity;
    ctx.fillStyle = '#ffffff';
    worldData.features.forEach((feature: any) => {
        if (feature.geometry.type === 'Polygon') {
            ctx.beginPath();
            addPolygonToPath(feature.geometry.coordinates[0], width, height);
            ctx.fill();
        } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach((polygon: any) => {
                ctx.beginPath();
                addPolygonToPath(polygon[0], width, height);
                ctx.fill();
            });
        }
    });
    
    // Draw red trail
    if (centerHistory.length > 0 && currentYearIndex >= 0) {
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        
        const historyUpToCurrent = centerHistory.slice(0, currentYearIndex + 1);
        historyUpToCurrent.forEach((center, i) => {
            const pos = latLonToPixel(center.lat, center.lon, width, height);
            if (i === 0) {
                ctx.moveTo(pos.x, pos.y);
            } else {
                ctx.lineTo(pos.x, pos.y);
            }
        });
        
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    
    // Draw current center
    const markersUpToCurrent = allMarkers.filter(m => {
        const markerYearIdx = years.indexOf(m.year);
        return markerYearIdx >= 0 && markerYearIdx <= currentYearIndex;
    });
    
    if (markersUpToCurrent.length > 0) {
        let totalLat = 0;
        let totalLon = 0;
        markersUpToCurrent.forEach(marker => {
            totalLat += marker.lat;
            totalLon += marker.lon;
        });
        const centerLat = totalLat / markersUpToCurrent.length;
        const centerLon = totalLon / markersUpToCurrent.length;
        
        const centerPos = latLonToPixel(centerLat, centerLon, width, height);
        ctx.globalAlpha = opacity;
        ctx.shadowColor = '#0066ff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#0066ff';
        ctx.beginPath();
        ctx.arc(centerPos.x, centerPos.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    // Draw individual markers
    ctx.globalAlpha = opacity * 0.4;
    ctx.fillStyle = '#1aff00';
    allMarkers.forEach(marker => {
        const markerYearIdx = years.indexOf(marker.year);
        if (markerYearIdx >= 0 && markerYearIdx <= currentYearIndex) {
            const pos = latLonToPixel(marker.lat, marker.lon, width, height);
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    ctx.restore();
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function render() {
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    if (currentStep === 'intro') {
        const elapsed = Date.now() - introStartTime;
        
        // Title
        let titleOpacity = 0;
        let titleOffset = 0;
        if (elapsed < 1500) {
            titleOpacity = elapsed / 1500;
            titleOffset = (1 - titleOpacity) * 100;
        } else {
            titleOpacity = 1;
            titleOffset = 0;
        }
        
        // Subtitle
        let subtitleOpacity = 0;
        let subtitleOffset = 0;
        if (elapsed > 2000 && elapsed < 3500) {
            subtitleOpacity = (elapsed - 2000) / 1500;
            subtitleOffset = (1 - subtitleOpacity) * 100;
        } else if (elapsed >= 3500) {
            subtitleOpacity = 1;
            subtitleOffset = 0;
        }
        
        // Scroll indicator
        let scrollOpacity = 0;
        let scrollOffset = 0;
        if (elapsed >= 4000) {
            if (elapsed < 5500) {
                scrollOpacity = (elapsed - 4000) / 1500;
                scrollOffset = (1 - scrollOpacity) * 100;
            } else {
                scrollOpacity = 1;
                scrollOffset = 0;
                introCompleted = true;
            }
        }
        
        // Apply scroll-up offset
        const scrollUpOffset = stepProgress * height;
        
        ctx.globalAlpha = titleOpacity;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 72px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('The World of Basketball', width / 2, height / 2 - 100 + titleOffset - scrollUpOffset);
        
        ctx.globalAlpha = subtitleOpacity;
        ctx.font = '32px sans-serif';
        ctx.fillStyle = '#cccccc';
        ctx.fillText('An Essay About Human Extinction', width / 2, height / 2 - 20 + subtitleOffset - scrollUpOffset);
        
        if (elapsed >= 4000) {
            const pulse = introCompleted ? Math.sin(Date.now() / 500) * 0.3 + 0.7 : 1;
            ctx.globalAlpha = scrollOpacity * pulse;
            ctx.fillStyle = '#ffffff';
            ctx.font = '48px sans-serif';
            ctx.fillText('↓', width / 2, height / 2 + 80 + scrollOffset - scrollUpOffset);
            ctx.globalAlpha = scrollOpacity * 0.7 * pulse;
            ctx.font = '24px sans-serif';
            ctx.fillText('scroll', width / 2, height / 2 + 140 + scrollOffset - scrollUpOffset);
        }
        
        ctx.globalAlpha = 1;
        
    } else if (currentStep === 'map') {
        // Map slides up from bottom
        const mapY = height * (1 - stepProgress);
        ctx.save();
        ctx.translate(0, mapY);
        drawMap(stepProgress);
        ctx.restore();
        
    } else if (currentStep === 'years') {
        // Map visible, showing years
        drawMap();
        updateYearDisplay();
    }
}

function updateYearDisplay() {
    const yearDisplay = document.getElementById('year-display') as HTMLElement;
    const milesDisplay = document.getElementById('miles-display') as HTMLElement;
    
    if (currentYearIndex >= 0 && currentYearIndex < years.length) {
        yearDisplay.textContent = years[currentYearIndex];
        yearDisplay.style.display = 'block';
        
        // Calculate distance
        let distance = 0;
        for (let i = 1; i <= currentYearIndex; i++) {
            const prev = centerHistory[i - 1];
            const curr = centerHistory[i];
            distance += haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
        }
        totalMilesCovered = distance;
        
        milesDisplay.textContent = `${Math.round(totalMilesCovered).toLocaleString()} miles`;
        milesDisplay.style.display = 'block';
    } else {
        yearDisplay.style.display = 'none';
        milesDisplay.style.display = 'none';
    }
}

async function initMap(): Promise<void> {
    canvas = document.getElementById('map') as HTMLCanvasElement;
    ctx = canvas.getContext('2d')!;
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        render();
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Start intro animation
    introStartTime = Date.now();
    
    function animate() {
        render();
        requestAnimationFrame(animate);
    }
    animate();
    
    // Load data
    worldData = await loadWorldGeoJSON();
    
    const response = await fetch('src/data/birth_place_geocodes.csv');
    const csvText = await response.text();
    const lines = csvText.split('\n');

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',');
        const lat = parseFloat(values[0]);
        const lon = parseFloat(values[1]);
        const year = values[2];
        
        if (!isNaN(lat) && !isNaN(lon)) {
            allMarkers.push({name: '', lat, lon, year});
        }
    }
    
    const uniqueYears = new Set<string>();
    allMarkers.forEach(m => uniqueYears.add(m.year));
    years = Array.from(uniqueYears).sort();
    
    years.forEach(year => {
        const center = calculateCenterForYear(year);
        if (center) {
            centerHistory.push({year, lat: center.lat, lon: center.lon});
        }
    });
    
    // Create year steps dynamically
    const scrollContainer = document.getElementById('scroll-container')!;
    years.forEach((year, index) => {
        const step = document.createElement('div');
        step.className = 'step';
        step.id = `year-${index}`;
        scrollContainer.appendChild(step);
    });
    
    // Setup scrollama after intro
    setTimeout(() => {
        setupScrollama();
    }, 5500);
}

function setupScrollama() {
    const scroller = scrollama();
    
    scroller
        .setup({
            step: '.step',
            offset: 0.5,
            progress: true,
        })
        .onStepEnter((response) => {
            const stepId = response.element.id;
            
            if (stepId === 'intro-step') {
                currentStep = 'intro';
                stepProgress = 0;
            } else if (stepId === 'map-step') {
                currentStep = 'map';
                stepProgress = 0;
            } else if (stepId.startsWith('year-')) {
                currentStep = 'years';
                const yearIndex = parseInt(stepId.split('-')[1]);
                currentYearIndex = yearIndex;
            }
        })
        .onStepProgress((response) => {
            stepProgress = response.progress;
            
            if (response.element.id === 'intro-step') {
                // Intro scrolls up as progress increases
                currentStep = 'intro';
            } else if (response.element.id === 'map-step') {
                // Map reveals as progress increases
                currentStep = 'map';
            }
        });
}

initMap();