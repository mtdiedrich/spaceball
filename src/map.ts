let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let allMarkers: Array<{name: string, lat: number, lon: number, year: string}> = [];
let currentYear = '';
let years: string[] = [];
let worldData: any = null;

// Scroll phases
let scrollPhase: 'title' | 'reveal-map' | 'locked-markers' | 'scroll-away' = 'title';
let scrollProgress = 0;

// Add at the top with other global variables
let totalMilesCovered = 0;

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function latLonToPixel(lat: number, lon: number, width: number, height: number): {x: number, y: number} {
    // Exclude Antarctica by clamping latitude
    const clampedLat = Math.max(lat, -60);
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - clampedLat) / 150) * height; // Adjusted for -60 to 90 range
    return {x, y};
}

async function loadWorldGeoJSON() {
    const response = await fetch('src/data/land.geojson');
    const data = await response.json();
    
    // Filter out Antarctica
    data.features = data.features.filter((feature: any) => {
        // Check if any coordinates are below -60 latitude (Antarctica)
        if (feature.geometry.type === 'Polygon') {
            const hasAntarctica = feature.geometry.coordinates[0].some((coord: number[]) => coord[1] < -60);
            return !hasAntarctica;
        } else if (feature.geometry.type === 'MultiPolygon') {
            const hasAntarctica = feature.geometry.coordinates.some((polygon: any) => 
                polygon[0].some((coord: number[]) => coord[1] < -60)
            );
            return !hasAntarctica;
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

// Add at the top with other global variables
let centerHistory: Array<{year: string, lat: number, lon: number}> = [];

// Add this function after loadWorldGeoJSON
function calculateCenterForYear(year: string): {lat: number, lon: number} | null {
    const yearMarkers = allMarkers.filter(m => m.year === year);
    if (yearMarkers.length === 0) return null;
    
    let totalLat = 0;
    let totalLon = 0;
    yearMarkers.forEach(marker => {
        totalLat += marker.lat;
        totalLon += marker.lon;
    });
    
    return {
        lat: totalLat / yearMarkers.length,
        lon: totalLon / yearMarkers.length
    };
}

// Update the drawMap function
function drawMap(mapY: number, opacity: number) {
    if (!worldData) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(0, mapY);
    
    // Draw water first (background)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    // Draw land on top
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
    
    // Draw red line connecting center positions through current year
    if (centerHistory.length > 0) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const currentYearIdx = years.indexOf(currentYear);
        const historyUpToCurrent = centerHistory.slice(0, currentYearIdx + 1);
        
        historyUpToCurrent.forEach((center, i) => {
            const pos = latLonToPixel(center.lat, center.lon, width, height);
            if (i === 0) {
                ctx.moveTo(pos.x, pos.y);
            } else {
                ctx.lineTo(pos.x, pos.y);
            }
        });
        
        ctx.stroke();
    }
    
    // Calculate and draw current center
    const currentYearMarkers = allMarkers.filter(m => m.year === currentYear);
    if (currentYearMarkers.length > 0) {
        let totalLat = 0;
        let totalLon = 0;
        currentYearMarkers.forEach(marker => {
            totalLat += marker.lat;
            totalLon += marker.lon;
        });
        const centerLat = totalLat / currentYearMarkers.length;
        const centerLon = totalLon / currentYearMarkers.length;
        
        // Draw blue center marker (larger)
        const centerPos = latLonToPixel(centerLat, centerLon, width, height);
        ctx.fillStyle = '#0066ff';
        ctx.beginPath();
        ctx.arc(centerPos.x, centerPos.y, 8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw individual markers
    ctx.fillStyle = '#1aff00ff';
    allMarkers.forEach(marker => {
        if (marker.year === currentYear) {
            const pos = latLonToPixel(marker.lat, marker.lon, width, height);
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    ctx.restore();
}

function render() {
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    if (scrollPhase === 'title') {
        // Show title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 72px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('The World of Basketball', width / 2, height / 2);
        
    } else if (scrollPhase === 'reveal-map') {
        // Map sliding up from bottom
        const mapY = height * (1 - scrollProgress);
        drawMap(mapY, 1);
        
    } else if (scrollPhase === 'locked-markers') {
        // Map locked at top, showing markers
        drawMap(0, 1);
        
        // Calculate distance up to current year
        const currentYearIdx = years.indexOf(currentYear);
        let distance = 0;
        for (let i = 1; i <= currentYearIdx; i++) {
            const prev = centerHistory[i - 1];
            const curr = centerHistory[i];
            distance += haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
        }
        totalMilesCovered = distance;
        
    } else if (scrollPhase === 'scroll-away') {
        // Map scrolling up and away
        const mapY = -height * scrollProgress;
        drawMap(mapY, 1 - scrollProgress);
    }
    
    // Update year display
    const yearDisplay = document.getElementById('year-display') as HTMLElement;
    if (scrollPhase === 'locked-markers' || scrollPhase === 'scroll-away') {
        yearDisplay.style.display = 'block';
        yearDisplay.textContent = currentYear || '----';
    } else {
        yearDisplay.style.display = 'none';
    }
    
    // Show miles in bottom left
    if (scrollPhase === 'locked-markers' || scrollPhase === 'scroll-away') {
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${Math.round(totalMilesCovered).toLocaleString()} miles`, 20, height - 20);
    }
}

// Add this function to calculate distance between two lat/lon points
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function initMap(): Promise<void> {
    canvas = document.getElementById('map') as HTMLCanvasElement;
    ctx = canvas.getContext('2d')!;
    
    worldData = await loadWorldGeoJSON();
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        render();
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
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
    
    // In initMap, after building the years array, add:
    // Build center history for all years
    years.forEach(year => {
        const center = calculateCenterForYear(year);
        if (center) {
            centerHistory.push({year, lat: center.lat, lon: center.lon});
        }
    });

    let currentYearIndex = -1;
    let scrollBuffer = 0; // Buffer to slow down year progression

    window.addEventListener('wheel', (event) => {
        event.preventDefault();
        
        if (event.deltaY > 0) {
            // Scrolling down
            if (scrollPhase === 'title') {
                scrollProgress += 0.1; // Much faster to get past title
                if (scrollProgress >= 1) {
                    scrollProgress = 0;
                    scrollPhase = 'reveal-map';
                }
            } else if (scrollPhase === 'reveal-map') {
                scrollProgress += 0.05;
                if (scrollProgress >= 1) {
                    scrollProgress = 0;
                    scrollPhase = 'locked-markers';
                    scrollBuffer = 0; // Reset buffer when entering locked phase
                }
            } else if (scrollPhase === 'locked-markers') {
                // Add pause at start of locked phase
                if (scrollBuffer < 3) {
                    scrollBuffer++;
                    render();
                    return;
                }
                
                // Advance years (slower)
                if (currentYearIndex < years.length - 1) {
                    scrollBuffer += 1;
                    if (scrollBuffer >= 3) { // Require 5 scroll ticks per year
                        currentYearIndex++;
                        currentYear = years[currentYearIndex];
                        scrollBuffer = 0;
                    }
                } else {
                    // Add pause before unlocking
                    scrollBuffer++;
                    if (scrollBuffer >= 8) {
                        scrollPhase = 'scroll-away';
                        scrollProgress = 0;
                        scrollBuffer = 0;
                    }
                }
            } else if (scrollPhase === 'scroll-away') {
                scrollProgress += 0.03;
                scrollProgress = Math.min(scrollProgress, 1);
            }
        } else {
            // Scrolling up
            if (scrollPhase === 'scroll-away') {
                // Add pause before re-locking
                if (scrollProgress > 0) {
                    scrollProgress -= 0.03;
                } else {
                    scrollBuffer++;
                    if (scrollBuffer >= 3) {
                        scrollPhase = 'locked-markers';
                        scrollProgress = 0;
                        scrollBuffer = 0;
                    }
                }
            } else if (scrollPhase === 'locked-markers') {
                // Add pause at end of locked phase
                if (currentYearIndex === years.length - 1 && scrollBuffer < 3) {
                    scrollBuffer++;
                    render();
                    return;
                }
                
                if (currentYearIndex > -1) {
                    scrollBuffer += 1;
                    if (scrollBuffer >= 1) { // Require 5 scroll ticks per year
                        currentYearIndex--;
                        currentYear = currentYearIndex >= 0 ? years[currentYearIndex] : '';
                        scrollBuffer = 0;
                    }
                } else {
                    scrollBuffer++;
                    if (scrollBuffer >= 1) {
                        scrollPhase = 'reveal-map';
                        scrollProgress = 1;
                        scrollBuffer = 0;
                    }
                }
            } else if (scrollPhase === 'reveal-map') {
                scrollProgress -= 0.05;
                if (scrollProgress <= 0) {
                    scrollPhase = 'title';
                    scrollProgress = 0;
                }
            } else if (scrollPhase === 'title') {
                scrollProgress -= 0.1;
                scrollProgress = Math.max(scrollProgress, 0);
            }
        }
        
        render();
    }, { passive: false });
}

initMap();