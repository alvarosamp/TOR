(function () {
    const toggleBtn = document.getElementById('mobile-toggle');
    const mobileNav = document.getElementById('mobile-nav');

    if (!toggleBtn || !mobileNav) return;

    toggleBtn.addEventListener('click', () => {
        toggleBtn.classList.toggle('active');
        mobileNav.classList.toggle('active');
    });

    document.querySelectorAll('.mobile-nav-list a').forEach((link) => {
        link.addEventListener('click', () => {
            toggleBtn.classList.remove('active');
            mobileNav.classList.remove('active');
        });
    });
})();
