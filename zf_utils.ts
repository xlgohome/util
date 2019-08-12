export class ZfUtil {
    public static fixNumStr(node: cc.Node, value: any) {
        if (node) {
            const label = node.getComponent(cc.Label);
            if (label) {
                switch (typeof value) {
                    case "string":
                        break;
                    case "number":
                        value = parseFloat(value.toFixed(2)).toString();
                        break;
                    default:
                        value = "" + value;
                        break;
                }

                label.string = value;
            }
        }
    }

    public static DecodeGZipString(base64Str: string) {
        let b64Data = atob(base64Str);
        let charData = b64Data.split('').map(function (x) { return x.charCodeAt(0); });

        let binData = new Uint8Array(charData);

        let byteArray = pako.ungzip(binData);
        return this.UTF8ArrayToString(byteArray);
    }

    public static UTF8ArrayToString(array) { // 数据流转化为字符串, 兼容汉字
        let out = "", i = 0, len = array.length, char1, char2, char3, char4;
        while(i < len) {
            char1 = array[i++];
            // 当单个字节时, 最大值 '01111111', 最小值 '00000000' 右移四位 07, 00
            // 当两个字节时, 最大值 '11011111', 最小值 '11000000' 右移四位 13, 12
            // 当三个字节时, 最大值 '11101111', 最小值 '11100000' 右移四位 14, 14
            if (char1 >> 4 <= 7) {
                out += String.fromCharCode(char1);
            } else if (char1 >> 4 == 12 || char1 >> 4 == 13) {
                char2 = array[i++];
                out += String.fromCharCode(((char1 & 0x1F) << 6) | (char2 & 0x3F));
            } else if (char1 >> 4 == 14) {
                char2 = array[i++];
                char3 = array[i++];
                char4 = ((char1 & 0x0F) << 12) | ((char2 & 0x3F) << 6);
                out += String.fromCharCode(char4 | ((char3 & 0x3F)));
            } else {
                char2 = array[i++];
                char3 = array[i++];
                char4 = array[i++];
                out += String.fromCodePoint(((char1 & 0x07) << 12) | 
                    (char2 & 0x3F) << 12 | (char3 & 0x3F) << 6 | (char4 & 0x3F));
            }
        }
        return out;
    }

    /**
     *
     *
     * @static
     * @param {cc.Node} node 节点
     * @param {cc.Node} target 目标节点
     * @param {*} component 目标节点组件名
     * @param {*} handler 处理方法
     * @param {*} [customEventData] 传值
     * @memberof ZfUtil
     */
    public static addToggleItemEvent(node: cc.Node, target: cc.Node, component: any, handler: any, customEventData?: any) {
        const eventHandler = new cc.Component.EventHandler();
        eventHandler.target = target;
        eventHandler.component = component;
        eventHandler.handler = handler;
        eventHandler.customEventData = customEventData;
        const clickEvents = node.getComponent(cc.Toggle).clickEvents;
        clickEvents.push(eventHandler);
    }

    /**
     *
     * 从图集资源中加载某张图片
     * @static
     * @param {string} AtlasPath 图集资源路径
     * @param {string} imgIndex 图集中图片的名字
     * @param {cc.Node} imgNode 需要引用这张图片的节点
     * @memberof ZfUtil
     */
    public static loadingImgFromAtlas(AtlasPath: string, imgIndex: string, imgNode: cc.Node) {
        cc.loader.loadRes(AtlasPath, cc.SpriteAtlas, (err, Atlas) => {
            const sprite = imgNode.getComponent(cc.Sprite);
            const spriteFrame = Atlas.getSpriteFrame(imgIndex);
            sprite.spriteFrame = spriteFrame;
        });
    }

    /**
     *
     *
     * @static
     * @param {string} imgPath 图片路径
     * @param {cc.Node} imgNode 图片节点
     * @returns
     * @memberof ZfUtil
     */
    public static loadingImg(imgPath: string, imgNode: any) {
        if (!imgNode || !imgPath) {
            console.log("loadingImg fail! img:" + imgPath + ",node:" + imgNode);
            return;
        }
        imgNode._img = imgPath;
        cc.loader.loadRes(imgPath, cc.SpriteFrame, (err, spriteFrame) => {
            if (err) {
                console.log("loadingImg " + imgPath + ", err:" + err);
                return;
            }

            if (imgNode._img !== imgPath) {
                return;
            }

            const sprite = imgNode.getComponent(cc.Sprite);
            if (!sprite) {
                console.log("loadingImg err: Sprite is nil!" + imgPath);
                return;
            }
            sprite.spriteFrame = spriteFrame;
        });
    }

    /**
     * 获取节点的世界坐标
     * @param node
     * @static
     */
    public static get_node_world_position(node: cc.Node): cc.Vec2 {
        return node.convertToWorldSpaceAR(cc.Vec2.ZERO);
    }

    /**
     *
     * 坐标系转换代码
     * @static
     * @param {cc.Node} curNode 带转换坐标的节点
     * @param {cc.Node} targetNode 目标节点
     * @returns 坐标
     * @memberof ZfUtil
     */
    public static getNodePos(curNode: cc.Node, targetNode: cc.Node) {
        const worldPos = curNode.parent.convertToWorldSpaceAR(curNode.position);
        const pos = targetNode.convertToNodeSpaceAR(worldPos);
        return pos;
    }

    /**
     * 更新微信头像 若没有使用本地
     *
     * @static
     * @param {string} photoURL
     * @param {cc.Node} photoNode
     * @param {number} [size]
     * @memberof ZfUtil
     */
    public static updateWXPhoto(photoURL: string, photoNode: cc.Node, size?: number) {
        if (photoNode) {
            if (photoURL && photoURL.indexOf("/") === -1) {
                if (photoURL.length < 3) {
                    photoURL = "public/headImage/" + photoURL;
                } else {
                    photoURL = gd.user.UInfo.ImageRootURL + photoURL;
                }
            }

            let filename = photoURL;
            if (photoURL && photoURL.indexOf("http") === 0) {
                if (filename.indexOf("/0", filename.length - 4) > 0) {
                    if (size) {
                        filename = filename.slice(0, -1) + size;
                    } else {
                        filename = filename.slice(0, -1) + "132";
                    }
                }

                cc.loader.load({ url: filename, type: "png" }, (err, texture) => {
                    const spriteComp = photoNode.getComponent(cc.Sprite);
                    if (!err && spriteComp) {
                        spriteComp.spriteFrame = new cc.SpriteFrame(texture);
                    }
                });
            } else {
                if (!filename) {
                    filename = "public/headImage/0";
                }

                cc.loader.loadRes(filename, cc.SpriteFrame, (err, spriteFrame) => {
                    const spriteComp = photoNode.getComponent(cc.Sprite);
                    if (!err && spriteComp) {
                        spriteComp.spriteFrame = spriteFrame;
                    }
                });
            }
        }
    }

    /**
     * 将角度转换为弧度
     * @param angle
     * @static
     */
    public static trans_angle_to_radian(angle: number): number {
        return angle * (Math.PI / 180);
    }

    /**
     * 将弧度转换为角度
     * @param radian
     * @static
     */
    public static trans_radian_to_angle(radian: number): number {
        return radian / (Math.PI / 180);
    }

    /**
     * 三角函数
     * 已知两点 求角度
     * @param {cc.Vec2} start (0,0)的坐标
     * @param {cc.Vec2} end 移动的起始(x, y)或者终点坐标(y, x)
     * @returns 返回角度
     */

    public static angle(start: cc.Vec2, end: cc.Vec2) {
        const diffX = end.x - start.x;
        const diffY = end.y - start.y;
        if (diffX) {
            // 返回角度,不是弧度
            return 360 * Math.atan(diffY / diffX) / (2 * Math.PI);
        } else {
            return 90;
        }
    }

    /**
     * 加载通过动画编辑器制作的动画效果并执行
     *
     * @param {string} pathName 路径名
     * @param {cc.Node} parentNode 父节点
     * @param {() => void} callBack 动画执行结束后的回调函数
     * @memberof ZfUtil
     */
    public static loadingAnim(pathName: string, parentNode: cc.Node, callBack: () => void) {
        cc.loader.loadRes(pathName, cc.Prefab, (err, prefab) => {
            if (err) {
                return;
            }
            const item = cc.instantiate(prefab);
            item.parent = parentNode;
            const anim = item.getComponent(cc.Animation);
            anim.play();
            anim.on("finished", () => {
                item.destroy();
                if (callBack) {
                    callBack();
                }
            });
        });
    }

    /**
     * 加载预制资源 ||等待资源加载
     *
     * @param {string[]} pathArr 路径数组
     * @memberof ZfUtil
     */
    public static waitLoadingRes(pathArr: string[]) {
        if (pathArr && pathArr.length) {
            const tatolResCount = pathArr.length;
            let count = 0;
            const loading = (pathName) => {
                cc.loader.loadResDir(pathName, (err, assets) => {
                    count++;
                    console.log(pathName + "路径下的资源加载完毕");
                    if (tatolResCount === count) {
                        console.log("资源全部加载完毕");
                    }
                });
            };
            for (let k = 0; k < pathArr.length; k++) {
                const pathName = pathArr[k];
                loading(pathName);
            }
        }
    }

    /**
     * 单纯预制生成
     *
     * @param {string} pathName 路径
     * @param {cc.Node} parentNode 父节点 (不是必须)
     * @memberof ZfUtil
     */
    public static commonPrefab(pathName: string, parentNode?: cc.Node) {
        cc.loader.loadRes (pathName, cc.Prefab, (err, prefab) => {
            const item = cc.instantiate(prefab);
            if (parentNode) {
                item.parent = parentNode;
            } else {
                item.parent = cc.find("Canvas");
            }
        });
    }

    /**
     * 载入单个资源
     * - 输出log
     * @param path
     * @param type
     * @static @async
     * @memberof ZfUtil
     */
    public static async loadRes<T extends typeof cc.Asset>(path: string, type: T): Promise<any | null> {
        const res = new Promise((resolve) => {
            cc.loader.loadRes(path, type, (err, resource) => {
                if (err) {
                    cc.error(`@$resource load fail, path=${path}, type=${type}, error=${err}`);
                    resolve(null);
                } else {
                    resolve(resource);
                }
            });
        });
        return res;
    }

    /**
     * 解析text 导入昵称库
     *
     * @static
     * @memberof ZfUtil
     */
    public static readNickName() {
        let strsArray = [];
        cc.loader.loadRes("nickName",  (err, data) => {
            if (err) {
                cc.error(err);
                return;
            }
            // TODO
            // console.log(typeof data);
            strsArray = data.split(new RegExp("\\r\\n|\\r|\\n"));
            // console.log(strsArray);
            return strsArray;
        });
    }

    /**
     * 随机数
     *
     * @static
     * @param {number} lowerValue
     * @param {number} upperValue
     * @returns
     * @memberof ZfUtil
     */
    public static selectFrom(lowerValue: number, upperValue: number) {
        const choices = upperValue - lowerValue + 1;
        return Math.floor(Math.random() * choices + lowerValue);
    }

    /**
     * 比对谁谁谁IP是否相同，传入玩家对象
     *
     * @static
     * @param {object} user
     * @returns
     * @memberof ZfUtil
     */
    public static comparePlayerIp(user: object) {
        const ipObj = {};
        const seats = {};
        for (const userId in user) {
            if (user.hasOwnProperty(userId)) {
                const info = user[userId];
                if (!ipObj[info.IP]) {
                    ipObj[info.IP] = [];
                }
                if (!seats[info.IP]) {
                    seats[info.IP] = [];
                }

                ipObj[info.IP].push(info.Name);
                seats[info.IP].push(info.Seat);
            }
        }
        return {ipObj, seats};
    }

    /**
     * 截取字符串
     *
     * @static
     * @param {string} str
     * @param {number} [endPos=4]
     * @returns
     * @memberof ZfUtil
     */
    public static interceptNickName(str: string, endPos: number = 4) {
        let newStr = "";
        newStr = str;
        if (str.length > endPos) {
            newStr = str.slice(0, endPos) + "…";
        }
        return newStr;
    }

    public static timestampToTime(timestamp: number) {
        const date = new Date(timestamp * 1000); // 时间戳为10位需*1000，时间戳为13位的话不需乘1000
        const Y = date.getFullYear();
        const M = (date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1);
        const D = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
        const h = date.getHours();
        const m = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
        const s = date.getSeconds();
        return {Y, M, D, date: `${Y}年${M}月${D}日`, time: `${h}:${m}`};
    }

    public static fixTimeStr(date: Date) {
        const hour = date.getHours();
        const minute = date.getMinutes();
        const hourStr = hour < 10 ? "0" + hour : hour.toString();
        const minuteStr = minute < 10 ? "0" + minute : minute.toString();
        return hourStr + ":" + minuteStr;
    }

    public static fixDateStr(date: Date) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const monthStr = month < 10 ? "0" + month : month.toString();
        const dayStr = day < 10 ? "0" + day : day.toString();
        return monthStr + "/" + dayStr;
    }

    /**
     * 异步函数中等待一段时间
     * @param time 单位s
     * @static @async
     */
    public static async wait_time(time: number) {
        return new Promise((res) => setTimeout(res, time * 1000));
    }

    // 获得保留两位小数的值
    // 若无小数只取整数
    public static GetValue(value: number) {
        return parseFloat(value.toFixed(2));
    }

    // 數值過大換算 k = 1000 , w = 10000
    public static calcKOrW(value: number) {
        let temp = value.toString();
        if (value >= 10000) {
            temp = `${calc.div(value, 10000)}w`;
        } else if (value >= 1000) {
            temp = `${calc.div(value, 1000)}k`;
        }
        return temp;
    }

    public static getContinuedTime(tseconds: number) {
        let hourse = "0";
        let minutes =
        Math.floor(tseconds / 60) > 10 ? Math.floor(tseconds / 60).toString() : `0${Math.floor(tseconds / 60)}`;
        const seconds =
        Math.floor(tseconds % 60) > 10 ? Math.floor(tseconds % 60).toString() : `0${Math.floor(tseconds % 60)}`;
        if (Number(minutes) >= 60) {
            hourse = Math.floor(Number(minutes) / 60).toString(); // 获取小时，获取分钟除以60，得到整数小时
            minutes = Math.floor(Number(minutes) % 60).toString(); // 获取小时后取佘的分，获取分钟除以60取佘的分
        }
        let str = `${minutes}:${seconds}`;
        if (Number(hourse) !== 0) {
            str = `${hourse}h ${str}`;
        }
        return str;
    }

    // 倒計時 10:11 ---> 10:10
    public static countDown2(clockNode, totalTime: number, callFunc?: any) {
        if (totalTime) {
            clockNode.stopAllActions();
            let minutes =
            Math.floor(totalTime / 60) > 10 ? Math.floor(totalTime / 60).toString() : `0${Math.floor(totalTime / 60)}`;
            let seconds =
            Math.floor(totalTime % 60) > 10 ? Math.floor(totalTime % 60).toString() : `0${Math.floor(totalTime % 60)}`;
            if (clockNode) {
                clockNode.getComponent(cc.Label).string = `${minutes} : ${seconds}`;
            }
            totalTime --;
            const downCountFunc = (totalTimes) => {
                clockNode.runAction(cc.sequence(cc.delayTime(1), cc.callFunc(() => {
                    if (totalTime >= 0) {
                        minutes = Math.floor(totalTime / 60) > 10
                        ? Math.floor(totalTime / 60).toString() : `0${Math.floor(totalTime / 60)}`;
                        seconds = Math.floor(totalTime % 60) > 10
                        ? Math.floor(totalTime % 60).toString() : `0${Math.floor(totalTime % 60)}`;
                        if (clockNode) {
                            clockNode.getComponent(cc.Label).string = `${minutes} : ${seconds}`;
                        }
                        totalTime--;
                        downCountFunc(totalTime);
                    } else {
                        clockNode.active = false;
                        if (callFunc) {
                            callFunc();
                        }
                    }
                })));
            };
            downCountFunc(totalTime);
        }
    }

    // 通用彈窗
    public static commonAlert(str, callFunc1?: any, callFunc2?: any) {
        cc.loader.loadRes("public/pannel/tipsBox", cc.Prefab, (err, prefab) => {
            if (err) {
                console.log("路徑不存在,找不到預製");
                return;
            }
            const item = cc.instantiate(prefab);
            item.parent = cc.find("Canvas");
            item.getComponent("tipsBox").init(str, callFunc1, callFunc2);
        });

    }

    // 限制文字可有長度
    public static limitTeamName(teamName: string, zh = 8, en = 15) {
        const reg = new RegExp("^[a-zA-Z0-9]+$");
        let text = "";
        if (reg.test(teamName)) {
            text = ZfUtil.interceptNickName(teamName, en);
        } else {
            text = ZfUtil.interceptNickName(teamName, zh);
        }
        return text;
    }
}
