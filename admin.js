(function () {
    const state = { products: [], leads: [], versions: [], tickets: [], clientes: [], currentUser: null };
    const login = document.getElementById('adminLogin');
    const denied = document.getElementById('adminDenied');
    const panel = document.getElementById('adminPanel');
    const feedback = document.getElementById('adminFeedback');
    const loginFeedback = document.getElementById('adminLoginFeedback');

    const headers = () => ({ 'Content-Type': 'application/json' });

    const escapeHtml = (value) => String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const showFeedback = (message, type = 'success') => {
        feedback.hidden = false;
        feedback.className = `form-feedback ${type}`;
        feedback.textContent = message;
    };

    const showLoginFeedback = (message, type = 'error') => {
        loginFeedback.hidden = false;
        loginFeedback.className = `form-feedback ${type}`;
        loginFeedback.textContent = message;
    };

    const api = async (url, options = {}) => {
        const response = await fetch(url, {
            ...options,
            headers: { ...headers(), ...(options.headers || {}) }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro na operação.');
        return data;
    };

    const specToText = (specs) => Object.entries(specs || {})
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

    const textToSpec = (text) => {
        const specs = {};
        text.split('\n').map((line) => line.trim()).filter(Boolean).forEach((line) => {
            const [key, ...rest] = line.split(':');
            if (key && rest.length) specs[key.trim()] = rest.join(':').trim();
        });
        return specs;
    };

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
        reader.onerror = () => reject(new Error('Não foi possível ler o PDF.'));
        reader.readAsDataURL(file);
    });

    const normalizeCode = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9+._-]/g, '');

    const defaultTypeByCode = (code, family) => {
        const text = normalizeCode(code);
        if (text.includes('RJ45')) return family === 'SFP' ? 'Transceptor SFP RJ45' : 'Transceptor RJ45';
        if (text.includes('2733') || text.includes('3327') || text.includes('3155') || text.includes('5531')) return `${family} BiDi`.replace('SFP BiDi', 'Transceptor SFP BiDi');
        if (text.includes('SR') || text.includes('850')) return `${family} SR`.replace('SFP SR', 'Transceptor SFP SR');
        if (text.includes('LR') || text.includes('1310')) return `${family} LR`.replace('SFP LR', 'Transceptor SFP LR');
        return family === 'QSFP' ? 'Transceptor QSFP' : 'Transceptor SFP';
    };

    const updateSummary = () => {
        document.getElementById('adminTotalProducts').textContent = state.products.length;
        document.getElementById('adminTorProducts').textContent = state.products.filter((product) => (
            product.statusClass === 'tor' || Boolean(product.pdf)
        )).length;
        document.getElementById('adminTotalLeads').textContent = state.leads.length;
    };

    const latestVersionByCode = () => state.versions.reduce((acc, version) => {
        if (!version.code || acc[version.code]) return acc;
        acc[version.code] = version;
        return acc;
    }, {});

    const renderProducts = () => {
        const container = document.getElementById('adminProducts');
        const latest = latestVersionByCode();
        container.innerHTML = state.products.map((product, index) => `
            <article class="admin-card admin-product-card">
                <div class="admin-card-head">
                    <div>
                        <span>${escapeHtml(product.family || 'Produto')}</span>
                        <h3>${escapeHtml(product.name || 'Produto sem nome')}</h3>
                        <small>${escapeHtml(product.type || 'Tipo não informado')}</small>
                        ${latest[product.code] ? `
                            <div class="admin-product-version">
                                <strong>Versão ${escapeHtml(latest[product.code].version || 'atual')}</strong>
                                <span>${escapeHtml(latest[product.code].createdAt || '')}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="admin-card-badges">
                        <em>${escapeHtml(product.category || 'categoria')}</em>
                        <em class="${product.pdf ? 'ok' : 'warn'}">${product.pdf ? 'PDF' : 'sem PDF'}</em>
                        ${latest[product.code] ? '<em class="ok">versionado</em>' : '<em class="warn">sem histórico</em>'}
                    </div>
                </div>

                <div class="admin-form-grid">
                    <div class="form-group">
                        <label>Nome</label>
                        <input data-field="name" data-index="${index}" value="${escapeHtml(product.name)}">
                    </div>
                    <div class="form-group">
                        <label>Código</label>
                        <input data-field="code" data-index="${index}" value="${escapeHtml(product.code)}">
                    </div>
                    <div class="form-group">
                        <label>Categoria</label>
                        <select data-field="category" data-index="${index}">
                            ${['switches', 'access-points', 'transceivers', 'outros'].map((cat) => `<option value="${cat}" ${product.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Família</label>
                        <input data-field="family" data-index="${index}" value="${escapeHtml(product.family)}">
                    </div>
                    <div class="form-group">
                        <label>Tipo</label>
                        <input data-field="type" data-index="${index}" value="${escapeHtml(product.type)}">
                    </div>
                    <div class="form-group">
                        <label>PDF</label>
                        <input data-field="pdf" data-index="${index}" value="${escapeHtml(product.pdf)}">
                    </div>
                </div>

                <div class="admin-text-grid">
                    <div class="form-group">
                        <label>Descrição</label>
                        <textarea rows="3" data-field="description" data-index="${index}">${escapeHtml(product.description)}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Especificações, uma por linha: Campo: valor</label>
                        <textarea rows="6" data-field="specs" data-index="${index}">${escapeHtml(specToText(product.specs))}</textarea>
                    </div>
                </div>

                <div class="admin-card-actions">
                    <a class="btn-small-outline" href="produto-detalhe.html?produto=${encodeURIComponent(product.code || product.name)}" target="_blank" rel="noopener">Visualizar</a>
                    <button type="button" class="btn-small-outline remove-product" data-index="${index}">Remover</button>
                </div>
            </article>
        `).join('');
    };

    const renderLeads = () => {
        const container = document.getElementById('adminLeads');
        container.innerHTML = state.leads.length
            ? state.leads.map((lead) => `
                <article class="admin-card admin-lead-card">
                    <div>
                        <span>${escapeHtml(lead.subject || 'Solicitação')}</span>
                        <h3>${escapeHtml(lead.name || 'Contato sem nome')}</h3>
                        <p>${escapeHtml(lead.message || '')}</p>
                    </div>
                    <aside>
                        <a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email || 'sem email')}</a>
                        <strong>${escapeHtml(lead.phone || 'sem telefone')}</strong>
                        <small>${escapeHtml(lead.createdAt || '')}</small>
                    </aside>
                </article>
            `).join('')
            : '<p class="admin-empty">Nenhuma solicitação recebida ainda.</p>';
    };

    const renderVersions = () => {
        const container = document.getElementById('adminVersions');
        if (!container) return;
        container.innerHTML = state.versions.length
            ? state.versions.slice(0, 20).map((version) => `
                <article class="admin-version-item">
                    <div>
                        <strong>${escapeHtml(version.code || version.action)}</strong>
                        <span>${escapeHtml(version.action === 'product_create' ? 'Produto criado' : version.action === 'product_update' ? 'Produto atualizado' : version.action || 'alteração')} · versão ${escapeHtml(version.version || '-')}</span>
                        <small>${escapeHtml(version.createdAt || '')}</small>
                        ${version.previousPdf ? `<small>PDF anterior: ${escapeHtml(version.previousPdf)}</small>` : ''}
                    </div>
                    <div class="admin-version-actions">
                        ${version.pdf ? `<a href="${escapeHtml(version.pdf)}" target="_blank" rel="noopener">PDF da versão</a>` : ''}
                        ${version.code ? `<a href="produto-detalhe.html?produto=${encodeURIComponent(version.code)}" target="_blank" rel="noopener">Ver produto</a>` : ''}
                    </div>
                </article>
            `).join('')
            : '<p class="admin-empty">Nenhuma versão registrada ainda.</p>';
    };

    const renderTickets = () => {
        const container = document.getElementById('adminTickets');
        if (!state.tickets.length) {
            container.innerHTML = '<p class="admin-empty">Nenhum chamado registrado ainda.</p>';
            return;
        }

        const openCountByEmail = state.tickets.reduce((acc, ticket) => {
            if (ticket.status !== 'respondido') acc[ticket.email] = (acc[ticket.email] || 0) + 1;
            return acc;
        }, {});

        container.innerHTML = state.tickets.slice().reverse().map((ticket) => {
            const isAnswered = ticket.status === 'respondido';
            const otherOpenCount = isAnswered ? 0 : Math.max((openCountByEmail[ticket.email] || 1) - 1, 0);
            const mailtoSubject = encodeURIComponent(`Re: ${ticket.subject || 'Chamado TOR'}`);

            return `
                <article class="admin-card admin-lead-card" data-ticket-id="${escapeHtml(ticket.id)}" data-ticket-email="${escapeHtml(ticket.email)}">
                    <div>
                        <span>${escapeHtml(ticket.subject || 'Chamado')}</span>
                        <h3>${escapeHtml(ticket.name || 'Cliente')}${ticket.organization ? ` · ${escapeHtml(ticket.organization)}` : ''}</h3>
                        <p>${escapeHtml(ticket.message || '')}</p>
                        <em class="${isAnswered ? 'ok' : 'warn'}">${escapeHtml(ticket.status || 'novo')}</em>

                        ${isAnswered ? `
                            <div class="admin-ticket-answered">
                                <strong>Resposta enviada em ${escapeHtml(ticket.repliedAt || '')}</strong>
                                <p>${escapeHtml(ticket.reply || '')}</p>
                            </div>
                        ` : `
                            <div class="admin-ticket-reply-box">
                                <div class="form-group">
                                    <label>Resposta</label>
                                    <textarea rows="3" class="ticket-reply-text" placeholder="Escreva a resposta ao cliente"></textarea>
                                </div>
                                ${otherOpenCount > 0 ? `
                                    <label class="admin-checkbox">
                                        <input type="checkbox" class="ticket-apply-others" checked>
                                        Aplicar esta resposta aos outros ${otherOpenCount} chamado${otherOpenCount > 1 ? 's' : ''} deste e-mail também
                                    </label>
                                ` : ''}
                                <button type="button" class="btn-primary ticket-reply-submit">Marcar como respondido</button>
                            </div>
                        `}
                    </div>
                    <aside>
                        <a href="mailto:${escapeHtml(ticket.email)}?subject=${mailtoSubject}">${escapeHtml(ticket.email || 'sem email')}</a>
                        <strong>${escapeHtml(ticket.phone || 'sem telefone')}</strong>
                        <small>${escapeHtml(ticket.createdAt || '')}</small>
                    </aside>
                </article>
            `;
        }).join('');
    };

    const renderClientes = () => {
        const container = document.getElementById('adminClientes');
        container.innerHTML = state.clientes.length
            ? state.clientes.map((cliente) => `
                <article class="admin-card admin-lead-card">
                    <div>
                        <span>${escapeHtml(cliente.organization || 'Sem empresa')}</span>
                        <h3>${escapeHtml(cliente.name || 'Cliente sem nome')}</h3>
                        <p>${cliente.isAdmin ? '<em class="ok">administrador</em>' : ''}</p>
                    </div>
                    <aside>
                        <a href="mailto:${escapeHtml(cliente.email)}">${escapeHtml(cliente.email || 'sem email')}</a>
                        <strong>${escapeHtml(cliente.phone || 'sem telefone')}</strong>
                        <small>Cadastro: ${escapeHtml(cliente.createdAt || '')}</small>
                    </aside>
                </article>
            `).join('')
            : '<p class="admin-empty">Nenhum cliente cadastrado ainda.</p>';
    };

    const collectProducts = () => {
        document.querySelectorAll('[data-field]').forEach((input) => {
            const index = Number(input.dataset.index);
            const field = input.dataset.field;
            if (field === 'specs') {
                state.products[index].specs = textToSpec(input.value);
            } else {
                state.products[index][field] = input.value.trim();
            }
        });
        updateSummary();
    };

    const loadVersions = async () => {
        const versions = await api('/api/admin/catalog/versions');
        state.versions = versions.versions || [];
        renderVersions();
        renderProducts();
    };

    const loadTickets = async () => {
        const tickets = await api('/api/admin/tickets');
        state.tickets = tickets.tickets || [];
        renderTickets();
    };

    const loadClientes = async () => {
        const clientes = await api('/api/admin/users');
        state.clientes = clientes.users || [];
        renderClientes();
    };

    const loadAll = async () => {
        const catalog = await api('/api/admin/catalog');
        state.products = catalog.products || [];

        const settings = await api('/api/admin/settings');
        document.getElementById('settingEmail').value = settings.email || '';
        document.getElementById('settingPhone').value = settings.phone || '';
        document.getElementById('settingLinkedin').value = settings.linkedin || '';
        document.getElementById('settingInstagram').value = settings.instagram || '';

        const leads = await api('/api/leads');
        state.leads = leads.leads || [];
        renderLeads();

        await loadVersions();
        await loadTickets();
        await loadClientes();
        updateSummary();
    };

    const showLogin = () => {
        login.hidden = false;
        denied.hidden = true;
        panel.hidden = true;
    };

    const showDenied = (email) => {
        login.hidden = true;
        denied.hidden = false;
        panel.hidden = true;
        document.getElementById('adminDeniedEmail').textContent = email || '';
    };

    const showPanel = async () => {
        login.hidden = true;
        denied.hidden = true;
        panel.hidden = false;
        try {
            await loadAll();
            showFeedback('Painel carregado.');
        } catch (error) {
            showFeedback(error.message, 'error');
        }
    };

    const checkSession = async () => {
        try {
            const data = await api('/api/me');
            state.currentUser = data.user || null;
            if (!state.currentUser) {
                showLogin();
                return;
            }
            if (!state.currentUser.isAdmin) {
                showDenied(state.currentUser.email);
                return;
            }
            await showPanel();
        } catch (error) {
            showLogin();
        }
    };

    document.getElementById('adminLoginForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        loginFeedback.hidden = true;
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;

        try {
            await api('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });
            await checkSession();
        } catch (error) {
            showLoginFeedback(error.message || 'Não foi possível entrar.');
        }
    });

    document.getElementById('adminDeniedLogout').addEventListener('click', async () => {
        try {
            await api('/api/logout', { method: 'POST' });
        } catch (error) {
            // ignore
        }
        state.currentUser = null;
        showLogin();
    });

    document.querySelectorAll('[data-admin-tab]').forEach((button) => {
        button.addEventListener('click', () => {
            document.querySelectorAll('[data-admin-tab]').forEach((item) => item.classList.remove('active'));
            button.classList.add('active');
            document.getElementById('tabProducts').hidden = button.dataset.adminTab !== 'products';
            document.getElementById('tabSettings').hidden = button.dataset.adminTab !== 'settings';
            document.getElementById('tabLeads').hidden = button.dataset.adminTab !== 'leads';
            document.getElementById('tabTickets').hidden = button.dataset.adminTab !== 'tickets';
            document.getElementById('tabClientes').hidden = button.dataset.adminTab !== 'clientes';
        });
    });

    document.getElementById('addProduct').addEventListener('click', () => {
        collectProducts();
        state.products.unshift({
            name: 'Novo Produto',
            code: 'NOVO-CODIGO',
            category: 'outros',
            family: 'Linha',
            type: 'Tipo do produto',
            datasheetStatus: 'Datasheet sob consulta',
            statusClass: 'pending',
            pdf: '',
            description: '',
            specs: {}
        });
        renderProducts();
        updateSummary();
    });

    const refreshVersions = document.getElementById('refreshVersions');
    if (refreshVersions) {
        refreshVersions.addEventListener('click', async () => {
            try {
                await loadVersions();
                showFeedback('Histórico de versões atualizado.');
            } catch (error) {
                showFeedback(error.message, 'error');
            }
        });
    }

    const codeInput = document.getElementById('datasheetCode');
    const familyInput = document.getElementById('datasheetFamily');
    const typeInput = document.getElementById('datasheetType');
    if (codeInput && familyInput && typeInput) {
        codeInput.addEventListener('input', () => {
            const code = normalizeCode(codeInput.value);
            codeInput.value = code;
            if (!typeInput.value.trim()) typeInput.value = defaultTypeByCode(code, familyInput.value);
        });
        familyInput.addEventListener('change', () => {
            if (!typeInput.value.trim()) typeInput.value = defaultTypeByCode(codeInput.value, familyInput.value);
        });
    }

    document.getElementById('createFromDatasheet').addEventListener('click', async () => {
        try {
            const fileInput = document.getElementById('datasheetFile');
            const file = fileInput.files && fileInput.files[0];
            const code = normalizeCode(document.getElementById('datasheetCode').value);
            const familyRaw = document.getElementById('datasheetFamily').value;
            const family = familyRaw === 'auto' ? '' : familyRaw;
            const connector = document.getElementById('datasheetConnector').value.trim();
            const fiber = document.getElementById('datasheetFiber').value.trim();
            const specs = {
                Taxa: document.getElementById('datasheetRate').value.trim(),
                Alcance: document.getElementById('datasheetReach').value.trim(),
                'Comprimento de onda': document.getElementById('datasheetWavelength').value.trim(),
                DDM: 'Sim',
                Temperatura: document.getElementById('datasheetTemperature').value.trim()
            };

            if (!file) throw new Error('Selecione o datasheet TOR em PDF.');
            if (connector) specs[connector.toLowerCase().includes('rj45') ? 'Interface' : 'Conector'] = connector;
            if (fiber) specs[fiber.toLowerCase().includes('cat') ? 'Cabo' : 'Fibra'] = fiber;
            Object.keys(specs).forEach((key) => {
                if (!specs[key]) delete specs[key];
            });

            const product = {
                name: code,
                code,
                category: family ? (family === 'SFP' || family === 'QSFP' ? 'transceivers' : 'outros') : '',
                family,
                type: document.getElementById('datasheetType').value.trim() || (code && family ? defaultTypeByCode(code, family) : ''),
                datasheetStatus: 'Datasheet disponível',
                statusClass: 'tor',
                description: document.getElementById('datasheetDescription').value.trim(),
                specs
            };
            Object.keys(product).forEach((key) => {
                if (product[key] === '') delete product[key];
            });

            const contentBase64 = await fileToBase64(file);
            const result = await api('/api/admin/products/datasheet', {
                method: 'POST',
                body: JSON.stringify({
                    product,
                    file: {
                        name: file.name,
                        contentBase64
                    }
                })
            });

            showFeedback(`Produto ${result.product.code} salvo na versão ${result.version}.`);
            fileInput.value = '';
            await loadAll();
        } catch (error) {
            showFeedback(error.message, 'error');
        }
    });

    document.getElementById('adminProducts').addEventListener('click', (event) => {
        if (!event.target.classList.contains('remove-product')) return;
        state.products.splice(Number(event.target.dataset.index), 1);
        renderProducts();
        updateSummary();
    });

    document.getElementById('saveProducts').addEventListener('click', async () => {
        try {
            collectProducts();
            await api('/api/admin/catalog', { method: 'PUT', body: JSON.stringify({ products: state.products }) });
            showFeedback('Produtos salvos.');
        } catch (error) {
            showFeedback(error.message, 'error');
        }
    });

    document.getElementById('saveSettings').addEventListener('click', async () => {
        try {
            const settings = {
                email: document.getElementById('settingEmail').value,
                phone: document.getElementById('settingPhone').value,
                linkedin: document.getElementById('settingLinkedin').value,
                instagram: document.getElementById('settingInstagram').value
            };
            await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });
            showFeedback('Dados institucionais salvos.');
        } catch (error) {
            showFeedback(error.message, 'error');
        }
    });

    document.getElementById('adminTickets').addEventListener('click', async (event) => {
        if (!event.target.classList.contains('ticket-reply-submit')) return;

        const article = event.target.closest('[data-ticket-id]');
        const ticketId = article.dataset.ticketId;
        const replyText = article.querySelector('.ticket-reply-text').value.trim();
        const applyCheckbox = article.querySelector('.ticket-apply-others');
        const applyToOthers = applyCheckbox ? applyCheckbox.checked : false;

        if (!replyText) {
            showFeedback('Escreva a resposta antes de marcar como respondido.', 'error');
            return;
        }

        try {
            const result = await api(`/api/admin/tickets/${encodeURIComponent(ticketId)}/reply`, {
                method: 'POST',
                body: JSON.stringify({ reply: replyText, applyToOthers })
            });
            showFeedback(applyToOthers && result.updatedIds.length > 1
                ? `Resposta aplicada a ${result.updatedIds.length} chamados deste cliente.`
                : 'Chamado marcado como respondido.');
            await loadTickets();
        } catch (error) {
            showFeedback(error.message, 'error');
        }
    });

    checkSession();
})();
