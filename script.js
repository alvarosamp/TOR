/* ==========================================
   TOR — script.js
   ========================================== */

/* ---- Navbar scroll behavior ---- */
const navbar = document.getElementById('navbar');

const handleNavbarScroll = () => {
    if (window.scrollY > 40) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
};

window.addEventListener('scroll', handleNavbarScroll, { passive: true });

/* ---- Mobile menu ---- */
const hamburger = document.getElementById('hamburger');
const navMenu   = document.getElementById('navMenu');

hamburger.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', isOpen.toString());
    document.body.style.overflow = isOpen ? 'hidden' : '';
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    });
});

/* ---- Smooth scroll (supplemental for older browsers) ---- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

/* ---- Hero particles ---- */
const particlesContainer = document.getElementById('particles');

function createParticles() {
    const count = 18;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');

        const size = Math.random() * 5 + 2;
        const left = Math.random() * 100;
        const delay = Math.random() * 15;
        const duration = Math.random() * 12 + 10;
        const opacity = Math.random() * 0.5 + 0.2;

        p.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${left}%;
            animation-duration: ${duration}s;
            animation-delay: -${delay}s;
            opacity: ${opacity};
        `;
        particlesContainer.appendChild(p);
    }
}

createParticles();

/* ---- Showcase card cycling ---- */
const showcaseCards = document.querySelectorAll('.showcase-card');
let activeIndex = 0;

function cycleCards() {
    showcaseCards[activeIndex].classList.remove('active');
    activeIndex = (activeIndex + 1) % showcaseCards.length;
    showcaseCards[activeIndex].classList.add('active');
}

let cardInterval = setInterval(cycleCards, 3000);

showcaseCards.forEach((card, idx) => {
    card.addEventListener('click', () => {
        clearInterval(cardInterval);
        showcaseCards[activeIndex].classList.remove('active');
        activeIndex = idx;
        card.classList.add('active');
        cardInterval = setInterval(cycleCards, 3000);
    });
});

/* ---- Counter animation ---- */
function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const start = performance.now();

    function step(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease out
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            el.textContent = target;
        }
    }

    requestAnimationFrame(step);
}

/* ---- Intersection Observer for animations ---- */
const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -60px 0px'
};

// Fade-in elements
const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            fadeObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

// Add classes and observe
const fadeEls = [
    { selector: '.product-card',      cls: 'fade-in',       delay: true },
    { selector: '.diferencial-card',  cls: 'fade-in',       delay: true },
    { selector: '.lic-info-card',     cls: 'fade-in',       delay: true },
    { selector: '.process-step',      cls: 'fade-in',       delay: true },
    { selector: '.about-text-col',    cls: 'fade-in-right', delay: false },
    { selector: '.about-image-col',   cls: 'fade-in-left',  delay: false },
    { selector: '.contact-info',      cls: 'fade-in-left',  delay: false },
    { selector: '.contact-form-wrap', cls: 'fade-in-right', delay: false },
    { selector: '.section-header',    cls: 'fade-in',       delay: false },
];

fadeEls.forEach(({ selector, cls, delay }) => {
    document.querySelectorAll(selector).forEach((el, i) => {
        el.classList.add(cls);
        if (delay) {
            el.style.transitionDelay = `${i * 80}ms`;
        }
        fadeObserver.observe(el);
    });
});

// Counter observer (hero stats)
const statNumbers = document.querySelectorAll('.stat-number[data-target]');
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

statNumbers.forEach(el => counterObserver.observe(el));

/* ---- Contact form ---- */
const contactForm = document.getElementById('contactForm');
const submitBtn   = document.getElementById('btn-submit');
const submitText  = document.getElementById('submit-text');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Basic validation
        const nome = document.getElementById('input-nome').value.trim();
        const email = document.getElementById('input-email').value.trim();
        const assunto = document.getElementById('input-assunto').value;
        const mensagem = document.getElementById('input-mensagem').value.trim();

        if (!nome || !email || !assunto || !mensagem) {
            showFormFeedback('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showFormFeedback('Por favor, insira um e-mail válido.', 'error');
            return;
        }

        // Simulate send
        submitBtn.disabled = true;
        submitText.textContent = 'Enviando...';

        await sleep(1400);

        submitText.textContent = '✓ Mensagem Enviada!';
        submitBtn.style.background = 'linear-gradient(135deg, #00b894, #00cec9)';

        showFormFeedback('Mensagem enviada! Entraremos em contato em breve.', 'success');
        contactForm.reset();

        setTimeout(() => {
            submitText.textContent = 'Enviar Mensagem';
            submitBtn.style.background = '';
            submitBtn.disabled = false;
        }, 4000);
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showFormFeedback(message, type) {
    const existing = document.querySelector('.form-feedback');
    if (existing) existing.remove();

    const fb = document.createElement('div');
    fb.classList.add('form-feedback');
    fb.style.cssText = `
        padding: 12px 18px;
        border-radius: 8px;
        font-size: 0.88rem;
        font-weight: 600;
        margin-top: -6px;
        background: ${type === 'success' ? 'rgba(0,184,148,0.1)' : 'rgba(204,16,16,0.1)'};
        border: 1px solid ${type === 'success' ? 'rgba(0,184,148,0.3)' : 'rgba(204,16,16,0.3)'};
        color: ${type === 'success' ? '#00b894' : '#CC1010'};
    `;
    fb.textContent = message;
    contactForm.appendChild(fb);

    setTimeout(() => fb.remove(), 6000);
}

/* ---- Active nav link on scroll ---- */
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav-link');

const activeLinkObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            navLinks.forEach(link => {
                link.style.color = '';
                if (link.getAttribute('href') === `#${id}`) {
                    link.style.color = '#FF6B6B';
                }
            });
        }
    });
}, { threshold: 0.4 });

sections.forEach(s => activeLinkObserver.observe(s));
