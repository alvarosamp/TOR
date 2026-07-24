const TOR_PRODUCT_MEDIA_BASE = window.location.pathname.includes('/en/') ? '../' : '';
const torProductImage = (fileName) => `${TOR_PRODUCT_MEDIA_BASE}assets/product-images/tor-labeled/${fileName}?v=20260724-images`;

window.TOR_PRODUCT_MEDIA = {
    QSFP100GSR100M: {
        src: torProductImage('QSFP100GSR100M.png'),
        note: 'Imagem do datasheet'
    },
    QSFP100GLR410KM: {
        src: torProductImage('QSFP100GLR410KM.png'),
        note: 'Imagem do datasheet'
    },
    QSFP40G850NM100M: {
        src: torProductImage('QSFP40G850NM100M.png'),
        note: 'Imagem do datasheet'
    },
    QSFP40GLR410KM: {
        src: torProductImage('QSFP40GLR410KM.png'),
        note: 'Imagem ilustrativa da família QSFP'
    },
    SFP1G315510KM: {
        src: torProductImage('SFP1G315510KM.png'),
        note: 'Imagem ilustrativa da família SFP'
    },
    SFP1G553110KM: {
        src: torProductImage('SFP1G553110KM.png'),
        note: 'Imagem do datasheet'
    },
    SFP1G850NM550M: {
        src: torProductImage('SFP1G850NM550M.png'),
        note: 'Imagem do datasheet'
    },
    SFP1GRJ45100M: {
        src: torProductImage('SFP1GRJ45100M.png'),
        note: 'Imagem do datasheet'
    },
    SFPX10G273310KM: {
        src: torProductImage('SFPX10G273310KM.png'),
        note: 'Imagem do datasheet'
    },
    SFPX10G273320KM: {
        src: torProductImage('SFPX10G273320KM.png'),
        note: 'Imagem do datasheet'
    },
    SFPX10G332710KM: {
        src: torProductImage('SFPX10G332710KM.png'),
        note: 'Imagem do datasheet'
    },
    SFPX10G332720KM: {
        src: torProductImage('SFPX10G332720KM.png'),
        note: 'Imagem do datasheet'
    },
    SFPX10GDLR10KM: {
        src: torProductImage('SFPX10GDLR10KM.png'),
        note: 'Imagem do datasheet'
    },
    SFPX10GDSR300M: {
        src: torProductImage('SFPX10GDSR300M.png'),
        note: 'Imagem do datasheet'
    },
    SFPX10GRJ45100M: {
        src: torProductImage('SFPX10GRJ45100M.png'),
        note: 'Imagem do datasheet'
    },
    SFPX25GDLR10KM: {
        src: torProductImage('SFPX25GDLR10KM.png'),
        note: 'Imagem do datasheet'
    },
    SFPX25GDSR100M: {
        src: torProductImage('SFPX25GDSR100M.png'),
        note: 'Imagem do datasheet'
    }
};

