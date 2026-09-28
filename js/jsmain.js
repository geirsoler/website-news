document.addEventListener('DOMContentLoaded', () => {

    // ===================================================
    // 1. Hamburgermeny & Dropdown
    // ===================================================
    const menuBtn = document.getElementById('menu-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');

    function closeMenu() {
        if (dropdownMenu && menuBtn) {
            dropdownMenu.classList.remove('is-visible');
            menuBtn.classList.remove('is-active');
            menuBtn.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('menu-open');
        }
    }

    if (menuBtn && dropdownMenu) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdownMenu.classList.toggle('is-visible');
            menuBtn.classList.toggle('is-active', isOpen);
            menuBtn.setAttribute('aria-expanded', isOpen);
            document.body.classList.toggle('menu-open', isOpen);
        });

        document.addEventListener('click', (e) => {
            if (!dropdownMenu.contains(e.target) && !menuBtn.contains(e.target)) {
                closeMenu();
            }
        });

        dropdownMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                closeMenu();
            });
        });
    }

    // ===================================================
    // 2. Sentrert «? Top»-knapp (vises kun ved scroll oppover)
    // ===================================================
    const floatingTopBtn = document.getElementById('floating-top-btn');
    let lastScrollY = window.pageYOffset;

    if (floatingTopBtn) {
        window.addEventListener('scroll', () => {
            const currentScrollY = window.pageYOffset;

            // Vises kun om man er minst 350px nede og ruller oppover
            if (currentScrollY > 350 && currentScrollY < lastScrollY) {
                floatingTopBtn.classList.add('is-visible');
            } else {
                floatingTopBtn.classList.remove('is-visible');
            }

            lastScrollY = currentScrollY;
        }, { passive: true });
    }

    // ===================================================
    // 3. Prefill kontaktskjema via URL (?subject=...)
    // ===================================================
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');

    if (subject) {
        const subjectInput = document.getElementById('subject') || document.querySelector('input[name="subject"]');
        if (subjectInput) {
            subjectInput.value = decodeURIComponent(subject);
        }
    }

    // ===================================================
    // 4. Jevn scrolling til kontaktskjema (#contact?subject=...)
    // ===================================================
    document.querySelectorAll('a[href^="#contact?"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            const urlParams = new URLSearchParams(href.split('?')[1]);
            const linkSubject = urlParams.get('subject');

            const contactSection = document.getElementById('contact');
            const subjectField = document.getElementById('subject');
            const messageField = document.getElementById('message');

            if (subjectField && linkSubject) {
                subjectField.value = decodeURIComponent(linkSubject);
            }

            if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => {
                    if (messageField) messageField.focus();
                }, 600);
            }
        });
    });

});