const AppVest = require("Appvest").AppVest;
const Imei = require("Imei").Imei;
let Setting = require('tx_SettingParams');
let HTTP = require('tx_HTTP');

let Net = cc.Class({
    extends: cc.Component,
    statics: {
        deviceID: null, //设备信息
        websocket: null,
        lockReconnect: false,//避免重复连接
        msgTeamArr: [],
        msgTeamStatus: false,

        gameKeyMin: 0,
        gameKeyMax: 0,

        hasNet: false,
        socket:window.kf.require('util.socket'),

        //解密用户信息
        decryptInfo() {
            if (gd.login) {
                return;
            }

            console.log('decryptInfo');
            let saveLoginInfo = cc.sys.localStorage.getItem('login');
            if (saveLoginInfo) {
                let loginInfo = JSON.parse(XXTEA.decryptFromBase64(saveLoginInfo, Setting.salt.saveSign));
                if (loginInfo) {
                    gd.login = loginInfo;
                }
            }
        },

        autoLogin(retryTime) {
            if (gd.login && retryTime >= 0) {
                let unixTime = Date.parse(new Date()) / 1000;
                let serverUT = unixTime;
                // let key = md5(Setting.salt.loginSalt2 + md5(Setting.salt.loginSalt1 + gd.login.UT));
                let data = {
                    UT: serverUT,
                    UID: gd.login.UID,
                    IP: AppVest.getClientIp(),
                };
                if (gd.login.PV === 2) {//手机短信登录
                    // data.PWD =  XXTEA.encryptToBase64(gd.login.Token, key);
                    console.log("手机验证码登录");
                    
                    data.PWD = md5(Setting.salt.checkTokenSalt1 + md5(gd.login.Token + gd.login.UID) + unixTime);
                }else{
                    gd.login.PV = 1;
                    data.PWD = gd.login.PWD;
                }
                data.PWDSign = md5(serverUT + 'k9z1m' + data.PWD);
                data.DeviceId = {
                    IMEI: Imei.getImei(),
                    IMSI: gd.getPhoneInfo.getIMSI(),
                    WLANMAC: gd.getPhoneInfo.getWlanMAC(),
                    SYSTEMVERSION: gd.getPhoneInfo.getSystemVersion(),
                    SYSTEMMODEL: gd.getPhoneInfo.getSystemModel(),
                    DEVICEBRAND: gd.getPhoneInfo.getDeviceBrand(),
                };
                data.RVersion = gd.VERSION.RVersion; // 热更版本
                data.PVersion = gd.VERSION.PVersion; // 包版本

                data.DeviceId = JSON.stringify(data.DeviceId);
                // console.log(gd.login.PWD);
                console.log('autoLogin:', JSON.stringify(data));
                HTTP.sendRequest('/login', data, (responseText) => {
                    console.log('login respones:' + responseText);
                    if (responseText) {
                        gd.Net.removeLoginAnim();
                        let temp = JSON.parse(responseText);
                        if (temp.Ret == 1) {
                            let key = md5(Setting.salt.loginSalt2 + md5(Setting.salt.loginSalt1 + temp.UT));

                            gd.login.UT = temp.UT;
                            gd.login.Server = XXTEA.decryptFromBase64(temp.Server, key);
                            gd.login.Token = XXTEA.decryptFromBase64(temp.Token, key);

                            let loginInfo = JSON.stringify(gd.login);
                            cc.sys.localStorage.setItem('login', XXTEA.encryptToBase64(loginInfo, Setting.salt.saveSign));
                            this.createWebSocket();
                            // let normalLoginNode = cc.find('Canvas/normalLogin');
                            // if (normalLoginNode) {
                            //     normalLoginNode.active = false;
                            // }
                            return;
                        }
                    }

                    if (retryTime > 0) {
                        setTimeout(function () {
                            console.log('## retry login:' + retryTime);
                            gd.Net.login(retryTime - 1);
                        }, 200);
                    } else {
                        gd.Net.removeLoginAnim();
                        if (cc.find('Canvas/normalLogin')) {//在登录场景
                            let prefabPath = 'client/panel/common_alert/repair_alert';
                            setTimeout(() => {
                                cc.find('Canvas/normalLogin').active = false;
                            }, 2000);
                            cc.loader.loadRes(prefabPath, cc.Prefab, function (err, prefab) {
                                let newNode = cc.instantiate(prefab);
                                cc.find('title', newNode).getComponent(cc.Label).string = '提示';
                                cc.find('note', newNode).getComponent(cc.Label).string = '连接不上服务器啦，请检查网络!';

                                newNode.zIndex = 10;
                                newNode.scale = 1.2;
                                newNode.parent = cc.find('Canvas');
                                newNode.setPosition(0, 0);
                                newNode.getChildByName('layout').getChildByName('comfire').on('click', function (newNode) {
                                    newNode.destroy();
                                    gd.Net.login(3);
                                }.bind(this, newNode));
                                newNode.getChildByName('layout').getChildByName('cancel').on('click', function (newNode) {
                                    newNode.destroy();
                                    cc.game.end();
                                }.bind(this, newNode));
                            }.bind(this));

                        }
                        else {
                            gd.showToast('登录失败');
                            let normalLoginNode = cc.find('Canvas/normalLogin');
                            if (normalLoginNode) {
                                normalLoginNode.active = false;
                            }
                        }
                    }
                });
            }
        },

        // 建立连接
        createWebSocket() {
            if (this.websocket && this.websocket.readyState == WebSocket.OPEN){
                EventBus.dispatch('WebSocketIsConnected');
                return;
            }
            
            console.log('jsw 开始 创建链接');
            try {
                this.closeWebSocket();
                
                let rep = new RegExp('[^:][0-9]{0,}$');
                let port = rep.exec(gd.login.Server);

                const tmpArr = gd.login.Server.split('//');
                const turl = tmpArr[1].split(':')[0];
                
                let ws;
                if (window.serverType === 1) { // 测试服
                    ws = gd.login.Server;
                } else {
                    ws = `ws://${AppVest.getServer(turl, port[0])}`;
                }
				
                this.websocket = new WebSocket(ws);
                this.initEventHandle();
            } catch (e) {
                console.log('createWebSocket failed! Retry login.');
                this.websocket = null;
                this.login(3);
            }
        },

        //事件处理
        initEventHandle() {
            this.websocket.onopen = () => {
                this.hasNet = true;

                clearTimeout(this.reconnTimeCount);
                clearTimeout(this.sendTimeoutHandler);
                this.lockReconnect = false;
                EventBus.dispatch('WebSocketIsConnected');
                console.log('ws:open');
                let unixTime = gd.login.UT;
        
                gd.requestEvent.CGS(gd.login.UID, unixTime, this.deviceID,
                    md5(Setting.salt.checkTokenSalt1 + md5(gd.login.Token + gd.login.UID) + unixTime), gd.login.PV);

                this.resetHeartBeat();
            };

            this.websocket.onmessage = (msg) => {
                //如果获取到消息，心跳检测重置
                //拿到任何消息都说明当前连接是正常的
                clearTimeout(this.sendTimeoutHandler);
                this.sendTimeoutHandler = null;


                if (!msg.data || msg.data.length < 3) {
                    return;
                }

                let object = JSON.parse(msg.data);
                console.log(new Date().getTime() + '  onmessage:  ', msg.data);
                // 多设备冲突
                if (object.K == -1) {
                    console.log('debug多设备冲突');
                    if (this.HeartBeatHandler) {
                        clearInterval(this.HeartBeatHandler);
                        this.HeartBeatHandler = null;
                    }
                    this.closeWebSocket();

                    gd.showToast('安全警告：您的账号在另一台设备登录，如非本人操作，请修改密码或联系在线客服。');
                    Setting.statucode = 2;// 切换账号 
                    setTimeout(() => {
                        cc.director.loadScene('01_game_login');
                    }, 1000);
                    return;
                }
                if (object.K == '2230' && object.V.Ret != 1) {
                    gd.enterGameIng = false;
                }

                if (object.K == '1630' && object.V.Ret != 1) {
                    gd.enterGameIng = false;
                }

                if (object.K == '99') {
                    gd.crossband('服务未响应，请稍后再试!');
                    gd.removeLoadingPage();
                    gd.enterGameIng = false;
                    return;
                }

                if (this.msgTeamArr.length > 0) {
                    this.msgTeam(object);
                    return;
                }

                this.responseData = object.V;                
                if (object.K) {
                    let res = EventBus.dispatch(object.K, null, object.V);
                    if (!res) {
                        //忽略非当前游戏的消息（不包含大厅）
                        if(object.K >= 200 && this.gameKeyMin > 0 && (object.K < this.gameKeyMin || object.K > this.gameKeyMax)) {
                            console.log('ignore event:' + object.K);
                            return;
                        }
                        this.msgTeam(object);
                    }
                }
            };

            this.websocket.onclose = (e) => {
                console.log('ws:on close');
                console.log('websocket 断开: ' + e.code + ' ' + e.reason + ' ' + e.wasClean);
                this.websocket = null;

                gd.Net.removeLoginAnim();
                let normalLoginNode = cc.find('Canvas/normalLogin');
                if (normalLoginNode) {
                    normalLoginNode.active = false;
                }
            };

            this.websocket.onerror = () => {
                console.log('ws:on error');
                this.closeWebSocket();
                gd.Net.removeLoginAnim();
                
                this.resetHeartBeat(500);
                let normalLoginNode = cc.find('Canvas/normalLogin');
                if (normalLoginNode) {
                    normalLoginNode.active = false;
                }
                // gd.showToast('网络异常，连接已断开！');
            };
        },

        //发送消息
        send(message) {
            console.log(new Date().getTime() + ' send:  ' + message);

            if (this.websocket && this.websocket.readyState == WebSocket.OPEN) {
                if (message && (typeof (message) == 'object')) {
                    message = JSON.stringify(message);
                }

                this.websocket.send(message);

                if (this.sendTimeoutHandler) {
                    clearTimeout(this.sendTimeoutHandler);
                }
                this.sendTimeoutHandler = setTimeout(() => {
                    this.sendTimeoutHandler = null;
                    this.closeWebSocket();
                }, 10000);
            }

            if (!this.websocket) {
                this.decryptInfo();
                if (Setting.statucode === 2) { return; }
                this.login(3);
            }
        },

        msgTeam(obj) {
            console.log('running msgTeam :' + obj.K);

            obj.Time = Date.parse(new Date());
            if (!this.msgTeamStatus) {
                this.msgTeamStatus = true;
                setTimeout(function () {
                    this.dealMsgTeam();
                }.bind(this), 6000);
            }
            this.msgTeamArr.push(obj);
        },

        dealMsgTeam() {
            console.log('running dealMsgTeam!');
            if (this.msgTeamArr.length <= 0) {
                return;
            }

            while (this.msgTeamArr.length > 0) {
                let msg = this.msgTeamArr[0];
                this.responseData = msg.V;
                if(!EventBus.dispatch(msg.K, null, msg.V)) {
                    break;
                }
                this.msgTeamArr.shift();
            }

            let time = Date.parse(new Date());
            while (this.msgTeamArr.length > 0 && time - this.msgTeamArr[0].Time >= 1500) {
                let msg = this.msgTeamArr.shift();
                this.responseData = msg.V;
                EventBus.dispatch(msg.K, null, msg.V);
            }

            if (this.msgTeamArr.length > 0) {
                setTimeout(function () {
                    this.dealMsgTeam();
                }.bind(this), 100);
            } else {
                this.msgTeamStatus = false;
            }
        },

        //注册游戏事件范围，用于忽略非当前游戏事件
        registGameKey(min, max) {
            if(!min || !max || min < 200 || max <= min) {
                console.log('registGameKey err: ' + min + ',' + max);
                return;
            }

            this.gameKeyMax = max;
            this.gameKeyMin = min;
        },

        //主动断开网络连接，不移除心跳检测
        closeWebSocket() {
            this.socket.close();
            if (this.websocket) {
                console.log('closeWebSocket');
                let emptyFunc = function () {
                };

                if (!this.hasNet && this.HeartBeatHandler) {
                    clearInterval(this.HeartBeatHandler);
                    this.HeartBeatHandler = null;
                }

                this.websocket.onmessage = emptyFunc;
                this.websocket.onerror = emptyFunc;
                this.websocket.onclose = emptyFunc;
                this.websocket.close();
                this.websocket = null;
            }
        },

        //注销：断开网络连接，并移除心跳检测
        logout() {
            Setting.loginOutId = gd.login.UID;
            // Setting.loginOutNickName = gd.login.NickName.length > 0 ? gd.login.NickName : ('游客' + gd.login.UID);

            gd.login = '';
            gd.user = {
                lastScene: '02_game_hall',
            };
            // cc.sys.localStorage.removeItem('login');
            Setting.statucode = 1;

            this.closeWebSocket();
            if (this.HeartBeatHandler) {
                clearInterval(this.HeartBeatHandler);
                this.HeartBeatHandler = null;
            }
        },

        login(retryTime) {
            if (this.websocket || !gd.login) {
                return;
            }

            if (this.HeartBeatHandler) {
                clearInterval(this.HeartBeatHandler);
                this.HeartBeatHandler = null;
            }

            this.showLoginAnim();
            console.log('net login function autoLogin');
            this.autoLogin(retryTime);
        },

        resetHeartBeat(IntervalTime = 3000) {
            this.HeartBeatTime = 0;
            if (!this.HeartBeatHandler) {
                this.HeartBeatHandler = setInterval(function () {
                    if (!gd.Net.websocket && Setting.statucode != 2) {
                        this.login(3);
                        return;
                    }

                    gd.Net.HeartBeatTime += IntervalTime / 1000;
                    if (gd.Net.HeartBeatTime % 25 == 0) {
                        gd.Net.websocket.send('');
                    }
                }.bind(this), IntervalTime);
            }
        },

        showLoginAnim() {
            let canvas = cc.find('Canvas');
            canvas.latestScene = cc.director.getScene().name;
            let reconnectNode = cc.find('Canvas/reconnect');
            if (reconnectNode) {
                reconnectNode.getChildByName('text').getComponent(cc.Label).string = '网络不稳定，正在重连中';
                reconnectNode.stopAllActions();
                reconnectNode.runAction(cc.sequence(cc.delayTime(20), cc.removeSelf()));
            } else {
                let prefabPath = 'client/panel/common_alert/reconnect';
                cc.loader.loadRes(prefabPath, function (err, prefab) {
                    let canvas = cc.find('Canvas');
                    if (canvas.latestScene != cc.director.getScene().name) {
                        return;
                    }

                    if (err || cc.find('Canvas/reconnect')) {
                        return;
                    }
                    let newNode = cc.instantiate(prefab);
                    newNode.getChildByName('text').getComponent(cc.Label).string = '';
                    newNode.parent = canvas;
                    newNode.runAction(cc.sequence(cc.delayTime(20), cc.removeSelf()));
                }.bind(this));
            }
        },

        removeLoginAnim() {
            let reconnectNode = cc.find('Canvas/reconnect');
            if (reconnectNode) {
                reconnectNode.destroy();
            }
        }
    }
});