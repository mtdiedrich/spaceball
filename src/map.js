"use strict";
(() => {
  // src/map.ts
  var canvas;
  var ctx;
  var allMarkers = [];
  var currentYear = "";
  var years = [];
  var worldData = null;
  var scrollPhase = "title";
  var scrollProgress = 0;
  var totalMilesCovered = 0;
  function latLonToPixel(lat, lon, width, height) {
    const clampedLat = Math.max(lat, -60);
    const x = (lon + 180) / 360 * width;
    const y = (90 - clampedLat) / 150 * height;
    return { x, y };
  }
  async function loadWorldGeoJSON() {
    const response = await fetch("src/data/land.geojson");
    const data = await response.json();
    data.features = data.features.filter((feature) => {
      if (feature.geometry.type === "Polygon") {
        const hasAntarctica = feature.geometry.coordinates[0].some((coord) => coord[1] < -60);
        return !hasAntarctica;
      } else if (feature.geometry.type === "MultiPolygon") {
        const hasAntarctica = feature.geometry.coordinates.some(
          (polygon) => polygon[0].some((coord) => coord[1] < -60)
        );
        return !hasAntarctica;
      }
      return true;
    });
    return data;
  }
  function addPolygonToPath(coords, width, height) {
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
  var centerHistory = [];
  function calculateCenterForYear(year) {
    const yearMarkers = allMarkers.filter((m) => m.year === year);
    if (yearMarkers.length === 0)
      return null;
    let totalLat = 0;
    let totalLon = 0;
    yearMarkers.forEach((marker) => {
      totalLat += marker.lat;
      totalLon += marker.lon;
    });
    return {
      lat: totalLat / yearMarkers.length,
      lon: totalLon / yearMarkers.length
    };
  }
  function drawMap(mapY, opacity) {
    if (!worldData)
      return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(0, mapY);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    worldData.features.forEach((feature) => {
      if (feature.geometry.type === "Polygon") {
        ctx.beginPath();
        addPolygonToPath(feature.geometry.coordinates[0], width, height);
        ctx.fill();
      } else if (feature.geometry.type === "MultiPolygon") {
        feature.geometry.coordinates.forEach((polygon) => {
          ctx.beginPath();
          addPolygonToPath(polygon[0], width, height);
          ctx.fill();
        });
      }
    });
    if (centerHistory.length > 0) {
      ctx.strokeStyle = "#ff0000";
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
    const currentYearMarkers = allMarkers.filter((m) => m.year === currentYear);
    if (currentYearMarkers.length > 0) {
      let totalLat = 0;
      let totalLon = 0;
      currentYearMarkers.forEach((marker) => {
        totalLat += marker.lat;
        totalLon += marker.lon;
      });
      const centerLat = totalLat / currentYearMarkers.length;
      const centerLon = totalLon / currentYearMarkers.length;
      const centerPos = latLonToPixel(centerLat, centerLon, width, height);
      ctx.fillStyle = "#0066ff";
      ctx.beginPath();
      ctx.arc(centerPos.x, centerPos.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#1aff00ff";
    allMarkers.forEach((marker) => {
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
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);
    if (scrollPhase === "title") {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 72px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("The World of Basketball", width / 2, height / 2);
    } else if (scrollPhase === "reveal-map") {
      const mapY = height * (1 - scrollProgress);
      drawMap(mapY, 1);
    } else if (scrollPhase === "locked-markers") {
      drawMap(0, 1);
      const currentYearIdx = years.indexOf(currentYear);
      let distance = 0;
      for (let i = 1; i <= currentYearIdx; i++) {
        const prev = centerHistory[i - 1];
        const curr = centerHistory[i];
        distance += haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
      }
      totalMilesCovered = distance;
    } else if (scrollPhase === "scroll-away") {
      const mapY = -height * scrollProgress;
      drawMap(mapY, 1 - scrollProgress);
    }
    const yearDisplay = document.getElementById("year-display");
    if (scrollPhase === "locked-markers" || scrollPhase === "scroll-away") {
      yearDisplay.style.display = "block";
      yearDisplay.textContent = currentYear || "----";
    } else {
      yearDisplay.style.display = "none";
    }
    if (scrollPhase === "locked-markers" || scrollPhase === "scroll-away") {
      ctx.fillStyle = "#ffffff";
      ctx.font = "24px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(`${Math.round(totalMilesCovered).toLocaleString()} miles`, 20, height - 20);
    }
  }
  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  async function initMap() {
    canvas = document.getElementById("map");
    ctx = canvas.getContext("2d");
    worldData = await loadWorldGeoJSON();
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      render();
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    const response = await fetch("src/data/birth_place_geocodes.csv");
    const csvText = await response.text();
    const lines = csvText.split("\n");
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line)
        continue;
      const values = line.split(",");
      const lat = parseFloat(values[0]);
      const lon = parseFloat(values[1]);
      const year = values[2];
      if (!isNaN(lat) && !isNaN(lon)) {
        allMarkers.push({ name: "", lat, lon, year });
      }
    }
    const uniqueYears = /* @__PURE__ */ new Set();
    allMarkers.forEach((m) => uniqueYears.add(m.year));
    years = Array.from(uniqueYears).sort();
    years.forEach((year) => {
      const center = calculateCenterForYear(year);
      if (center) {
        centerHistory.push({ year, lat: center.lat, lon: center.lon });
      }
    });
    let currentYearIndex = -1;
    let scrollBuffer = 0;
    window.addEventListener("wheel", (event) => {
      event.preventDefault();
      if (event.deltaY > 0) {
        if (scrollPhase === "title") {
          scrollProgress += 0.1;
          if (scrollProgress >= 1) {
            scrollProgress = 0;
            scrollPhase = "reveal-map";
          }
        } else if (scrollPhase === "reveal-map") {
          scrollProgress += 0.05;
          if (scrollProgress >= 1) {
            scrollProgress = 0;
            scrollPhase = "locked-markers";
            scrollBuffer = 0;
          }
        } else if (scrollPhase === "locked-markers") {
          if (scrollBuffer < 3) {
            scrollBuffer++;
            render();
            return;
          }
          if (currentYearIndex < years.length - 1) {
            scrollBuffer += 1;
            if (scrollBuffer >= 3) {
              currentYearIndex++;
              currentYear = years[currentYearIndex];
              scrollBuffer = 0;
            }
          } else {
            scrollBuffer++;
            if (scrollBuffer >= 8) {
              scrollPhase = "scroll-away";
              scrollProgress = 0;
              scrollBuffer = 0;
            }
          }
        } else if (scrollPhase === "scroll-away") {
          scrollProgress += 0.03;
          scrollProgress = Math.min(scrollProgress, 1);
        }
      } else {
        if (scrollPhase === "scroll-away") {
          if (scrollProgress > 0) {
            scrollProgress -= 0.03;
          } else {
            scrollBuffer++;
            if (scrollBuffer >= 3) {
              scrollPhase = "locked-markers";
              scrollProgress = 0;
              scrollBuffer = 0;
            }
          }
        } else if (scrollPhase === "locked-markers") {
          if (currentYearIndex === years.length - 1 && scrollBuffer < 3) {
            scrollBuffer++;
            render();
            return;
          }
          if (currentYearIndex > -1) {
            scrollBuffer += 1;
            if (scrollBuffer >= 1) {
              currentYearIndex--;
              currentYear = currentYearIndex >= 0 ? years[currentYearIndex] : "";
              scrollBuffer = 0;
            }
          } else {
            scrollBuffer++;
            if (scrollBuffer >= 1) {
              scrollPhase = "reveal-map";
              scrollProgress = 1;
              scrollBuffer = 0;
            }
          }
        } else if (scrollPhase === "reveal-map") {
          scrollProgress -= 0.05;
          if (scrollProgress <= 0) {
            scrollPhase = "title";
            scrollProgress = 0;
          }
        } else if (scrollPhase === "title") {
          scrollProgress -= 0.1;
          scrollProgress = Math.max(scrollProgress, 0);
        }
      }
      render();
    }, { passive: false });
  }
  initMap();
})();
