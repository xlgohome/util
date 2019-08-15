package com.trqp.game.wxapi;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;

import com.tencent.mm.opensdk.constants.ConstantsAPI;
import com.tencent.mm.opensdk.modelbase.BaseReq;
import com.tencent.mm.opensdk.modelbase.BaseResp;
import com.tencent.mm.opensdk.modelmsg.SendAuth;
import com.tencent.mm.opensdk.openapi.IWXAPIEventHandler;

import org.cocos2dx.javascript.AppActivity;


public class WXEntryActivity extends Activity implements IWXAPIEventHandler {
    public static final int RETURN_MSG_TYPE_LOGIN = 1;
    public static final int RETURN_MSG_TYPE_SHARE = 2;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        AppActivity.api.handleIntent(getIntent(), this);
    }

    // 微信发送请求到第三方应用时，会回调到该方法
    public void onReq(BaseReq req) {
        Log.v("cocos2d-x", "========== req "+req+" ==========");
    }

    // 第三方应用发送到微信的请求处理后的响应结果，会回调到该方法
    //app发送消息给微信，处理返回消息的回调
    public void onResp(BaseResp resp) {
        switch (resp.errCode) {
            case BaseResp.ErrCode.ERR_AUTH_DENIED:
                Log.v("cocos2d-x", "========== Reason ERR_AUTH_DENIED ==========");
            case BaseResp.ErrCode.ERR_USER_CANCEL:
                Log.v("cocos2d-x", "========== Reason ERR_USER_CANCEL ==========");
                break;
            case BaseResp.ErrCode.ERR_OK:
                Log.v("cocos2d-x", "========== Reason ERR_OK ==========");
                switch (resp.getType()) {
                    case RETURN_MSG_TYPE_LOGIN:
                        String code = ((SendAuth.Resp) resp).code;
                        Log.v("cocos2d-x", "========== code "+code+" ==========");
//                        AppActivity.wxloginfunc(code);
                        break;
                    case RETURN_MSG_TYPE_SHARE:
                        Log.v("cocos2d-x", "========== share success  ==========");
                        AppActivity.wxSharefunc(resp.errCode);
                        break;
                    case ConstantsAPI.COMMAND_PAY_BY_WX:
                        Log.v("cocos2d-x", "========== onPayFinish");
//                        AppActivity.wxPayfunc(resp.errCode);
                }
                break;
            default:
                Log.v("cocos2d-x", "========== Reason default, errCode: " + resp.errCode);
                break;
        }
        finish();
    }
}
