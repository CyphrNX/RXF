const loadingScreen = document.getElementById('loadingScreen');
const heroTitle = document.getElementById('heroTitle');
const cursorDot = document.querySelector('.cursor-dot');
const cursorRing = document.querySelector('.cursor-ring');
const cursorTrail = document.getElementById('cursorTrail');
const audioToggle = document.getElementById('audioToggle');
const nav = document.querySelector('.nav');
const particleLayer = document.getElementById('particleLayer');
const tiltCards = document.querySelectorAll('.tilt-card');
const revealItems = document.querySelectorAll('.reveal');

let audioEnabled = false;
let audioContext;
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let trailX = mouseX;
let trailY = mouseY;

function createParticles() {
  const count = 28;
  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement('span');
    particle.className = 'particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 6}s`;
    particle.style.animationDuration = `${8 + Math.random() * 6}s`;
    particleLayer.appendChild(particle);
  }
}

function splitTitle() {
  if (!heroTitle) return;
  const text = heroTitle.textContent.trim();
  heroTitle.innerHTML = '';
  Array.from(text).forEach((char, index) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = char;
    span.style.transitionDelay = `${index * 70}ms`;
    heroTitle.appendChild(span);
  });

  requestAnimationFrame(() => {
    heroTitle.querySelectorAll('.char').forEach((char) => char.classList.add('is-visible'));
  });
}

function animateValue(element, target) {
  const duration = 1200;
  const start = performance.now();
  const startValue = Number(element.textContent) || 0;
  const from = Number.isFinite(startValue) ? startValue : 0;
  const to = Number(target);

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + (to - from) * eased);
    element.textContent = current;
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function animateStats() {
  const statNumbers = document.querySelectorAll('.stat-number');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const target = Number(entry.target.dataset.target || 0);
      animateValue(entry.target, target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.6 });

  statNumbers.forEach((number) => observer.observe(number));
}

async function loadDiscordMemberCount() {
  const memberStat = document.getElementById('memberCount');
  if (!memberStat) return;

  try {
    const response = await fetch('https://discord.com/api/invite/EAGCkntCbJ?with_counts=true', {
      mode: 'cors'
    });

    if (!response.ok) throw new Error(`Discord request failed with status ${response.status}`);

    const data = await response.json();
    const memberCount = data.approximate_member_count;

    if (typeof memberCount === 'number' && memberCount > 0) {
      memberStat.dataset.target = String(memberCount);
      animateValue(memberStat, memberCount);
    }
  } catch (error) {
    console.warn('Unable to load Discord member count:', error);
  }
}

function revealOnScroll() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  revealItems.forEach((item) => observer.observe(item));
}

function handlePointerMove(event) {
  mouseX = event.clientX;
  mouseY = event.clientY;

  cursorDot.style.left = `${mouseX}px`;
  cursorDot.style.top = `${mouseY}px`;
  cursorRing.style.left = `${mouseX}px`;
  cursorRing.style.top = `${mouseY}px`;

  tiltCards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const distanceX = mouseX - (rect.left + rect.width / 2);
    const distanceY = mouseY - (rect.top + rect.height / 2);
    const distance = Math.hypot(distanceX, distanceY);

    if (distance < 220) {
      const strength = (220 - distance) / 220;
      const rotateX = (distanceY / rect.height) * -8 * strength;
      const rotateY = (distanceX / rect.width) * 8 * strength;
      const translateY = -6 * strength;
      card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(${translateY.toFixed(2)}px)`;
    } else {
      card.style.transform = '';
    }
  });
}

function handlePointerLeave() {
  cursorRing.classList.remove('is-active');
  tiltCards.forEach((card) => {
    card.style.transform = '';
  });
}

function createRipple(event) {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const rect = button.getBoundingClientRect();
  ripple.style.left = `${event.clientX - rect.left}px`;
  ripple.style.top = `${event.clientY - rect.top}px`;
  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 550);
}

function playSound(type) {
  if (!audioEnabled) return;
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    audioContext = new AudioCtx();
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(type === 'click' ? 760 : 520, now);
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.03, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.18);
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  audioToggle.textContent = `Audio: ${audioEnabled ? 'On' : 'Off'}`;
  if (audioEnabled) {
    playSound('hover');
  }
}

function updateTrail() {
  trailX += (mouseX - trailX) * 0.18;
  trailY += (mouseY - trailY) * 0.18;
  cursorTrail.style.left = `${trailX}px`;
  cursorTrail.style.top = `${trailY}px`;
  requestAnimationFrame(updateTrail);
}

function onScroll() {
  nav.classList.toggle('scrolled', window.scrollY > 18);
}

function attachInteractions() {
  document.addEventListener('mousemove', (event) => {
    handlePointerMove(event);
    cursorRing.classList.add('is-active');
  });
  document.addEventListener('mouseleave', handlePointerLeave);
  document.addEventListener('scroll', onScroll, { passive: true });
  document.querySelectorAll('.btn').forEach((button) => {
    button.addEventListener('mouseenter', () => playSound('hover'));
    button.addEventListener('click', (event) => {
      createRipple(event);
      playSound('click');
    });
  });
  document.querySelectorAll('a').forEach((link) => {
    link.addEventListener('mouseenter', () => playSound('hover'));
  });
  audioToggle.addEventListener('click', toggleAudio);
}

window.addEventListener('load', () => {
  setTimeout(() => {
    loadingScreen.classList.add('is-hidden');
  }, 1700);
});

createParticles();
splitTitle();
animateStats();
revealOnScroll();
attachInteractions();
updateTrail();
onScroll();
loadDiscordMemberCount();
