let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let allMarkers: Array<{name: string, lat: number, lon: number, year: string}> = [];
let currentYear = '';
let years: string[] = [];
let worldData: any = null;

// Scroll phases
let scrollPhase: 'scroll-prompt' | 'title' | 'reveal-map' | 'locked-markers' | 'final-summary' = 'scroll-prompt';
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
    // Calculate center using all markers up to and including this year
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

// Update the drawMap function with improved visual hierarchy
function drawMap(mapY: number, opacity: number, revealProgress: number = 1) {
    if (!worldData) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(0, mapY);
    
    // Draw water first (background)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    // Draw land on top with fade-in during reveal
    ctx.globalAlpha = opacity * revealProgress;
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
    
    ctx.globalAlpha = opacity;
    
    // Draw red trail connecting center positions through current year (EMPHASIZED)
    if (centerHistory.length > 0 && revealProgress > 0.5) {
        const trailOpacity = Math.min(1, (revealProgress - 0.5) * 2);
        ctx.globalAlpha = opacity * trailOpacity;
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 4; // Thicker trail
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 8;
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
        ctx.shadowBlur = 0;
    }
    
    ctx.globalAlpha = opacity;
    
    // Calculate and draw current center (based on all locations up to current year)
    const currentYearIdx = years.indexOf(currentYear);
    const markersUpToCurrent = allMarkers.filter(m => {
        const markerYearIdx = years.indexOf(m.year);
        return markerYearIdx >= 0 && markerYearIdx <= currentYearIdx;
    });
    
    if (markersUpToCurrent.length > 0 && revealProgress === 1) {
        let totalLat = 0;
        let totalLon = 0;
        markersUpToCurrent.forEach(marker => {
            totalLat += marker.lat;
            totalLon += marker.lon;
        });
        const centerLat = totalLat / markersUpToCurrent.length;
        const centerLon = totalLon / markersUpToCurrent.length;
        
        // Draw blue center marker (prominent with glow)
        const centerPos = latLonToPixel(centerLat, centerLon, width, height);
        ctx.shadowColor = '#0066ff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#0066ff';
        ctx.beginPath();
        ctx.arc(centerPos.x, centerPos.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    // Draw individual markers (smaller and more transparent)
    // Show all markers up to and including current year
    if (revealProgress === 1) {
        ctx.globalAlpha = opacity * 0.4; // More transparent
        ctx.fillStyle = '#1aff00';
        const currentYearIdx = years.indexOf(currentYear);
        allMarkers.forEach(marker => {
            const markerYearIdx = years.indexOf(marker.year);
            if (markerYearIdx >= 0 && markerYearIdx <= currentYearIdx) {
                const pos = latLonToPixel(marker.lat, marker.lon, width, height);
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2); // Smaller
                ctx.fill();
            }
        });
    }
    
    ctx.restore();
}

function render() {
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    if (scrollPhase === 'scroll-prompt') {
        // Show scroll indicator
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Pulsing arrow animation
        const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
        ctx.fillText('↓', width / 2, height / 2);
        ctx.globalAlpha = 0.7;
        ctx.font = '24px sans-serif';
        ctx.fillText('scroll', width / 2, height / 2 + 60);
        ctx.globalAlpha = 1;
        
    } else if (scrollPhase === 'title') {
        // Title fades in then fades out
        let titleOpacity;
        if (scrollProgress < 0.5) {
            // Fade in during first half
            titleOpacity = scrollProgress * 2;
        } else {
            // Fade out during second half
            titleOpacity = (1 - scrollProgress) * 2;
        }
        
        ctx.globalAlpha = titleOpacity;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 72px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Basketball\'s Global Journey', width / 2, height / 2 - 40);
        
        // Subtitle
        ctx.font = '32px sans-serif';
        ctx.fillStyle = '#cccccc';
        ctx.fillText('Following the sport\'s shifting center across decades', width / 2, height / 2 + 40);
        ctx.globalAlpha = 1;
        
    } else if (scrollPhase === 'reveal-map') {
        // Map sliding up from bottom with progressive reveal
        const mapY = height * (1 - scrollProgress);
        drawMap(mapY, 1, scrollProgress);
        
    } else if (scrollPhase === 'locked-markers') {
        // Map locked at top, showing markers
        drawMap(0, 1, 1);
        
        // Calculate distance up to current year
        const currentYearIdx = years.indexOf(currentYear);
        let distance = 0;
        for (let i = 1; i <= currentYearIdx; i++) {
            const prev = centerHistory[i - 1];
            const curr = centerHistory[i];
            distance += haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
        }
        totalMilesCovered = distance;
        
    } else if (scrollPhase === 'final-summary') {
        // Show full trail with summary statistics
        drawMap(0, 1, 1);
        
        // Draw semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);
        
        // Summary text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 56px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const totalDistance = Math.round(totalMilesCovered).toLocaleString();
        const yearSpan = years.length > 0 ? `${years[0]} - ${years[years.length - 1]}` : '';
        
        ctx.fillText(`${totalDistance} miles`, width / 2, height / 2 - 80);
        
        ctx.font = '32px sans-serif';
        ctx.fillStyle = '#cccccc';
        ctx.fillText(`traveled across ${yearSpan}`, width / 2, height / 2 - 20);
        ctx.fillText(`${allMarkers.length.toLocaleString()} events tracked`, width / 2, height / 2 + 40);
    }
    
    // Update year display
    const yearDisplay = document.getElementById('year-display') as HTMLElement;
    if (scrollPhase === 'locked-markers') {
        yearDisplay.style.display = 'block';
        yearDisplay.textContent = currentYear || '----';
    } else {
        yearDisplay.style.display = 'none';
    }
    
    // Show miles in bottom left (larger and more prominent)
    if (scrollPhase === 'locked-markers') {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${Math.round(totalMilesCovered).toLocaleString()} miles`, 30, height - 30);
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
    
    // Animation loop for pulsing scroll indicator
    function animate() {
        if (scrollPhase === 'scroll-prompt') {
            render();
        }
        requestAnimationFrame(animate);
    }
    animate();
    
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
    
    // Build center history for all years
    years.forEach(year => {
        const center = calculateCenterForYear(year);
        if (center) {
            centerHistory.push({year, lat: center.lat, lon: center.lon});
        }
    });

    let currentYearIndex = -1;
    let scrollBuffer = 0;

    function handleScrollDown() {
        if (scrollPhase === 'scroll-prompt') {
            scrollProgress += 0.05;
            if (scrollProgress >= 1) {
                scrollProgress = 0;
                scrollPhase = 'title';
            }
        } else if (scrollPhase === 'title') {
            scrollProgress += 0.02;
            if (scrollProgress >= 1) {
                scrollProgress = 0;
                scrollPhase = 'reveal-map';
            }
        } else if (scrollPhase === 'reveal-map') {
            scrollProgress += 0.04;
            if (scrollProgress >= 1) {
                scrollProgress = 0;
                scrollPhase = 'locked-markers';
                scrollBuffer = 0;
            }
        } else if (scrollPhase === 'locked-markers') {
            if (scrollBuffer < 2) {
                scrollBuffer++;
                render();
                return;
            }
            
            if (currentYearIndex < years.length - 1) {
                scrollBuffer += 1;
                if (scrollBuffer >= 2) {
                    currentYearIndex++;
                    currentYear = years[currentYearIndex];
                    scrollBuffer = 0;
                }
            } else {
                scrollBuffer++;
                if (scrollBuffer >= 5) {
                    scrollPhase = 'final-summary';
                    scrollProgress = 0;
                    scrollBuffer = 0;
                }
            }
        } else if (scrollPhase === 'final-summary') {
            scrollProgress = Math.min(scrollProgress + 0.02, 1);
        }
        render();
    }

    function handleScrollUp() {
        if (scrollPhase === 'final-summary') {
            scrollBuffer++;
            if (scrollBuffer >= 3) {
                scrollPhase = 'locked-markers';
                currentYearIndex = years.length - 1;
                currentYear = years[currentYearIndex];
                scrollBuffer = 0;
            }
        } else if (scrollPhase === 'locked-markers') {
            if (currentYearIndex === years.length - 1 && scrollBuffer < 2) {
                scrollBuffer++;
                render();
                return;
            }
            
            if (currentYearIndex > -1) {
                scrollBuffer += 1;
                if (scrollBuffer >= 2) {
                    currentYearIndex--;
                    currentYear = currentYearIndex >= 0 ? years[currentYearIndex] : '';
                    scrollBuffer = 0;
                }
            } else {
                scrollBuffer++;
                if (scrollBuffer >= 2) {
                    scrollPhase = 'reveal-map';
                    scrollProgress = 1;
                    scrollBuffer = 0;
                }
            }
        } else if (scrollPhase === 'reveal-map') {
            scrollProgress -= 0.04;
            if (scrollProgress <= 0) {
                scrollPhase = 'title';
                scrollProgress = 1;
            }
        } else if (scrollPhase === 'title') {
            scrollProgress -= 0.02;
            if (scrollProgress <= 0) {
                scrollPhase = 'scroll-prompt';
                scrollProgress = 0;
            }
        } else if (scrollPhase === 'scroll-prompt') {
            scrollProgress -= 0.05;
            scrollProgress = Math.max(scrollProgress, 0);
        }
        render();
    }

    // Mouse wheel events only
    window.addEventListener('wheel', (event) => {
        event.preventDefault();
        
        if (event.deltaY > 0) {
            handleScrollDown();
        } else {
            handleScrollUp();
        }
    }, { passive: false });
}

initMap();