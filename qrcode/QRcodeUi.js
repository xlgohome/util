const QRCode = require("TTQRcode").QRCode;
cc.Class({
    extends: cc.Component,

    drewCode() {
        this.init(gd.responseTextURL);
    },

    init(url) {
        if (this.node.getComponent(cc.Graphics)) {
            this.node.removeComponent(cc.Graphics);
        }
        let ctx = this.node.addComponent(cc.Graphics);
        if (typeof (url) !== 'string') {
            console.log('url is not string', url);
            return;
        }
        this.QRCreate(ctx, url);
    },

    QRCreate(ctx, url) {
        console.log(QRCode);
        
        console.log('url:' + url);
        let qrcode = new QRCode(-1, 2);
        qrcode.addData(url);
        qrcode.make();

        ctx.fillColor = cc.Color.BLACK;
        //块宽高
        let tileW = this.node.width / qrcode.getModuleCount();
        let tileH = this.node.height / qrcode.getModuleCount();

        // draw in the Graphics
        for (let row = 0; row < qrcode.getModuleCount(); row++) {
            for (let col = 0; col < qrcode.getModuleCount(); col++) {
                if (qrcode.isDark(row, col)) {
                    // ctx.fillColor = cc.Color.BLACK;
                    let w = (Math.ceil((col + 1) * tileW) - Math.floor(col * tileW));
                    let h = (Math.ceil((row + 1) * tileW) - Math.floor(row * tileW));
                    ctx.rect(Math.round(col * tileW), Math.round(row * tileH), w, h);
                    ctx.fill();
                }
            }
        }
    }
});