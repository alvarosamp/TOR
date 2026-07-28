(function () {
    const state = { token: '', products: [], leads: [] };
    const login = document.getElementById('adminLogin');
    const panel = document.getElementById('adminPanel');
    const feedback = document.getElementById('adminFeedback');

    const headers = () => ({
        'Content-Type': 'application/json',
        'x-admin-token': state.token
    });

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

    const updateSummary = () => {
        document.getElementById('adminTotalProducts').textContent = state.products.length;
        document.getElementById('adminTorProducts').textContent = state.products.filter((product) => (
            product.statusClass === 'tor' || Boolean(product.pdf)
        )).length;
        document.getElementById('adminTotalLeads').textContent = state.leads.length;
    };

    const renderProducts = () => {
        const container = document.getElementById('adminProducts');
        container.innerHTML = state.products.map((product, index) => `
            <article class="admin-card admin-product-card">
                <div class="admin-card-head">
                    <div>
                        <span>${escapeHtml(product.family || 'Produto')}</span>
                        <h3>${escapeHtml(product.name || 'Produto sem nome')}</h3>
                        <small>${escapeHtml(product.type || 'Tipo não informado')}</small>
                    </div>
                    <div class="admin-card-badges">
                        <em>${escapeHtml(product.category || 'categoria')}</em>
                        <em class="${product.pdf ? 'ok' : 'warn'}">${product.pdf ? 'PDF' : 'sem PDF'}</em>
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

    const loadAll = async () => {
        const catalog = await api('/api/admin/catalog');
        state.products = catalog.products || [];
        renderProducts();

        const settings = await api('/api/admin/settings');
        document.getElementById('settingEmail').value = settings.email || '';
        document.getElementById('settingPhone').value = settings.phone || '';
        document.getElementById('settingLinkedin').value = settings.linkedin || '';
        document.getElementById('settingInstagram').value = settings.instagram || '';

        const leads = await api('/api/leads');
        state.leads = leads.leads || [];
        renderLeads();
        updateSummary();
    };

    document.getElementById('adminEnter').addEventListener('click', async () => {
        state.token = document.getElementById('adminToken').value.trim();
        try {
            await loadAll();
            login.hidden = true;
            panel.hidden = false;
            showFeedback('Painel carregado.');
        } catch (error) {
            showFeedback(error.message, 'error');
        }
    });

    document.querySelectorAll('[data-admin-tab]').forEach((button) => {
        button.addEventListener('click', () => {
            document.querySelectorAll('[data-admin-tab]').forEach((item) => item.classList.remove('active'));
            button.classList.add('active');
            document.getElementById('tabProducts').hidden = button.dataset.adminTab !== 'products';
            document.getElementById('tabSettings').hidden = button.dataset.adminTab !== 'settings';
            document.getElementById('tabLeads').hidden = button.dataset.adminTab !== 'leads';
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
})();
