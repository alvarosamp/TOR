(function () {
    const state = { token: '', products: [] };
    const login = document.getElementById('adminLogin');
    const panel = document.getElementById('adminPanel');
    const feedback = document.getElementById('adminFeedback');

    const headers = () => ({
        'Content-Type': 'application/json',
        'x-admin-token': state.token
    });

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

    const specToText = (specs) => Object.entries(specs || {}).map(([key, value]) => `${key}: ${value}`).join('\n');
    const textToSpec = (text) => {
        const specs = {};
        text.split('\n').map((line) => line.trim()).filter(Boolean).forEach((line) => {
            const [key, ...rest] = line.split(':');
            if (key && rest.length) specs[key.trim()] = rest.join(':').trim();
        });
        return specs;
    };

    const renderProducts = () => {
        const container = document.getElementById('adminProducts');
        container.innerHTML = state.products.map((product, index) => `
            <article class="admin-card">
                <div class="form-row">
                    <div class="form-group"><label>Nome</label><input data-field="name" data-index="${index}" value="${product.name || ''}"></div>
                    <div class="form-group"><label>Código</label><input data-field="code" data-index="${index}" value="${product.code || ''}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Categoria</label><select data-field="category" data-index="${index}">
                        ${['switches', 'access-points', 'transceivers', 'outros'].map((cat) => `<option value="${cat}" ${product.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
                    </select></div>
                    <div class="form-group"><label>Família</label><input data-field="family" data-index="${index}" value="${product.family || ''}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Tipo</label><input data-field="type" data-index="${index}" value="${product.type || ''}"></div>
                    <div class="form-group"><label>PDF</label><input data-field="pdf" data-index="${index}" value="${product.pdf || ''}"></div>
                </div>
                <div class="form-group"><label>Descrição</label><textarea rows="3" data-field="description" data-index="${index}">${product.description || ''}</textarea></div>
                <div class="form-group"><label>Especificações, uma por linha: Campo: valor</label><textarea rows="6" data-field="specs" data-index="${index}">${specToText(product.specs)}</textarea></div>
                <button type="button" class="btn-small-outline remove-product" data-index="${index}">Remover</button>
            </article>
        `).join('');
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
    };

    const loadAll = async () => {
        const catalog = await api('/api/admin/catalog');
        state.products = catalog.products;
        renderProducts();

        const settings = await api('/api/admin/settings');
        document.getElementById('settingEmail').value = settings.email || '';
        document.getElementById('settingPhone').value = settings.phone || '';
        document.getElementById('settingLinkedin').value = settings.linkedin || '';
        document.getElementById('settingInstagram').value = settings.instagram || '';

        const leads = await api('/api/leads');
        document.getElementById('adminLeads').innerHTML = leads.leads.length
            ? leads.leads.map((lead) => `<article class="admin-card"><strong>${lead.name}</strong><p>${lead.email} | ${lead.phone || 'sem telefone'}</p><p>${lead.subject}</p><p>${lead.message}</p><small>${lead.createdAt}</small></article>`).join('')
            : '<p>Nenhuma solicitação recebida ainda.</p>';
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
    });

    document.getElementById('adminProducts').addEventListener('click', (event) => {
        if (!event.target.classList.contains('remove-product')) return;
        state.products.splice(Number(event.target.dataset.index), 1);
        renderProducts();
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
