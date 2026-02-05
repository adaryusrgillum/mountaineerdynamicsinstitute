/* ============================================
   MOUNTAINEER DYNAMICS INSTITUTE
   Main JavaScript
   ============================================ */

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavbar();
    initMobileMenu();
    initCarousel();
    initFAQ();
    initCounters();
    initScrollAnimations();
});

/* ============================================
   NAVIGATION
   ============================================ */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    
    if (!navbar) return;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

/* ============================================
   MOBILE MENU
   ============================================ */
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const mobileClose = document.getElementById('mobileClose');
    
    if (!mobileMenuBtn || !mobileMenu) return;
    
    function openMenu() {
        mobileMenu.classList.add('active');
        mobileOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeMenu() {
        mobileMenu.classList.remove('active');
        mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    mobileMenuBtn.addEventListener('click', openMenu);
    mobileClose?.addEventListener('click', closeMenu);
    mobileOverlay?.addEventListener('click', closeMenu);
    
    // Close on link click
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });
}

/* ============================================
   HERO CAROUSEL
   ============================================ */
let currentSlide = 0;
let slideInterval;

function initCarousel() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    
    if (slides.length === 0) return;
    
    // Start auto-advance
    startAutoAdvance();
    
    // Pause on hover
    const carousel = document.getElementById('heroCarousel');
    if (carousel) {
        carousel.addEventListener('mouseenter', stopAutoAdvance);
        carousel.addEventListener('mouseleave', startAutoAdvance);
    }
}

function showSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    const totalSlides = slides.length;
    
    if (totalSlides === 0) return;
    
    if (index >= totalSlides) currentSlide = 0;
    else if (index < 0) currentSlide = totalSlides - 1;
    else currentSlide = index;
    
    slides.forEach((slide, i) => {
        slide.classList.remove('active');
        if (dots[i]) dots[i].classList.remove('active');
    });
    
    slides[currentSlide].classList.add('active');
    if (dots[currentSlide]) dots[currentSlide].classList.add('active');
}

function changeSlide(direction) {
    showSlide(currentSlide + direction);
    resetAutoAdvance();
}

function goToSlide(index) {
    showSlide(index);
    resetAutoAdvance();
}

function startAutoAdvance() {
    slideInterval = setInterval(() => {
        showSlide(currentSlide + 1);
    }, 5000);
}

function stopAutoAdvance() {
    clearInterval(slideInterval);
}

function resetAutoAdvance() {
    stopAutoAdvance();
    startAutoAdvance();
}

/* ============================================
   FAQ ACCORDION
   ============================================ */
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question?.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all FAQs
            faqItems.forEach(faq => faq.classList.remove('active'));
            
            // Open clicked one (if it wasn't already open)
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

/* ============================================
   ANIMATED COUNTERS
   ============================================ */
function initCounters() {
    const counters = document.querySelectorAll('.counter');
    
    if (counters.length === 0) return;
    
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element) {
    const target = parseFloat(element.dataset.target);
    const isDecimal = target % 1 !== 0;
    const duration = 2000;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out quad
        const easeProgress = 1 - (1 - progress) * (1 - progress);
        const current = easeProgress * target;
        
        element.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = isDecimal ? target.toFixed(1) : target;
        }
    }
    
    requestAnimationFrame(update);
}

/* ============================================
   SCROLL ANIMATIONS
   ============================================ */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.section-header, .course-card, .track-card, .testimonial-card, .blog-card');
    
    if (animatedElements.length === 0) return;
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fadeInUp');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });
}

/* ============================================
   FORM VALIDATION
   ============================================ */
function validateForm(form) {
    const inputs = form.querySelectorAll('[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            showError(input, 'This field is required');
        } else if (input.type === 'email' && !isValidEmail(input.value)) {
            isValid = false;
            showError(input, 'Please enter a valid email');
        } else {
            clearError(input);
        }
    });
    
    return isValid;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(input, message) {
    clearError(input);
    input.classList.add('error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error';
    errorDiv.textContent = message;
    input.parentNode.appendChild(errorDiv);
}

function clearError(input) {
    input.classList.remove('error');
    const error = input.parentNode.querySelector('.form-error');
    if (error) error.remove();
}

/* ============================================
   CART FUNCTIONALITY
   ============================================ */
const Cart = {
    items: [],
    
    init() {
        const saved = localStorage.getItem('mdi_cart');
        if (saved) {
            this.items = JSON.parse(saved);
        }
        this.updateUI();
    },
    
    add(courseId, courseName, price, date, location) {
        const existingItem = this.items.find(item => item.id === courseId && item.date === date);
        
        if (existingItem) {
            existingItem.quantity++;
        } else {
            this.items.push({
                id: courseId,
                name: courseName,
                price: price,
                date: date,
                location: location,
                quantity: 1
            });
        }
        
        this.save();
        this.updateUI();
        this.showNotification(`${courseName} added to cart`);
    },
    
    remove(courseId, date) {
        this.items = this.items.filter(item => !(item.id === courseId && item.date === date));
        this.save();
        this.updateUI();
    },
    
    updateQuantity(courseId, date, quantity) {
        const item = this.items.find(item => item.id === courseId && item.date === date);
        if (item) {
            item.quantity = Math.max(1, quantity);
            this.save();
            this.updateUI();
        }
    },
    
    getTotal() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    },
    
    getCount() {
        return this.items.reduce((count, item) => count + item.quantity, 0);
    },
    
    save() {
        localStorage.setItem('mdi_cart', JSON.stringify(this.items));
    },
    
    clear() {
        this.items = [];
        this.save();
        this.updateUI();
    },
    
    updateUI() {
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = this.getCount();
            cartCount.style.display = this.getCount() > 0 ? 'flex' : 'none';
        }
    },
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.innerHTML = `
            <span>${message}</span>
            <a href="pages/cart.html">View Cart</a>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

// Initialize cart on DOM ready
document.addEventListener('DOMContentLoaded', () => Cart.init());

/* ============================================
   UTILITY FUNCTIONS
   ============================================ */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Smooth scroll for anchor links
document.addEventListener('click', (e) => {
    if (e.target.matches('a[href^="#"]')) {
        e.preventDefault();
        const target = document.querySelector(e.target.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
});

// Export for use in other modules
window.MDI = {
    Cart,
    validateForm,
    formatCurrency,
    formatDate
};
