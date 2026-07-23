(function () {
    const isEnglish = window.location.pathname.split('/').includes('en');
    const enPrefix = isEnglish ? '../' : '';

    const pageMap = {
        'index.html': 'index.html',
        'produtos.html': 'produtos.html',
        'produto-detalhe.html': 'produto-detalhe.html',
        'produto-duvidas.html': 'produto-duvidas.html',
        'solucoes.html': 'solucoes.html',
        'conteudo.html': 'conteudo.html',
        'parceiros.html': 'parceiros.html',
        'sobre.html': 'sobre.html',
        'suporte.html': 'suporte.html',
        'garantia.html': 'garantia.html',
        'privacidade.html': 'privacidade.html',
        'trabalhe-conosco.html': 'trabalhe-conosco.html'
    };

    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

    const translations = {
        'Início': 'Home',
        'Produtos': 'Products',
        'Soluções': 'Solutions',
        'Conteúdo': 'Content',
        'Parceiros': 'Partners',
        'Quem Somos': 'About Us',
        'Suporte': 'Support',
        'Solicitar Proposta': 'Request Quote',
        'Solicitar Cotação': 'Request Quote',
        'Falar com a TOR': 'Contact TOR',
        'Ver Catálogo': 'View Catalog',
        'Ver catálogo': 'View catalog',
        'Voltar ao Catálogo': 'Back to Catalog',
        'Catálogo': 'Catalog',
        'Catálogo de Produtos': 'Product Catalog',
        'Módulos SFP': 'SFP Modules',
        'Módulos QSFP': 'QSFP Modules',
        'Módulos ópticos': 'Optical modules',
        'Itens tecnicamente próximos': 'Technically Similar Items',
        'Produtos semelhantes': 'Similar products',
        'Cotação sob consulta': 'Quote on request',
        'Solicite preço, disponibilidade e condições comerciais para este item.': 'Request price, availability and commercial terms for this item.',
        'Solicitar cotação': 'Request quote',
        'Abrir Datasheet': 'Open Datasheet',
        'Destaques': 'Highlights',
        'Documentação técnica': 'Technical documentation',
        'Compatibilidade de aplicação': 'Application compatibility',
        'Contato com a TOR': 'Contact TOR',
        'Ver recursos': 'View resources',
        'Ver aplicações': 'View applications',
        'Falar com a equipe': 'Talk to the team',
        'Interconexões ópticas em redes de alta performance': 'Optical interconnections for high-performance networks',
        'Use os parâmetros do item para validar taxa, alcance, fibra e conector em equipamentos compatíveis.': 'Use the item parameters to validate data rate, reach, fiber and connector on compatible equipment.',
        'Resumo técnico organizado a partir dos dados disponíveis no catálogo TOR.': 'Technical summary organized from the data available in the TOR catalog.',
        'Aplicações típicas para orientar a escolha do módulo dentro de projetos públicos e privados.': 'Typical applications to guide module selection for public and private projects.',
        'Características importantes para validar compatibilidade, operação e documentação do item.': 'Key characteristics to validate compatibility, operation and product documentation.',
        'Área reservada para vídeos técnicos, demonstrações e materiais de aplicação TOR.': 'Reserved area for technical videos, demonstrations and TOR application materials.',
        'Vídeos técnicos em breve': 'Technical videos coming soon',
        'Perguntas rápidas para ajudar na validação do modelo antes da cotação.': 'Quick questions to help validate the model before requesting a quote.',
        'Ver página de dúvidas': 'View questions page',
        'Enviar dúvida técnica': 'Send technical question',
        'Avaliações técnicas': 'Technical reviews',
        'Sem avaliações públicas cadastradas para este item no momento.': 'No public reviews registered for this item at the moment.',
        'Aplicações documentadas': 'Documented applications',
        'Documentos, páginas relacionadas e próximos passos para este produto.': 'Documents, related pages and next steps for this product.',
        'Datasheet do produto': 'Product datasheet',
        'Dúvidas sobre este item': 'Questions about this item',
        'Voltar ao catálogo': 'Back to catalog',
        'Conteúdo técnico TOR': 'TOR technical content',
        'Fabricação e Tecnologia em Telecom': 'Manufacturing and Telecom Technology',
        'Fabricação e tecnologia para telecomunicações': 'Manufacturing and technology for telecommunications',
        'Sobre a TOR': 'About TOR',
        'Por que a TOR': 'Why TOR',
        'Nossos Serviços': 'Our Services',
        'Aplicações': 'Applications',
        'Contato': 'Contact',
        'Visão Geral da Empresa': 'Company Overview',
        'A TOR atua no mercado de telecomunicações com foco em fabricação, tecnologia e evolução contínua do portfólio.': 'TOR operates in the telecommunications market with a focus on manufacturing, technology and continuous portfolio evolution.',
        'Portfólio objetivo': 'Focused portfolio',
        'Documentação de produto': 'Product documentation',
        'Atendimento próximo': 'Close support',
        'Uma estrutura pensada para apoiar a compra e a aplicação dos produtos TOR.': 'A structure designed to support purchasing and application of TOR products.',
        'Fabricação de equipamentos': 'Equipment manufacturing',
        'Catálogo técnico': 'Technical catalog',
        'Datasheets': 'Datasheets',
        'Atendimento especializado': 'Specialized service',
        'Áreas onde os equipamentos TOR podem ser aplicados conforme a necessidade técnica do projeto.': 'Areas where TOR equipment can be applied according to the project technical needs.',
        'Provedores': 'Providers',
        'Data centers': 'Data centers',
        'Empresas e governo': 'Companies and government',
        'Conteúdo e Novidades': 'Content and News',
        'Canais para acompanhar materiais técnicos, atualizações e publicações institucionais da TOR.': 'Channels to follow technical materials, updates and institutional TOR publications.',
        'Conteúdo técnico': 'Technical content',
        'Guias e materiais para escolha de produtos': 'Guides and materials for product selection',
        'Acessar conteúdo': 'Open content',
        'Atualizações institucionais da TOR': 'TOR institutional updates',
        'Abrir LinkedIn': 'Open LinkedIn',
        'Publicações e novidades do dia a dia': 'Posts and daily updates',
        'Abrir Instagram': 'Open Instagram',
        'Fale com a TOR para cotação, dúvidas técnicas ou informações sobre produtos.': 'Contact TOR for quotes, technical questions or product information.',
        'Endereço da Sede:': 'Headquarters address:',
        'Telefone: 0800 000 5978': 'Phone: 0800 000 5978',
        'E-mail: governo@tor.tec.br': 'Email: governo@tor.tec.br',
        'Todos os direitos reservados.': 'All rights reserved.',
        'Garantia e Qualidade': 'Warranty and Quality',
        'Parceiros Tecnológicos': 'Technology Partners',
        'Trabalhe Conosco': 'Careers',
        'A Empresa': 'Company',
        'Contato': 'Contact',
        'Privacidade': 'Privacy',
        'Política de Privacidade': 'Privacy Policy',
        'Enviar': 'Send',
        'Nome': 'Name',
        'Empresa': 'Company',
        'Email': 'Email',
        'Telefone': 'Phone',
        'Mensagem': 'Message',
        'Assunto': 'Subject',
        'Produto': 'Product',
        'Família': 'Family',
        'Taxa': 'Data rate',
        'Alcance': 'Reach',
        'Conector': 'Connector',
        'Fibra': 'Fiber',
        'Documentação': 'Documentation',
        'Sob consulta': 'On request',
        'Sim': 'Yes',
        'Não': 'No',
        'Produto TOR': 'TOR product',
        'Código TOR': 'TOR code'
    };

    const phraseTranslations = [
        ['módulos ópticos TOR no catálogo', 'TOR optical modules in the catalog'],
        ['famílias ópticas em destaque', 'featured optical families'],
        ['canal direto de atendimento', 'direct service channel'],
        ['sede em Santa Rita do Sapucaí', 'headquarters in Santa Rita do Sapucai'],
        ['Produtos fabricados para redes que precisam de desempenho, compatibilidade e clareza técnica.', 'Products manufactured for networks that need performance, compatibility and clear technical information.'],
        ['A TOR Tecnologia e Indústria fabrica equipamentos', 'TOR Tecnologia e Industria manufactures equipment'],
        ['para telecomunicações', 'for telecommunications'],
        ['projetos públicos e privados', 'public and private projects'],
        ['redes públicas e privadas', 'public and private networks'],
        ['Módulos ópticos para expansão de rede', 'Optical modules for network expansion'],
        ['Produtos SFP e QSFP', 'SFP and QSFP products'],
        ['Equipamentos para projetos', 'Equipment for projects'],
        ['alta performance', 'high performance'],
        ['alta capacidade', 'high capacity'],
        ['confiabilidade', 'reliability'],
        ['Interconexões ópticas', 'Optical interconnections'],
        ['Acesso, agregação', 'Access, aggregation'],
        ['Redes públicas e privadas', 'Public and private networks'],
        ['Santa Rita do Sapucaí', 'Santa Rita do Sapucai']
    ];

    const translateValue = (value) => {
        const original = String(value || '');
        const trimmed = normalize(original);
        if (!trimmed) return original;
        let translated = translations[trimmed];
        if (!translated) {
            translated = trimmed;
            phraseTranslations.forEach(([from, to]) => {
                translated = translated.replaceAll(from, to);
            });
            if (translated === trimmed) return original;
        }
        return original.replace(trimmed, translated);
    };

    const translateNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const next = translateValue(node.nodeValue);
            if (next !== node.nodeValue) node.nodeValue = next;
            return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName)) return;

        ['placeholder', 'aria-label', 'title', 'alt', 'value'].forEach((attribute) => {
            if (!node.hasAttribute(attribute)) return;
            node.setAttribute(attribute, translateValue(node.getAttribute(attribute)));
        });
    };

    const translateTree = (root = document.body) => {
        if (!isEnglish || !root) return;
        translateNode(root);
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let node = walker.nextNode();
        while (node) {
            translateNode(node);
            node = walker.nextNode();
        }
    };

    const fixAssetPaths = (root = document) => {
        if (!isEnglish) return;
        root.querySelectorAll('[src^="assets/"], [src^="icons/"]').forEach((element) => {
            element.setAttribute('src', `../${element.getAttribute('src')}`);
        });
        root.querySelectorAll('a[href^="assets/"]').forEach((element) => {
            element.setAttribute('href', `../${element.getAttribute('href')}`);
        });
        root.querySelectorAll('[data-src^="assets/"], [data-src^="icons/"]').forEach((element) => {
            element.setAttribute('data-src', `../${element.getAttribute('data-src')}`);
        });
    };

    const currentFile = () => {
        const file = window.location.pathname.split('/').pop() || 'index.html';
        return pageMap[file] || file;
    };

    const switchUrl = (targetEnglish) => {
        const file = currentFile();
        const query = window.location.search || '';
        const hash = window.location.hash || '';
        return targetEnglish ? `../en/${file}${query}${hash}` : `../${file}${query}${hash}`;
    };

    const injectLanguageSwitch = () => {
        const topbar = document.querySelector('.topbar-right');
        if (!topbar || topbar.querySelector('.language-switch')) return;
        const wrapper = document.createElement('span');
        wrapper.className = 'language-switch';
        wrapper.innerHTML = `
            <a href="${isEnglish ? switchUrl(false) : '#'}" class="${!isEnglish ? 'active' : ''}" lang="pt-BR">PT</a>
            <a href="${isEnglish ? '#' : switchUrl(true)}" class="${isEnglish ? 'active' : ''}" lang="en">EN</a>
        `;
        topbar.appendChild(wrapper);
    };

    const setPageLanguage = () => {
        if (!isEnglish) return;
        document.documentElement.lang = 'en';
        if (document.title.includes('TOR')) {
            document.title = translateValue(document.title);
        }
        document.querySelectorAll('meta[content]').forEach((meta) => {
            meta.setAttribute('content', translateValue(meta.getAttribute('content')));
        });
    };

    const boot = () => {
        setPageLanguage();
        fixAssetPaths();
        injectLanguageSwitch();
        translateTree();

        if (isEnglish) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes') {
                        fixAssetPaths(mutation.target.ownerDocument || document);
                        translateNode(mutation.target);
                        return;
                    }
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) fixAssetPaths(node);
                        translateTree(node);
                    });
                });
            });
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['src', 'href', 'data-src', 'placeholder', 'aria-label', 'title', 'alt']
            });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
