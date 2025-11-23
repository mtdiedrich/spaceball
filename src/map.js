"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/scrollama/build/scrollama.js
  var require_scrollama = __commonJS({
    "node_modules/scrollama/build/scrollama.js"(exports, module) {
      (function(global, factory) {
        typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : (global = global || self, global.scrollama = factory());
      })(exports, function() {
        "use strict";
        function selectAll(selector, parent = document) {
          if (typeof selector === "string") {
            return Array.from(parent.querySelectorAll(selector));
          } else if (selector instanceof Element) {
            return [selector];
          } else if (selector instanceof NodeList) {
            return Array.from(selector);
          } else if (selector instanceof Array) {
            return selector;
          }
          return [];
        }
        function create(className) {
          const el = document.createElement("div");
          el.className = `scrollama__debug-step ${className}`;
          el.style.position = "fixed";
          el.style.left = "0";
          el.style.width = "100%";
          el.style.zIndex = "9999";
          el.style.borderTop = "2px solid black";
          el.style.borderBottom = "2px solid black";
          const p = document.createElement("p");
          p.style.position = "absolute";
          p.style.left = "0";
          p.style.height = "1px";
          p.style.width = "100%";
          p.style.borderTop = "1px dashed black";
          el.appendChild(p);
          document.body.appendChild(el);
          return el;
        }
        function update({ id, step, marginTop }) {
          const { index, height } = step;
          const className = `scrollama__debug-step--${id}-${index}`;
          let el = document.querySelector(`.${className}`);
          if (!el)
            el = create(className);
          el.style.top = `${marginTop * -1}px`;
          el.style.height = `${height}px`;
          el.querySelector("p").style.top = `${height / 2}px`;
        }
        function generateId() {
          const alphabet = "abcdefghijklmnopqrstuvwxyz";
          const date = Date.now();
          const result = [];
          for (let i = 0; i < 6; i += 1) {
            const char = alphabet[Math.floor(Math.random() * alphabet.length)];
            result.push(char);
          }
          return `${result.join("")}${date}`;
        }
        function err$1(msg) {
          console.error(`scrollama error: ${msg}`);
        }
        function getIndex(node) {
          return +node.getAttribute("data-scrollama-index");
        }
        function createProgressThreshold(height, threshold) {
          const count = Math.ceil(height / threshold);
          const t = [];
          const ratio = 1 / count;
          for (let i = 0; i < count + 1; i += 1) {
            t.push(i * ratio);
          }
          return t;
        }
        function parseOffset(x) {
          if (typeof x === "string" && x.indexOf("px") > 0) {
            const v = +x.replace("px", "");
            if (!isNaN(v))
              return { format: "pixels", value: v };
            else {
              err("offset value must be in 'px' format. Fallback to 0.5.");
              return { format: "percent", value: 0.5 };
            }
          } else if (typeof x === "number" || !isNaN(+x)) {
            if (x > 1)
              err("offset value is greater than 1. Fallback to 1.");
            if (x < 0)
              err("offset value is lower than 0. Fallback to 0.");
            return { format: "percent", value: Math.min(Math.max(0, x), 1) };
          }
          return null;
        }
        function indexSteps(steps) {
          steps.forEach(
            (step) => step.node.setAttribute("data-scrollama-index", step.index)
          );
        }
        function getOffsetTop(node) {
          const { top } = node.getBoundingClientRect();
          const scrollTop = window.pageYOffset;
          const clientTop = document.body.clientTop || 0;
          return top + scrollTop - clientTop;
        }
        let currentScrollY;
        let comparisonScrollY;
        let direction;
        function onScroll(container) {
          const scrollTop = container ? container.scrollTop : window.pageYOffset;
          if (currentScrollY === scrollTop)
            return;
          currentScrollY = scrollTop;
          if (currentScrollY > comparisonScrollY)
            direction = "down";
          else if (currentScrollY < comparisonScrollY)
            direction = "up";
          comparisonScrollY = currentScrollY;
        }
        function setupScroll(container) {
          currentScrollY = 0;
          comparisonScrollY = 0;
          document.addEventListener("scroll", () => onScroll(container));
        }
        function scrollama2() {
          let cb = {};
          let id = generateId();
          let steps = [];
          let globalOffset;
          let containerElement;
          let rootElement;
          let progressThreshold = 0;
          let isEnabled = false;
          let isProgress = false;
          let isDebug = false;
          let isTriggerOnce = false;
          let exclude = [];
          function reset() {
            cb = {
              stepEnter: () => {
              },
              stepExit: () => {
              },
              stepProgress: () => {
              }
            };
            exclude = [];
          }
          function handleEnable(shouldEnable) {
            if (shouldEnable && !isEnabled)
              updateObservers();
            if (!shouldEnable && isEnabled)
              disconnectObservers();
            isEnabled = shouldEnable;
          }
          function notifyProgress(element, progress) {
            const index = getIndex(element);
            const step = steps[index];
            if (progress !== void 0)
              step.progress = progress;
            const response = { element, index, progress, direction };
            if (step.state === "enter")
              cb.stepProgress(response);
          }
          function notifyStepEnter(element, check = true) {
            const index = getIndex(element);
            const step = steps[index];
            const response = { element, index, direction };
            step.direction = direction;
            step.state = "enter";
            if (!exclude[index])
              cb.stepEnter(response);
            if (isTriggerOnce)
              exclude[index] = true;
          }
          function notifyStepExit(element, check = true) {
            const index = getIndex(element);
            const step = steps[index];
            if (!step.state)
              return false;
            const response = { element, index, direction };
            if (isProgress) {
              if (direction === "down" && step.progress < 1)
                notifyProgress(element, 1);
              else if (direction === "up" && step.progress > 0)
                notifyProgress(element, 0);
            }
            step.direction = direction;
            step.state = "exit";
            cb.stepExit(response);
          }
          function resizeStep([entry]) {
            const index = getIndex(entry.target);
            const step = steps[index];
            const h = entry.target.offsetHeight;
            if (h !== step.height) {
              step.height = h;
              disconnectObserver(step);
              updateStepObserver(step);
              updateResizeObserver(step);
            }
          }
          function intersectStep([entry]) {
            onScroll(containerElement);
            const { isIntersecting, target } = entry;
            if (isIntersecting)
              notifyStepEnter(target);
            else
              notifyStepExit(target);
          }
          function intersectProgress([entry]) {
            const index = getIndex(entry.target);
            const step = steps[index];
            const { isIntersecting, intersectionRatio, target } = entry;
            if (isIntersecting && step.state === "enter")
              notifyProgress(target, intersectionRatio);
          }
          function disconnectObserver({ observers }) {
            Object.keys(observers).map((name) => {
              observers[name].disconnect();
            });
          }
          function disconnectObservers() {
            steps.forEach(disconnectObserver);
          }
          function updateResizeObserver(step) {
            const observer = new ResizeObserver(resizeStep);
            observer.observe(step.node);
            step.observers.resize = observer;
          }
          function updateResizeObservers() {
            steps.forEach(updateResizeObserver);
          }
          function updateStepObserver(step) {
            const h = window.innerHeight;
            const off = step.offset || globalOffset;
            const factor = off.format === "pixels" ? 1 : h;
            const offset = off.value * factor;
            const marginTop = step.height / 2 - offset;
            const marginBottom = step.height / 2 - (h - offset);
            const rootMargin = `${marginTop}px 0px ${marginBottom}px 0px`;
            const root = rootElement;
            const threshold = 0.5;
            const options = { rootMargin, threshold, root };
            const observer = new IntersectionObserver(intersectStep, options);
            observer.observe(step.node);
            step.observers.step = observer;
            if (isDebug)
              update({ id, step, marginTop, marginBottom });
          }
          function updateStepObservers() {
            steps.forEach(updateStepObserver);
          }
          function updateProgressObserver(step) {
            const h = window.innerHeight;
            const off = step.offset || globalOffset;
            const factor = off.format === "pixels" ? 1 : h;
            const offset = off.value * factor;
            const marginTop = -offset + step.height;
            const marginBottom = offset - h;
            const rootMargin = `${marginTop}px 0px ${marginBottom}px 0px`;
            const threshold = createProgressThreshold(step.height, progressThreshold);
            const options = { rootMargin, threshold };
            const observer = new IntersectionObserver(intersectProgress, options);
            observer.observe(step.node);
            step.observers.progress = observer;
          }
          function updateProgressObservers() {
            steps.forEach(updateProgressObserver);
          }
          function updateObservers() {
            disconnectObservers();
            updateResizeObservers();
            updateStepObservers();
            if (isProgress)
              updateProgressObservers();
          }
          const S = {};
          S.setup = ({
            step,
            parent,
            offset = 0.5,
            threshold = 4,
            progress = false,
            once = false,
            debug = false,
            container = void 0,
            root = null
          }) => {
            setupScroll(container);
            steps = selectAll(step, parent).map((node, index) => ({
              index,
              direction: void 0,
              height: node.offsetHeight,
              node,
              observers: {},
              offset: parseOffset(node.dataset.offset),
              top: getOffsetTop(node),
              progress: 0,
              state: void 0
            }));
            if (!steps.length) {
              err$1("no step elements");
              return S;
            }
            isProgress = progress;
            isTriggerOnce = once;
            isDebug = debug;
            progressThreshold = Math.max(1, +threshold);
            globalOffset = parseOffset(offset);
            containerElement = container;
            rootElement = root;
            reset();
            indexSteps(steps);
            handleEnable(true);
            return S;
          };
          S.enable = () => {
            handleEnable(true);
            return S;
          };
          S.disable = () => {
            handleEnable(false);
            return S;
          };
          S.destroy = () => {
            handleEnable(false);
            reset();
            return S;
          };
          S.resize = () => {
            updateObservers();
            return S;
          };
          S.offset = (x) => {
            if (x === null || x === void 0)
              return globalOffset.value;
            globalOffset = parseOffset(x);
            updateObservers();
            return S;
          };
          S.onStepEnter = (f) => {
            if (typeof f === "function")
              cb.stepEnter = f;
            else
              err$1("onStepEnter requires a function");
            return S;
          };
          S.onStepExit = (f) => {
            if (typeof f === "function")
              cb.stepExit = f;
            else
              err$1("onStepExit requires a function");
            return S;
          };
          S.onStepProgress = (f) => {
            if (typeof f === "function")
              cb.stepProgress = f;
            else
              err$1("onStepProgress requires a function");
            return S;
          };
          return S;
        }
        return scrollama2;
      });
    }
  });

  // src/map.ts
  var import_scrollama = __toESM(require_scrollama());
  var canvas;
  var ctx;
  var allMarkers = [];
  var years = [];
  var worldData = null;
  var centerHistory = [];
  var currentYearIndex = 0;
  var totalMilesCovered = 0;
  var introStartTime = 0;
  var introCompleted = false;
  var currentStep = "intro";
  var stepProgress = 0;
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
        return !feature.geometry.coordinates[0].some((coord) => coord[1] < -60);
      } else if (feature.geometry.type === "MultiPolygon") {
        return !feature.geometry.coordinates.some(
          (polygon) => polygon[0].some((coord) => coord[1] < -60)
        );
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
  function calculateCenterForYear(year) {
    const yearIdx = years.indexOf(year);
    if (yearIdx < 0)
      return null;
    const markersUpToYear = allMarkers.filter((m) => {
      const markerYearIdx = years.indexOf(m.year);
      return markerYearIdx >= 0 && markerYearIdx <= yearIdx;
    });
    if (markersUpToYear.length === 0)
      return null;
    let totalLat = 0;
    let totalLon = 0;
    markersUpToYear.forEach((marker) => {
      totalLat += marker.lat;
      totalLon += marker.lon;
    });
    return {
      lat: totalLat / markersUpToYear.length,
      lon: totalLon / markersUpToYear.length
    };
  }
  function drawMap(opacity = 1) {
    if (!worldData)
      return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.save();
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = opacity;
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
    if (centerHistory.length > 0 && currentYearIndex >= 0) {
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = "#ff3333";
      ctx.lineWidth = 4;
      ctx.shadowColor = "#ff0000";
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
    const markersUpToCurrent = allMarkers.filter((m) => {
      const markerYearIdx = years.indexOf(m.year);
      return markerYearIdx >= 0 && markerYearIdx <= currentYearIndex;
    });
    if (markersUpToCurrent.length > 0) {
      let totalLat = 0;
      let totalLon = 0;
      markersUpToCurrent.forEach((marker) => {
        totalLat += marker.lat;
        totalLon += marker.lon;
      });
      const centerLat = totalLat / markersUpToCurrent.length;
      const centerLon = totalLon / markersUpToCurrent.length;
      const centerPos = latLonToPixel(centerLat, centerLon, width, height);
      ctx.globalAlpha = opacity;
      ctx.shadowColor = "#0066ff";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "#0066ff";
      ctx.beginPath();
      ctx.arc(centerPos.x, centerPos.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = opacity * 0.4;
    ctx.fillStyle = "#1aff00";
    allMarkers.forEach((marker) => {
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
  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  function render() {
    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);
    if (currentStep === "intro") {
      const elapsed = Date.now() - introStartTime;
      let titleOpacity = 0;
      let titleOffset = 0;
      if (elapsed < 1500) {
        titleOpacity = elapsed / 1500;
        titleOffset = (1 - titleOpacity) * 100;
      } else {
        titleOpacity = 1;
        titleOffset = 0;
      }
      let subtitleOpacity = 0;
      let subtitleOffset = 0;
      if (elapsed > 2e3 && elapsed < 3500) {
        subtitleOpacity = (elapsed - 2e3) / 1500;
        subtitleOffset = (1 - subtitleOpacity) * 100;
      } else if (elapsed >= 3500) {
        subtitleOpacity = 1;
        subtitleOffset = 0;
      }
      let scrollOpacity = 0;
      let scrollOffset = 0;
      if (elapsed >= 4e3) {
        if (elapsed < 5500) {
          scrollOpacity = (elapsed - 4e3) / 1500;
          scrollOffset = (1 - scrollOpacity) * 100;
        } else {
          scrollOpacity = 1;
          scrollOffset = 0;
          introCompleted = true;
        }
      }
      const scrollUpOffset = stepProgress * height;
      ctx.globalAlpha = titleOpacity;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 72px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("The World of Basketball", width / 2, height / 2 - 100 + titleOffset - scrollUpOffset);
      ctx.globalAlpha = subtitleOpacity;
      ctx.font = "32px sans-serif";
      ctx.fillStyle = "#cccccc";
      ctx.fillText("An Essay About Human Extinction", width / 2, height / 2 - 20 + subtitleOffset - scrollUpOffset);
      if (elapsed >= 4e3) {
        const pulse = introCompleted ? Math.sin(Date.now() / 500) * 0.3 + 0.7 : 1;
        ctx.globalAlpha = scrollOpacity * pulse;
        ctx.fillStyle = "#ffffff";
        ctx.font = "48px sans-serif";
        ctx.fillText("\u2193", width / 2, height / 2 + 80 + scrollOffset - scrollUpOffset);
        ctx.globalAlpha = scrollOpacity * 0.7 * pulse;
        ctx.font = "24px sans-serif";
        ctx.fillText("scroll", width / 2, height / 2 + 140 + scrollOffset - scrollUpOffset);
      }
      ctx.globalAlpha = 1;
    } else if (currentStep === "map") {
      const mapY = height * (1 - stepProgress);
      ctx.save();
      ctx.translate(0, mapY);
      drawMap(stepProgress);
      ctx.restore();
    } else if (currentStep === "years") {
      drawMap();
      updateYearDisplay();
    }
  }
  function updateYearDisplay() {
    const yearDisplay = document.getElementById("year-display");
    const milesDisplay = document.getElementById("miles-display");
    if (currentYearIndex >= 0 && currentYearIndex < years.length) {
      yearDisplay.textContent = years[currentYearIndex];
      yearDisplay.style.display = "block";
      let distance = 0;
      for (let i = 1; i <= currentYearIndex; i++) {
        const prev = centerHistory[i - 1];
        const curr = centerHistory[i];
        distance += haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
      }
      totalMilesCovered = distance;
      milesDisplay.textContent = `${Math.round(totalMilesCovered).toLocaleString()} miles`;
      milesDisplay.style.display = "block";
    } else {
      yearDisplay.style.display = "none";
      milesDisplay.style.display = "none";
    }
  }
  async function initMap() {
    canvas = document.getElementById("map");
    ctx = canvas.getContext("2d");
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      render();
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    introStartTime = Date.now();
    function animate() {
      render();
      requestAnimationFrame(animate);
    }
    animate();
    worldData = await loadWorldGeoJSON();
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
    const scrollContainer = document.getElementById("scroll-container");
    years.forEach((year, index) => {
      const step = document.createElement("div");
      step.className = "step";
      step.id = `year-${index}`;
      scrollContainer.appendChild(step);
    });
    setTimeout(() => {
      setupScrollama();
    }, 5500);
  }
  function setupScrollama() {
    const scroller = (0, import_scrollama.default)();
    scroller.setup({
      step: ".step",
      offset: 0.5,
      progress: true
    }).onStepEnter((response) => {
      const stepId = response.element.id;
      if (stepId === "intro-step") {
        currentStep = "intro";
        stepProgress = 0;
      } else if (stepId === "map-step") {
        currentStep = "map";
        stepProgress = 0;
      } else if (stepId.startsWith("year-")) {
        currentStep = "years";
        const yearIndex = parseInt(stepId.split("-")[1]);
        currentYearIndex = yearIndex;
      }
    }).onStepProgress((response) => {
      stepProgress = response.progress;
      if (response.element.id === "intro-step") {
        currentStep = "intro";
      } else if (response.element.id === "map-step") {
        currentStep = "map";
      }
    });
  }
  initMap();
})();
