// components.js - Shared Navbar and Footer

const NAVBAR_HTML = `
  <header class="fixed top-0 w-full z-50 glass-nav border-b border-gray-200 dark:border-dark-border transition-all duration-300">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-20">

        <!-- Logo -->
        <a href="index.html" class="flex items-center gap-2 group">
          <div class="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:scale-105 transition-transform">
            <span class="material-symbols-outlined text-white text-2xl">visibility</span>
          </div>
          <span class="text-xl font-bold tracking-tight">Cataract<span class="text-primary-500">Detect</span></span>
        </a>

        <!-- Desktop Nav -->
        <nav class="hidden md:flex items-center gap-8 font-medium text-sm">
          <a href="index.html" class="hover:text-primary-500 transition-colors nav-link">Home</a>
          <a href="how-it-works.html" class="hover:text-primary-500 transition-colors nav-link">How It Works</a>
          <a href="upload.html" class="hover:text-primary-500 transition-colors nav-link">Analyze</a>
          <a href="about.html" class="hover:text-primary-500 transition-colors nav-link">About</a>
          <a href="faq.html" class="hover:text-primary-500 transition-colors nav-link">FAQ</a>
        </nav>

        <!-- Rights -->
        <div class="flex items-center gap-4">
          <!-- Theme Toggle -->
          <button id="themeToggle" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-border transition-colors text-xl">
            🌙
          </button>

          <a href="upload.html" class="hidden md:flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-full font-semibold transition-all shadow-lg hover:shadow-primary-500/25 hover:-translate-y-0.5">
            <span>Get Started</span>
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </a>

          <!-- Mobile Menu -->
          <button id="mobileMenuBtn" class="md:hidden p-2 text-2xl">
            <span class="material-symbols-outlined">menu</span>
          </button>
        </div>

      </div>
    </div>

    <!-- Mobile Nav Dropdown -->
    <div id="mobileMenu" class="hidden md:hidden bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border">
      <nav class="flex flex-col p-4 gap-4 text-center font-medium">
        <a href="index.html" class="text-primary-500">Home</a>
        <a href="how-it-works.html">How It Works</a>
        <a href="upload.html">Analyze Image</a>
        <a href="about.html">About</a>
        <a href="faq.html">FAQ</a>
      </nav>
    </div>
  </header>
`;

const FOOTER_HTML = `
  <footer class="bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border py-12 mt-auto">
    <div class="max-w-7xl mx-auto px-4 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-8">

      <div>
        <div class="flex items-center justify-center md:justify-start gap-2 mb-4">
          <span class="material-symbols-outlined text-primary-500 text-3xl">visibility</span>
          <span class="text-xl font-bold">CataractDetect</span>
        </div>
        <p class="text-gray-500 text-sm max-w-xs">
          AI-powered screening tool for educational and preliminary assessment purposes.
        </p>
      </div>

      <div class="flex gap-8 text-sm font-medium text-gray-600 dark:text-gray-400">
        <a href="privacy.html" class="hover:text-primary-500">Privacy</a>
        <a href="terms.html" class="hover:text-primary-500">Terms</a>
        <a href="contact.html" class="hover:text-primary-500">Contact</a>
      </div>

      <div class="text-gray-400 text-sm">
        &copy; 2024 CataractDetect AI.
      </div>

    </div>
  </footer>
`;

function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        html.classList.add('dark');
        if (themeToggle) themeToggle.textContent = '☀️';
    } else {
        html.classList.remove('dark');
        if (themeToggle) themeToggle.textContent = '🌙';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            html.classList.toggle('dark');
            if (html.classList.contains('dark')) {
                localStorage.setItem('theme', 'dark');
                themeToggle.textContent = '☀️';
            } else {
                localStorage.setItem('theme', 'light');
                themeToggle.textContent = '🌙';
            }
        });
    }
}

function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

function setActiveLink() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('text-primary-600', 'dark:text-primary-500');
        } else {
            link.classList.add('text-gray-600', 'dark:text-gray-300');
        }
    });
}


// Load Components
document.addEventListener('DOMContentLoaded', () => {
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    if (navbarPlaceholder) {
        navbarPlaceholder.innerHTML = NAVBAR_HTML;
        initTheme(); // Re-init listeners since HTML was just injected
        initMobileMenu();
        setActiveLink();
    }

    if (footerPlaceholder) {
        footerPlaceholder.innerHTML = FOOTER_HTML;
    }
});
