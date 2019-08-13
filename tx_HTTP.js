const AppVest = require('Appvest').AppVest;
let Setting = require('tx_SettingParams');
const SceneUtil = require('SceneUtil').SceneUtil;
let common = require('common'); //全局变量

let HTTP = cc.Class({
    extends: cc.Component,
    statics: {
        url: null,

        //选择服务器
        chooseUrl: () => {
            switch (window.serverType) {
                case 1://测试服
                    HTTP.accountServer = 'xxxxxxxxxxx';
                    HTTP.accountServerHost = 'xxxxxxxxxxx';
                    break;
                case 2:
                    HTTP.accountServerHost = 'xxxxxxxxxxx';
                    HTTP.accountServer = `http://${AppVest.getServer(HTTP.accountServerHost, '80')}`;

                    break;
            }

            console.log('accountServer: ' + HTTP.accountServer);
        },

        //选择服务器 (支付)
        choosePayUrl: () => {
            return HTTP.atmServer;
        },

        //选择服务器 (提现和存取款)
        chooseKitingAndCunUrl: () => {
            return HTTP.atmServer;
        },

        //发送连接
        sendRequest: (path, data, handler, extraUrl, host = false, retryTime = 1) => {
            if (!HTTP.accountServer) {
                HTTP.chooseUrl();
            }

            const xhr = cc.loader.getXMLHttpRequest();
            xhr.timeout = 5000;

            if (!extraUrl) {
                extraUrl = HTTP.accountServer;
                if (cc.sys.isNative && window.isOpenAppVest) {
                    host = HTTP.accountServerHost;
                }
            }
            const requestURL = extraUrl + path;
            console.log('sendRequest :' + requestURL);
            xhr.open('POST', requestURL, true);
            if (cc.sys.isNative) {
                xhr.setRequestHeader('Accept-Encoding', 'text/html;charset=UTF-8');
                if(window.isOpenAppVest){
                    host && xhr.setRequestHeader('Host', host);//HTTP.ServerHost
                }
            }
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        if (handler) {
                            if(xhr.responseText) {
                                let testErr = JSON.parse(xhr.responseText);
                                if(testErr) {
                                    if (testErr.ErrorCode == 100) {
                                        gd.crossband(testErr.ErroMessage);
                                        gd.removeLoadingPage();

                                        return;
                                    }

                                    if (testErr.ErrorCode == 1001) { // 密码错误处理
                                        if (SceneUtil.getScene() === "start" || SceneUtil.getScene() === "login") {
                                            cc.loader.loadRes ("client/pannelForStart/otherLogin", cc.Prefab, (err, prefab) => {
                                                const item = cc.instantiate(prefab);
                                                item.parent = cc.find("Canvas");
                                                item.getComponent("otherLogin").setLoginInfo(common.UserName);
                                            });
                                        }

                                        Setting.statucode = 2;
                                        // if (testErr.ErroMessage == '签名错误') testErr.ErroMessage = '账号密码错误';
                                        gd.showToast(testErr.ErroMessage);
                                        gd.removeLoadingPage();
                                        gd.Net.removeLoginAnim();
                                        return;
                                    }
                                }
                            }
                            
                            handler(xhr.responseText);
                        }
                    } else {
                        console.log('sendRequest err, status:' + xhr.status + ' responseText:' + xhr.responseText);
                        if (handler) {
                            handler(null);
                        }
                    }
                }
            };
            xhr.onerror = ()=> {
                console.log('xhr onerror:' + xhr.statusText);

                if (window.isOpenAppVest) {
                    //云盾端口可能被关闭
                    HTTP.chooseUrl();
                }

                if(retryTime > 0) {
                    setTimeout(() => {
                        HTTP.sendRequest(path, data, handler, extraUrl, host, retryTime - 1);
                    }, 200);
                } else if (handler){
                    if (SceneUtil.getScene() === "start") {
                        retryTime = 1;
                        let prefabPath = 'client/panel/common_alert/repair_alert';
                        cc.loader.loadRes(prefabPath, cc.Prefab, function (err, prefab) {
                            let newNode = cc.instantiate(prefab);
                            newNode.zIndex = 10;
                            newNode.scale = 1.2;
                            newNode.parent = cc.find('Canvas');
                            newNode.setPosition(0, 0);
                            newNode.getChildByName('layout').getChildByName('comfire').on('click', function (newNode) {
                                newNode.destroy();
                                HTTP.sendRequest(path, data, handler, extraUrl, host, retryTime - 1);
                            }.bind(this, newNode));
                            newNode.getChildByName('layout').getChildByName('cancel').on('click', function (newNode) {
                                newNode.destroy();
                                cc.game.end();
                            }.bind(this, newNode));
                        }.bind(this));                          
                    } else {
                        handler(null);
                    }                  
                }
            };

            let isExist = Object.keys(data);
            if (isExist.length != 0) {
                xhr.send(JSON.stringify(data));
            } else {
                xhr.send();
            }
            return xhr;
        }
    }
});