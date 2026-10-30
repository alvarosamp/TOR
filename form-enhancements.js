(function () {
    const params = new URLSearchParams(window.location.search);
    const product = params.get('produto');
    const segment = params.get('segmento');
    const campaign = params.get('campanha');
    const requestTypeParam = params.get('tipo');

    const productInterest = document.getElementById('productInterest');
    const segmentInterest = document.getElementById('segmentInterest');
    const requestType = document.getElementById('requestType');
    const subjectField = document.getElementById('subjectField');

    if (requestTypeParam && requestType) {
        const option = Array.from(requestType.options).find((item) => (
            item.textContent.toLowerCase() === requestTypeParam.toLowerCase()
        ));
        if (option) requestType.value = option.value;
    }

    if (product && productInterest) {
        productInterest.value = product;
        if (requestType) requestType.value = 'Orçamento de produto';
        if (subjectField && !subjectField.value) subjectField.value = `Cotação - ${product}`;
    }

    if (segment && segmentInterest) {
        const option = Array.from(segmentInterest.options).find((item) => (
            item.textContent.toLowerCase().includes(segment.toLowerCase())
        ));
        if (option) segmentInterest.value = option.value;
        if (requestType && !requestType.value) requestType.value = 'Projeto de rede';
        if (subjectField && !subjectField.value) subjectField.value = `Projeto para ${segment}`;
    }

    if (campaign && subjectField && !subjectField.value) {
        subjectField.value = `Campanha - ${campaign}`;
    }

    const form = document.getElementById('contactForm');
    if (!form) return;

    const isEnglish = window.location.pathname.split('/').includes('en');
    const nameField = form.querySelector('[name="name"]');
    const organizationField = form.querySelector('[name="organization"]');
    const emailField = form.querySelector('[name="email"]');
    const phoneField = form.querySelector('[name="phone"]');

    fetch('/api/me')
        .then((response) => response.json())
        .then((data) => {
            const user = data.user;
            if (!user) return;

            if (nameField && !nameField.value) nameField.value = user.name || '';
            if (organizationField && !organizationField.value) organizationField.value = user.organization || '';
            if (emailField && !emailField.value) emailField.value = user.email || '';
            if (phoneField && !phoneField.value) phoneField.value = user.phone || '';

            if (!form.querySelector('.account-banner')) {
                const banner = document.createElement('div');
                banner.className = 'account-banner';
                banner.style.cssText = 'margin-bottom:20px;padding:12px 16px;background-color:var(--bg-gray);border:1px solid var(--border-color);font-size:14px;';
                const greeting = isEnglish ? 'Hello' : 'Olá';
                const notYou = isEnglish ? 'Not you?' : 'Não é você?';
                const signOut = isEnglish ? 'Sign out' : 'Sair';
                banner.innerHTML = `${greeting}, <strong>${user.name}</strong> — seus dados foram pré-preenchidos. ${notYou} <a href="#" class="text-link account-banner-logout">${signOut}</a>`;
                form.parentElement.insertBefore(banner, form);
                banner.querySelector('.account-banner-logout').addEventListener('click', async (event) => {
                    event.preventDefault();
                    await fetch('/api/logout', { method: 'POST' });
                    window.location.reload();
                });
            }
        })
        .catch(() => {});

    const showFeedback = (message, type) => {
        const existing = form.querySelector('.form-feedback');
        if (existing) existing.remove();

        const feedback = document.createElement('div');
        feedback.className = `form-feedback ${type}`;
        feedback.textContent = message;
        form.appendChild(feedback);
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton ? submitButton.textContent : '';
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        payload.source = window.location.href;

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Enviando...';
        }

        try {
            const response = await fetch('/api/quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Não foi possível enviar a solicitação.');

            showFeedback(`${data.message} Protocolo: ${data.id}`, 'success');
            form.reset();
        } catch (error) {
            showFeedback(error.message || 'Erro ao enviar. Tente novamente ou ligue para 0800 000 5978.', 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        }
    });
})();
