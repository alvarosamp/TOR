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
})();
