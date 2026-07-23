(function () {
    const toggleBtn = document.getElementById('mobile-toggle');
    const mobileNav = document.getElementById('mobile-nav');
    const header = document.querySelector('.header');
    const navList = document.querySelector('.main-nav .nav-list');

    if (toggleBtn && mobileNav) {
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
    }

    if (!header || !navList || header.dataset.megaReady === 'true') return;
    header.dataset.megaReady = 'true';

    const megaContent = {
        produtos: {
            eyebrow: 'Catálogo TOR',
            title: 'Módulos ópticos',
            description: 'Navegue por família, taxa e aplicação para chegar rápido ao item correto.',
            columns: [
                {
                    title: 'Familias',
                    links: [
                        ['Módulos SFP', 'produtos.html?categoria=sfp'],
                        ['Módulos QSFP', 'produtos.html?categoria=qsfp'],
                        ['Catálogo completo', 'produtos.html']
                    ]
                },
                {
                    title: 'Taxas',
                    links: [
                        ['1G e 10G', 'produtos.html?categoria=sfp'],
                        ['25G', 'produtos.html?categoria=sfp'],
                        ['40G e 100G', 'produtos.html?categoria=qsfp']
                    ]
                },
                {
                    title: 'Aplicacoes',
                    links: [
                        ['Interconexões ópticas', 'solucoes.html#interconexoes'],
                        ['Provedores', 'solucoes.html#provedores'],
                        ['Data centers', 'solucoes.html#data-centers']
                    ]
                }
            ],
            featured: {
                title: 'Busca assistida',
                text: 'Descreva taxa, alcance ou conector no chatbot para receber indicações do catálogo TOR.',
                href: 'produtos.html',
                label: 'Ver catálogo'
            }
        },
        solucoes: {
            eyebrow: 'Solucoes',
            title: 'Por segmento',
            description: 'Conteúdo organizado para provedores, redes corporativas, data centers e projetos públicos ou privados.',
            columns: [
                {
                    title: 'Segmentos',
                    links: [
                        ['Provedores', 'solucoes.html#provedores'],
                        ['Data centers', 'solucoes.html#data-centers'],
                        ['Redes corporativas', 'solucoes.html#redes-corporativas']
                    ]
                },
                {
                    title: 'Projetos',
                    links: [
                        ['Interconexoes opticas', 'solucoes.html#interconexoes'],
                        ['Projetos públicos', 'solucoes.html#projetos-publicos'],
                        ['Ambientes de missão crítica', 'solucoes.html#data-centers']
                    ]
                },
                {
                    title: 'Apoio',
                    links: [
                        ['Falar com a equipe técnica', 'suporte.html'],
                        ['Conteúdo técnico', 'conteudo.html'],
                        ['Garantia e qualidade', 'garantia.html']
                    ]
                }
            ],
            featured: {
                title: 'Pagina completa',
                text: 'Clique em Soluções para ver os detalhes por aplicação e produtos indicados.',
                href: 'solucoes.html',
                label: 'Abrir soluções'
            }
        },
        sobre: {
            eyebrow: 'Institucional',
            title: 'Conheça a TOR',
            description: 'Acesse rapidamente as áreas institucionais da empresa, serviços, aplicações e canais de contato.',
            columns: [
                {
                    title: 'Empresa',
                    links: [
                        ['Quem Somos', 'sobre.html#quem-somos'],
                        ['Por que a TOR', 'sobre.html#por-que-tor'],
                        ['Nossos Serviços', 'sobre.html#servicos']
                    ]
                },
                {
                    title: 'Atuação',
                    links: [
                        ['Aplicações', 'sobre.html#aplicacoes'],
                        ['Conteúdo e novidades', 'sobre.html#novidades'],
                        ['Parceiros tecnológicos', 'parceiros.html']
                    ]
                },
                {
                    title: 'Contato',
                    links: [
                        ['Falar com a TOR', 'sobre.html#contato'],
                        ['Solicitar proposta', 'suporte.html'],
                        ['Garantia e qualidade', 'garantia.html']
                    ]
                }
            ],
            featured: {
                title: 'Perfil institucional',
                text: 'Veja como a TOR organiza fabricação, catálogo técnico e atendimento para projetos públicos e privados.',
                href: 'sobre.html',
                label: 'Abrir Quem Somos'
            }
        }
    };

    const navLinks = Array.from(navList.querySelectorAll('a'));
    navLinks.forEach((link) => {
        const text = link.textContent.trim().toLowerCase();
        if (text.includes('produtos')) link.dataset.mega = 'produtos';
        if (text.includes('solu')) link.dataset.mega = 'solucoes';
        if (text.includes('quem somos')) link.dataset.mega = 'sobre';
    });

    const mega = document.createElement('div');
    mega.className = 'mega-menu';
    mega.setAttribute('aria-hidden', 'true');
    header.appendChild(mega);

    let closeTimer = null;

    const renderMega = (key) => {
        const content = megaContent[key];
        if (!content) return;

        mega.innerHTML = `
            <div class="container mega-menu-inner">
                <aside class="mega-menu-intro">
                    <span>${content.eyebrow}</span>
                    <h3>${content.title}</h3>
                    <p>${content.description}</p>
                </aside>
                <div class="mega-menu-columns">
                    ${content.columns.map((column) => `
                        <div class="mega-menu-column">
                            <strong>${column.title}</strong>
                            ${column.links.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}
                        </div>
                    `).join('')}
                </div>
                <a class="mega-menu-feature" href="${content.featured.href}">
                    <strong>${content.featured.title}</strong>
                    <span>${content.featured.text}</span>
                    <em>${content.featured.label}</em>
                </a>
            </div>
        `;
        mega.classList.add('active');
        mega.setAttribute('aria-hidden', 'false');
    };

    const scheduleClose = () => {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => {
            mega.classList.remove('active');
            mega.setAttribute('aria-hidden', 'true');
        }, 160);
    };

    navLinks.forEach((link) => {
        if (!link.dataset.mega) return;
        link.addEventListener('mouseenter', () => {
            clearTimeout(closeTimer);
            renderMega(link.dataset.mega);
        });
        link.addEventListener('focus', () => {
            clearTimeout(closeTimer);
            renderMega(link.dataset.mega);
        });
        link.parentElement.addEventListener('mouseleave', scheduleClose);
    });

    mega.addEventListener('mouseenter', () => clearTimeout(closeTimer));
    mega.addEventListener('mouseleave', scheduleClose);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') scheduleClose();
    });

    if (mobileNav && !mobileNav.dataset.megaLinks) {
        mobileNav.dataset.megaLinks = 'true';
        const mobileProducts = mobileNav.querySelector('a[href="produtos.html"]');
        const mobileSolutions = mobileNav.querySelector('a[href="solucoes.html"]');
        const mobileAbout = mobileNav.querySelector('a[href="sobre.html"]');
        const addMobileGroup = (afterLink, links) => {
            if (!afterLink || !afterLink.parentElement) return;
            const group = document.createElement('li');
            group.className = 'mobile-subnav';
            group.innerHTML = links.map(([label, href]) => `<a href="${href}">${label}</a>`).join('');
            afterLink.parentElement.insertAdjacentElement('afterend', group);
        };
        addMobileGroup(mobileProducts, [
            ['Módulos SFP', 'produtos.html?categoria=sfp'],
            ['Módulos QSFP', 'produtos.html?categoria=qsfp']
        ]);
        addMobileGroup(mobileSolutions, [
            ['Provedores', 'solucoes.html#provedores'],
            ['Data centers', 'solucoes.html#data-centers'],
            ['Redes corporativas', 'solucoes.html#redes-corporativas']
        ]);
        addMobileGroup(mobileAbout, [
            ['Por que a TOR', 'sobre.html#por-que-tor'],
            ['Nossos Serviços', 'sobre.html#servicos'],
            ['Contato', 'sobre.html#contato']
        ]);
    }
})();
