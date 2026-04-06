// ── NAVBAR SCROLL EFFECT ─────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ── HAMBURGER ─────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');

hamburger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', isOpen);
});

mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// Close menu on outside click
document.addEventListener('click', (e) => {
  if (!navbar.contains(e.target)) {
    mobileMenu.classList.remove('open');
  }
});

// ── SMOOTH SCROLL ─────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ── INTERSECTION OBSERVER (fade-in on scroll) ─────────────────
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -40px 0px' };

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      // stagger children if parent
      const el = entry.target;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      observer.unobserve(el);
    }
  });
}, observerOptions);

// Animate cards with stagger
const animatableSelectors = '.feature-card, .step, .tcard, .pricing-card, .tbadge';
document.querySelectorAll(animatableSelectors).forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(32px)';
  el.style.transition = `opacity 0.6s ease ${(i % 4) * 80}ms, transform 0.6s ease ${(i % 4) * 80}ms`;
  observer.observe(el);
});

// Section headers
document.querySelectorAll('.section-header').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
  observer.observe(el);
});

// ── ACTIVE NAV LINK ON SCROLL ─────────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => link.classList.remove('active'));
      const activeLink = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
      if (activeLink) activeLink.classList.add('active');
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => sectionObserver.observe(s));

// ── MOCKUP BAR TICKER ─────────────────────────────────────────
const activities = [
  'Factura #0048 procesada · RD$12,400',
  'NCF validado · B0100000124',
  'Reporte 606 generado · Marzo 2026',
  'Factura #0049 categorizada · Servicios',
];
let actIdx = 0;
const urlEl = document.querySelector('.mockup-url');
if (urlEl) {
  setInterval(() => {
    urlEl.style.opacity = '0';
    setTimeout(() => {
      actIdx = (actIdx + 1) % (activities.length + 1);
      urlEl.textContent = actIdx === 0 ? 'app.fluxia.do/dashboard' : activities[actIdx - 1];
      urlEl.style.opacity = '1';
    }, 300);
  }, 3000);
  urlEl.style.transition = 'opacity 0.3s ease';
}
