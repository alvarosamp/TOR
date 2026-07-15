(function () {
    const params = new URLSearchParams(window.location.search);
    const product = params.get('produto');
    const segment = params.get('segmento');
    const campaign = params.get('campanha');

    const productInterest = document.getElementById('productInterest');
    const segmentInterest = document.getElementById('segmentInterest');
    const requestType = document.getElementById('requestType');
    const subjectField = document.getElementById('subjectField');

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
