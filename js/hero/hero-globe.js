/*
 * Hero globe: a rotating Earth with a plane flying a fixed route
 * (Tel Aviv - Madrid - New York - Los Angeles - Tokyo - Mumbai - Tel Aviv),
 * after which illustrative importer questions slide in beside it.
 *
 * Purely visual. Reads no user input, stores nothing, and makes no network
 * request: the map libraries and land data are local files loaded before
 * this script (assets/vendor/). If any of them is missing the globe is
 * skipped and the posts still appear.
 */
(function () {
  'use strict';

  const hero = document.querySelector('section.hero');
  if (!hero) return;
  const stage = hero.querySelector('.hero-stage');
  const canvas = hero.querySelector('.hero-globe');
  const posts = Array.from(hero.querySelectorAll('.hero-post'));
  if (!stage || !canvas) return;

  const POSTS_AT_MS = 3000;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // With reduced motion the globe keeps turning, but slowly and without
  // the post slide-in; the pause button stops it entirely.
  const SPEED = reduceMotion ? 0.35 : 1;
  const toggle = hero.querySelector('.hero-globe-toggle');

  // --- Posts ---------------------------------------------------------------
  let postsShown = false;

  function showPosts() {
    if (postsShown) return;
    postsShown = true;
    hero.classList.add('hero-posts-in');
  }

  // --- Globe ---------------------------------------------------------------
  const d3 = window.d3;
  const topojson = window.topojson;
  const landTopo = window.FREIGHTIME_WORLD_LAND_110M;
  const ctx = canvas.getContext && canvas.getContext('2d');

  if (!d3 || !d3.geoOrthographic || !topojson || !landTopo || !ctx) {
    canvas.hidden = true;
    if (toggle) toggle.hidden = true;
    if (reduceMotion) showPosts();
    else setTimeout(showPosts, POSTS_AT_MS);
    return;
  }

  const land = topojson.feature(landTopo, landTopo.objects.land);
  const graticule = d3.geoGraticule10();
  const sphere = { type: 'Sphere' };
  const projection = d3.geoOrthographic().clipAngle(90).precision(0.4);
  const path = d3.geoPath(projection, ctx);

  const TILT = -23.4;  // Earth's axial tilt, used for the view
  const ALT = 0.09;    // cruise altitude as a fraction of the globe radius

  let size = 0;
  let R = 0;
  let cx = 0;
  let cy = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = canvas.getBoundingClientRect().width;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = size * 0.4;
    cx = size / 2;
    cy = size / 2;
    projection.scale(R).translate([cx, cy]);
  }

  // Airport coordinates [lon, lat].
  const CITIES = [
    { name: 'Tel Aviv', at: [34.89, 32.01] },
    { name: 'Madrid', at: [-3.57, 40.47] },
    { name: 'New York', at: [-73.78, 40.64] },
    { name: 'Los Angeles', at: [-118.41, 33.94] },
    { name: 'Tokyo', at: [140.39, 35.77] },
    { name: 'Mumbai', at: [72.87, 19.09] },
  ];
  const STOPS = [0, 1, 2, 3, 4, 5, 0];
  const DEG_PER_MS = 0.024;
  const LAYOVER_MS = 450;

  // Each leg follows the great circle between its two airports.
  const legs = [];
  let clock = 0;
  for (let i = 0; i < STOPS.length - 1; i++) {
    const from = CITIES[STOPS[i]];
    const to = CITIES[STOPS[i + 1]];
    const deg = d3.geoDistance(from.at, to.at) * 180 / Math.PI;
    legs.push({ from, to, interp: d3.geoInterpolate(from.at, to.at), start: clock, dur: deg / DEG_PER_MS });
    clock += LAYOVER_MS + deg / DEG_PER_MS;
  }
  const LOOP_MS = clock + LAYOVER_MS;

  function flightState(time) {
    const t = ((time % LOOP_MS) + LOOP_MS) % LOOP_MS;
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const takeoff = leg.start + LAYOVER_MS;
      if (t < takeoff) return { f: 0, ground: true, at: leg.from.at, next: leg.interp(0.004) };
      if (t < takeoff + leg.dur) {
        const f = (t - takeoff) / leg.dur;
        return {
          f,
          ground: false,
          at: leg.interp(f),
          next: leg.interp(Math.min(f + 0.004, 1)),
          prev: leg.interp(Math.max(f - 0.004, 0)),
        };
      }
    }
    const lastLeg = legs[legs.length - 1];
    return { f: 1, ground: true, at: lastLeg.to.at, next: lastLeg.to.at, prev: lastLeg.interp(0.996) };
  }

  // Climbs after takeoff, descends before landing.
  function altitudeAt(state) {
    if (state.ground) return 0.012;
    const ramp = Math.min(state.f / 0.12, (1 - state.f) / 0.12, 1);
    return 0.012 + (ALT - 0.012) * Math.sin(ramp * Math.PI / 2);
  }

  // Orthographic position on a shell of radius r; z > 0 faces the viewer.
  function toScreen(lonlat, r) {
    const rot = d3.geoRotation(projection.rotate())(lonlat);
    const l = rot[0] * Math.PI / 180;
    const p = rot[1] * Math.PI / 180;
    return { x: cx + r * Math.cos(p) * Math.sin(l), y: cy - r * Math.sin(p), z: Math.cos(p) * Math.cos(l) };
  }

  function behindGlobe(pt) {
    return pt.z < 0 && Math.hypot(pt.x - cx, pt.y - cy) < R;
  }

  function drawPlane(x, y, angle, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = 'rgba(7,27,46,0.55)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.quadraticCurveTo(11, -1.6, 7, -1.7);
    ctx.lineTo(2, -1.7); ctx.lineTo(-3, -11); ctx.lineTo(-6, -11); ctx.lineTo(-3, -1.7);
    ctx.lineTo(-9, -1.5); ctx.lineTo(-11.5, -5.5); ctx.lineTo(-13, -5.5); ctx.lineTo(-12, 0);
    ctx.lineTo(-13, 5.5); ctx.lineTo(-11.5, 5.5); ctx.lineTo(-9, 1.5); ctx.lineTo(-3, 1.7);
    ctx.lineTo(-6, 11); ctx.lineTo(-3, 11); ctx.lineTo(2, 1.7); ctx.lineTo(7, 1.7);
    ctx.quadraticCurveTo(11, 1.6, 13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  let t = 0;
  let last = null;
  let running = false;
  let camLon = -CITIES[0].at[0];
  let camLat = -CITIES[0].at[1] * 0.5 + TILT * 0.4;

  function render() {
    const state = flightState(t);
    const here = state.at;

    // The camera follows the plane, so the Earth turns beneath it.
    const targetLon = -here[0];
    const targetLat = -here[1] * 0.5 + TILT * 0.4;
    camLon += (((targetLon - camLon + 540) % 360) - 180) * 0.06;
    camLat += (targetLat - camLat) * 0.06;
    projection.rotate([camLon, camLat, TILT * 0.35]);

    ctx.clearRect(0, 0, size, size);

    const glow = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.2);
    glow.addColorStop(0, 'rgba(30,111,168,0.55)');
    glow.addColorStop(1, 'rgba(30,111,168,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.2, 0, Math.PI * 2); ctx.fill();

    const ocean = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    ocean.addColorStop(0, '#2A7DB8');
    ocean.addColorStop(0.7, '#14466F');
    ocean.addColorStop(1, '#0B2E4E');
    ctx.beginPath(); path(sphere); ctx.fillStyle = ocean; ctx.fill();

    ctx.beginPath(); path(graticule);
    ctx.strokeStyle = 'rgba(199,216,228,0.10)'; ctx.lineWidth = 0.6; ctx.stroke();

    ctx.beginPath(); path(land);
    ctx.fillStyle = '#4E9488'; ctx.fill();
    ctx.strokeStyle = 'rgba(7,27,46,0.35)'; ctx.lineWidth = 0.5; ctx.stroke();

    const shade = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    shade.addColorStop(0, 'rgba(255,255,255,0.10)');
    shade.addColorStop(0.55, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,20,0.5)');
    ctx.beginPath(); path(sphere); ctx.fillStyle = shade; ctx.fill();

    const alt = altitudeAt(state);
    const plane = toScreen(here, R * (1 + alt));

    // City markers; a label fades while the plane passes over it.
    ctx.font = `600 ${Math.max(10, size * 0.02)}px Assistant, sans-serif`;
    ctx.direction = 'ltr';
    ctx.textBaseline = 'middle';
    CITIES.forEach((city) => {
      const sp = toScreen(city.at, R);
      if (sp.z <= 0.05) return;
      const near = Math.hypot(plane.x - (sp.x + 30), plane.y - (sp.y - 10)) / (size * 0.07);
      ctx.globalAlpha = Math.min(1, sp.z * 3, Math.max(0.15, near)) * 0.9;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(7,27,46,0.75)';
      ctx.strokeText(city.name, sp.x + 7, sp.y - 10);
      ctx.fillText(city.name, sp.x + 7, sp.y - 10);
      ctx.globalAlpha = 1;
    });

    const ahead = toScreen(state.next, R * (1 + alt));
    const behind = state.prev ? toScreen(state.prev, R * (1 + alt)) : plane;
    const angle = Math.atan2(ahead.y - behind.y, (ahead.x - behind.x) || 1e-6);
    const ground = toScreen(here, R);
    if (ground.z > 0 && !state.ground) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(ground.x, ground.y, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (!behindGlobe(plane)) drawPlane(plane.x, plane.y, angle, (size / 520) * (0.8 + 0.4 * (alt / ALT)));
  }

  function frame(now) {
    if (!running) return;
    const dt = last == null ? 16 : Math.min(now - last, 50);
    last = now;
    t += dt * SPEED;
    if (!postsShown && t >= POSTS_AT_MS * SPEED) showPosts();
    render();
    requestAnimationFrame(frame);
  }

  let paused = false;
  let onScreen = !('IntersectionObserver' in window);

  function start() {
    if (running || paused || !onScreen) return;
    running = true;
    last = null;
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', () => { resize(); if (!running) render(); });
  render();

  if (reduceMotion) showPosts();

  // Pause / play, for anyone who wants the motion to stop (WCAG 2.2.2).
  if (toggle) {
    toggle.addEventListener('click', () => {
      paused = !paused;
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.setAttribute('aria-label', paused ? 'הפעלת האנימציה' : 'עצירת האנימציה');
      if (paused) { running = false; showPosts(); } else start();
    });
  }

  // Only animate while the Hero is on screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      onScreen = entries[0].isIntersecting;
      if (onScreen) start();
      else running = false;
    }).observe(stage);
  } else {
    start();
  }
})();
