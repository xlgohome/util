export class CaptureUtil {
    public static camera: cc.Camera = null;
    public static texture = null;

    /**
     *
     *  生成二维码的方法
     * @static
     * @param {cc.Node} node 二维码节点(锚点必须是0.5，0.5)否则使用背景节点
     * @param {number} groupIndex 绘制的分组(需要把想要绘制的内容放到一个分组里、默认everything、["Everything"、"default"、...])
     * @param {*} [cameraNode]
     * @memberof CaptureUtil
     */
    public static gogogo(node: cc.Node, groupIndex: number, cameraNode?: any) {

        if (!cameraNode) {
            if (!node.children.length) {
                this.createCameraNode(node, groupIndex);
            }
        } else {
            this.camera = cameraNode.getComponent(cc.Camera);
        }
        this.createTexture(node.width, node.width);
        // core
        node.runAction(cc.sequence(cc.delayTime(0.3), cc.callFunc(() => {
            const picData = this.initImage();
            this.showSprite(picData);
            this.saveFile(picData);
        })));
    }

    public static saveFile(picData) {
        if (cc.sys.isNative) {
            const a = Math.random() * 100000;
            const filePath = jsb.fileUtils.getWritablePath() + `game-capture${a}.png`;
            const tWidth = this.texture.width;
            const tHeight = this.texture.height;
            const success = jsb.saveImageData(picData, tWidth, tHeight, filePath);

            if (success) {
                console.log('save image data success, file: ' + filePath);

                if (cc.sys.platform === cc.sys.ANDROID) {
                    console.log('copy image file: ' + filePath);
                    gd.crossband('保存在相册');
                    jsb.reflection.callStaticMethod('org/cocos2dx/javascript/AppActivity',
                    'saveToPhoto', '(Ljava/lang/String;)V', filePath);
                } else {
                    gd.crossband('保存在相册');
                    jsb.reflection.callStaticMethod('AppController', 'saveToPhoto:', filePath);
                }
                // jsb.fileUtils.removeFile(filePath);

            } else {
                console.log('save image data failed!');
            }
        }
    }

    public static showSprite(picData) {
        const tWidth = this.texture.width;
        const tHeight = this.texture.height;
        const texture = new cc.Texture2D();
        texture.initWithData(picData, 32, tWidth, tHeight);

        const spriteFrame = new cc.SpriteFrame();
        spriteFrame.setTexture(texture);

        const node = new cc.Node();
        const sprite = node.addComponent(cc.Sprite);
        sprite.spriteFrame = spriteFrame;

        node.zIndex = cc.macro.MAX_ZINDEX;
        node.parent = cc.director.getScene();
        // set position
        const width = cc.winSize.width;
        const height = cc.winSize.height;
        node.x = width / 2;
        node.y = height / 2;
        node.on(cc.Node.EventType.TOUCH_START, () => {
            node.parent = null;
            node.destroy();
        });
        console.log(node);
        this.captureAction(node, width, height);
    }
    public static captureAction(capture, width, height) {
        const scaleAction = cc.scaleTo(1, 0.3);
        const targetPos = cc.v2(width - width / 6,  height / 4);
        const moveAction = cc.moveTo(1, targetPos);
        const spawn = cc.spawn(scaleAction, moveAction);
        capture.runAction(spawn);
        const blinkAction = cc.blink(0.1, 1);
        // scene action
        cc.find("Canvas").runAction(blinkAction);
    }
    public static initImage() {
        const data = this.texture.readPixels();
        const width = this.texture.width;
        const height = this.texture.height;
        const picData = this.filpYImage(data, width, height);
        return picData;
    }
    public static filpYImage(data, width, height) {
        // create the data array
        const picData = new Uint8Array(width * height * 4);
        const rowBytes = width * 4;
        for (let row = 0; row < height; row++) {
            const srow = height - 1 - row;
            const start = srow * width * 4;
            const reStart = row * width * 4;
            // save the piexls data
            for (let i = 0; i < rowBytes; i++) {
                picData[reStart + i] = data[start + i];
            }
        }
        return picData;
    }
    // 生成纹理
    public static createTexture(width: number, height: number) {
        const texture = new cc.RenderTexture();
        let gl = cc.game._renderContext;
        if (width && height) {
            texture.initWithSize(width, height, gl.STENCIL_INDEX8);
        }
        this.camera.targetTexture = texture;
        this.texture = texture;
    }

    /**
     *
     * 生成camera 节点
     * @static
     * @param {*} pos 生成位置
     * @param {*} parent 父节点
     * @param {*} qrcodeIndex gourp分组中 位于第几个 [everything, default, qrcode]
     * @memberof CaptureUtil
     */
    public static createCameraNode(parentNode: cc.Node, qrcodeIndex: number) {
        const node = new cc.Node("camera");

        node.addComponent(cc.Camera);
        node.getComponent(cc.Camera).cullingMask = qrcodeIndex;
        node.getComponent(cc.Camera).backgroundColor = new cc.Color(0, 0, 0);
        node.getComponent(cc.Camera).clearFlags = 6;  //  color: 1 depth: 2 stencil: 4  => 选用了 depth, stencil
        node.getComponent(cc.Camera).zoomRatio = 1;
        node.getComponent(cc.Camera).depth = 0;

        node.addComponent(cc.Widget);
        node.getComponent(cc.Widget).isAlignHorizontalCenter =  true;
        node.getComponent(cc.Widget).horizontalCenter =  0.5;
        node.getComponent(cc.Widget).isAlignVerticalCenter =  true;
        node.getComponent(cc.Widget).verticalCenter =  0.5;

        node.parent = parentNode;
        this.camera = node.getComponent(cc.Camera);
    }
}
