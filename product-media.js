const TOR_PRODUCT_MEDIA_BASE = window.location.pathname.includes('/en/') ? '../' : '';
const torProductImage = (fileName) => `${TOR_PRODUCT_MEDIA_BASE}assets/product-images/tor-labeled/${fileName}?v=20260726-revised`;

window.TOR_PRODUCT_MEDIA = {
    SFP1G315510KM: {
        src: torProductImage('SFP1G315510KM.png'),
        note: 'Imagem do datasheet revisado'
    },
    SFP1G553110KM: {
        src: torProductImage('SFP1G553110KM.png'),
        note: 'Imagem do datasheet revisado'
    },
    SFP1GDSR550M: {
        src: torProductImage('SFP1GDSR550M.png'),
        note: 'Imagem do datasheet revisado'
    },
    SFP1GRJ45100M: {
        src: torProductImage('SFP1GRJ45100M.png'),
        note: 'Imagem do datasheet revisado'
    },
    SFPX10G273310KM: {
        src: torProductImage('SFPX10G273310KM.png'),
        note: 'Imagem do datasheet revisado'
    },
    SFPX10G273320KM: {
        src: torProductImage('SFPX10G273320KM.png'),
        note: 'Imagem do datasheet revisado'
    },
    SFPX10G332710KM: {
        src: torProductImage('SFPX10G332710KM.png'),
        note: 'Imagem do datasheet revisado'
    },
    SFPX10G332720KM: {
        src: torProductImage('SFPX10G332720KM.png'),
        note: 'Imagem do datasheet revisado'
    },
    SFPX10GDLR10KM: {
        src: torProductImage('SFPX10GDLR10KM.png'),
        note: 'Imagem do datasheet revisado'
    },
    SFPX10GDSR300M: {
        src: torProductImage('SFPX10GDSR300M.png'),
        note: 'Imagem do datasheet revisado'
    },
    SFPX10GRJ45100M: {
        src: torProductImage('SFPX10GRJ45100M.png'),
        note: 'Imagem do datasheet revisado'
    }
};
