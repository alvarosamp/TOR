const TOR_PRODUCT_MEDIA_BASE = window.location.pathname.includes('/en/') ? '../' : '';
const torProductImage = (fileName) => `${TOR_PRODUCT_MEDIA_BASE}assets/product-images/tor-labeled/${fileName}?v=20260805-datasheet-carine2`;

window.TOR_PRODUCT_MEDIA = {
    DAC25GXXX: {
        src: torProductImage('DAC25GXXX.png'),
        note: 'Imagem do produto TOR'
    },
    QSFP100GLR410KM: {
        src: torProductImage('QSFP100GLR410KM.png'),
        note: 'Imagem do produto TOR'
    },
    QSFP100GSR100M: {
        src: torProductImage('QSFP100GSR100M.png'),
        note: 'Imagem do produto TOR'
    },
    QSFP40GLR410KM: {
        src: torProductImage('QSFP40GLR410KM.png'),
        note: 'Imagem do produto TOR'
    },
    QSFP40GSR100M: {
        src: torProductImage('QSFP40GSR100M.png'),
        note: 'Imagem do produto TOR'
    },
    SFP10G273310KM: {
        src: torProductImage('SFP10G273310KM.png'),
        note: 'Imagem do produto TOR'
    },
    SFP10G273320KM: {
        src: torProductImage('SFP10G273320KM.png'),
        note: 'Imagem do produto TOR'
    },
    SFP10G332710KM: {
        src: torProductImage('SFP10G332710KM.png'),
        note: 'Imagem do produto TOR'
    },
    SFP10G332720KM: {
        src: torProductImage('SFP10G332720KM.png'),
        note: 'Imagem do produto TOR'
    },
    SFP10GDLR10KM: {
        src: torProductImage('SFP10GDLR10KM.png'),
        note: 'Imagem do produto TOR'
    },
    SFP10GDSR300M: {
        src: torProductImage('SFP10GDSR300M.png'),
        note: 'Imagem do produto TOR'
    },
    SFP10GRJ45100M: {
        src: torProductImage('SFP10GRJ45100M.png'),
        note: 'Imagem do produto TOR'
    },
    SFP1G315510KM: {
        src: torProductImage('SFP1G315510KM.png'),
        note: 'Imagem do produto TOR'
    },
    SFP1G553110KM: {
        src: torProductImage('SFP1G553110KM.png'),
        note: 'Imagem do produto TOR'
    },
    SFP1GDSR550M: {
        src: torProductImage('SFP1GDSR550M.png'),
        note: 'Imagem do produto TOR'
    },
    SFP1GRJ45100M: {
        src: torProductImage('SFP1GRJ45100M.png'),
        note: 'Imagem do produto TOR'
    },
    SFP25GDLR10KM: {
        src: torProductImage('SFP25GDLR10KM.png'),
        note: 'Imagem do produto TOR'
    },
    SFP25GDSR100M: {
        src: torProductImage('SFP25GDSR100M.png'),
        note: 'Imagem do produto TOR'
    }
};
