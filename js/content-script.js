var kadSyncConfig = {
    envConfig: {
        enabledTSTSync: false,
        enabledRCSync: false,
        enabledPRODSync: false
    },
    //TODO 需新增可同步内容时 ：1.配置可同步的url
    canSyncUrl: [
        '/Config/DictConfig/Query', //字典 0
        '/CMS/Layout/Query', //PC布局模板 1
        '/CMS/MLayout/Query', //M布局模板 2
        '/CMS/ELayout/Query', //E布局模板 3
        '/CMS/VLayout/Query', //V布局模板 4
        '/CMS/TLayout/Query', //太安堂PC布局模板 5
        '/CMS/TMLayout/Query', //太安堂M布局模板 6
        '/CMS/WSLayout/Query', //批发布局模板 7
        '/CMS/Widget/Query', //PC内容部件 8
        '/CMS/MWidget/Query', //M内容部件 9
        '/CMS/EWidget/Query', //E内容部件 10
        '/CMS/VWidget/Query', //V内容部件 11
        '/CMS/TWidget/Query', //太安堂PC内容部件 12
        '/CMS/TMWidget/Query', //太安堂M内容部件 13
        '/CMS/WSWidget/Query', //批发内容部件 14
        '/CMS/AdPlace/Query', //广告位 15
        '/CMS/MAdPlace/Query', //广告位 16
        '/CMS/EAdPlace/Query', //广告位 17
        '/CMS/VAdPlace/Query', //广告位 18
        '/CMS/TAdPlace/Query', //广告位 19
        '/CMS/TMAdPlace/Query', //广告位 20
        '/CMS/WSAdPlace/Query', //广告位 21
    ],
    syncData: null,
    syncPopIndex: 0,
    loadingIndex: 0
};

// 注意，必须设置了run_at=document_start 此段代码才会生效
document.addEventListener('DOMContentLoaded', function() {
    // 注入自定义JS
    //injectCustomJs();
});

// 向页面注入JS
function injectCustomJs(jsPath) {
    jsPath = jsPath || 'js/inject.js';
    var temp = document.createElement('script');
    temp.setAttribute('type', 'text/javascript');
    // 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
    temp.src = chrome.extension.getURL(jsPath);
    temp.onload = function() {
        // 放在页面不好看，执行完后移除掉
        this.parentNode.removeChild(this);
    };
    document.body.appendChild(temp);
}

// 接收来自后台的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    kadSyncConfig.enabledSync = true;
    console.log('收到来自 ' + (sender.tab ? "content-script(" + sender.tab.url + ")" : "popup或者background") + ' 的消息：', request);
    if (request.cmd == 'update_font_size') {
        var ele = document.createElement('style');
        ele.innerHTML = `* {font-size: ${request.size}px !important;}`;
        document.head.appendChild(ele);
    } else {
        tip(JSON.stringify(request));
        sendResponse('我收到你的消息了：' + JSON.stringify(request));
    }
});

// 主动发送消息给后台
// 要演示此功能，请打开控制台主动执行sendMessageToBackground()
function sendMessageToBackground(message) {
    chrome.runtime.sendMessage({ greeting: message || '你好，我是content-script呀，我主动发消息给后台！' }, function(response) {
        tip('收到来自后台的回复：' + response);
    });
}

// 监听长连接
chrome.runtime.onConnect.addListener(function(port) {
    console.log(port);
    if (port.name == 'test-connect') {
        port.onMessage.addListener(function(msg) {
            console.log('收到长连接消息：', msg);
            tip('收到长连接消息：' + JSON.stringify(msg));
            if (msg.question == '你是谁啊？') port.postMessage({ answer: '我是你爸！' });
        });
    }
});

window.addEventListener("message", function(e) {
    // console.log('收到消息：', e.data);
    if (e.data && e.data.cmd == 'invoke') {
        eval('(' + e.data.code + ')');
    } else if (e.data && e.data.cmd == 'message') {
        kadSyncConfig.syncData = e.data.data;
        initSyncPop();
    }
}, false);

function initSyncPop() {
    chrome.storage.sync.get(kadSyncConfig.envConfig, function(items) {
        Object.assign(kadSyncConfig.envConfig, items);

        if (!kadSyncConfig.syncData || kadSyncConfig.syncData.resData.Total == 0) {
            return;
        }
        var syncUrlIndex = kadSyncConfig.canSyncUrl.indexOf(kadSyncConfig.syncData.url);
        if (syncUrlIndex == -1) {
            return;
        }

        var btnArr = [];
        var btn1SyncDomain = '';
        var btn2SyncDomain = '';
        switch (location.host) {
            case 'tstmanage.360kad.com':
                if (!kadSyncConfig.envConfig.enabledTSTSync) {
                    return;
                }
                // btnArr = ['同步到RC', '同步到正式', '取消'];
                btnArr = ['同步到RC', '取消'];
                btn1SyncDomain = 'http://rcmanage.360kad.com';
                btn2SyncDomain = 'http://manage.360kad.com';
                break;
            case 'rcmanage.360kad.com':
                if (!kadSyncConfig.envConfig.enabledRCSync) {
                    return;
                }
                // btnArr = ['同步到TST', '同步到正式', '取消'];
                btnArr = ['同步到TST', '取消'];
                btn1SyncDomain = 'http://tstmanage.360kad.com';
                btn2SyncDomain = 'http://manage.360kad.com';
                break;
            case 'manage.360kad.com':
                if (!kadSyncConfig.envConfig.enabledPRODSync) {
                    return;
                }
                btnArr = ['同步到TST', '同步到RC', '取消'];
                btn1SyncDomain = 'http://tstmanage.360kad.com';
                btn2SyncDomain = 'http://rcmanage.360kad.com';
                break;
        }
        var titile = '';
        var contentHtml = '<div class="chrome-ext-checkbox-wrap">';
        //TODO 需新增可同步内容时 ：2.处理可同步的数据选择展示
        switch (syncUrlIndex) {
            //字典
            case 0:
                titile = '请选择需同步的字典(同步会覆盖原数据，请注意风险)';
                for (var i = 0; i < kadSyncConfig.syncData.resData.Rows.length; i++) {
                    var element = kadSyncConfig.syncData.resData.Rows[i];
                    contentHtml += '<input type="checkbox" value="' + element.DictID + '" name="choose-sync-data" id="syncdata-' + element.DictID + '">' +
                        '<label for="syncdata-' + element.DictID + '">' + element.DictID + '</label>';
                }
                break;
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                titile = '请选择需同步的布局模板(同步会覆盖原数据，请注意风险)';
                for (var i = 0; i < kadSyncConfig.syncData.resData.Rows.length; i++) {
                    var element = kadSyncConfig.syncData.resData.Rows[i];
                    contentHtml += '<input type="checkbox" value="' + element.Id + '" name="choose-sync-data" id="syncdata-' + element.Id + '">' +
                        '<label for="syncdata-' + element.Id + '">' + element.Id + '</label>';
                }
                break;
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 13:
            case 14:
                titile = '请选择需同步的部件(同步会覆盖原数据，请注意风险)';
                for (var i = 0; i < kadSyncConfig.syncData.resData.Rows.length; i++) {
                    var element = kadSyncConfig.syncData.resData.Rows[i];
                    contentHtml += '<input type="checkbox" value="' + element.Id + '" name="choose-sync-data" id="syncdata-' + element.Id + '">' +
                        '<label for="syncdata-' + element.Id + '">' + element.Id + '</label>';
                }
                break;
            case 15:
            case 16:
            case 17:
            case 18:
            case 19:
            case 20:
            case 21:
                titile = '请选择需同步的广告位(广告位及广告发布会一起同步，同步会覆盖原数据)';
                for (var i = 0; i < kadSyncConfig.syncData.resData.Rows.length; i++) {
                    var element = kadSyncConfig.syncData.resData.Rows[i];
                    contentHtml += '<input type="checkbox" value="' + element.Id + '" name="choose-sync-data" id="syncdata-' + element.Id + '">' +
                        '<label for="syncdata-' + element.Id + '">' + element.Id + '</label>';
                }
                break;
            default:
                layer.msg('尚未新增相应展示处理');
                break;
        }
        contentHtml += '</div>';
        kadSyncConfig.syncPopIndex = layer.open({
            type: 1,
            title: titile,
            skin: 'layui-layer-rim', //加上边框
            area: ['600px', '350px'], //宽高
            content: contentHtml,
            btn: btnArr,
            yes: function() {
                return syncData(btn1SyncDomain, syncUrlIndex);
            },
            btn2: function() {
                if (btnArr.length == 3) {
                    return syncData(btn2SyncDomain, syncUrlIndex);
                } else {
                    layer.msg('取消同步');
                }
            },
            btn3: function() {
                layer.msg('取消同步');
            },
            cancel: function() {
                layer.msg('关闭同步窗');
            },
            btnAlign: 'c'
        });
    });
}

/**
 * 数据分发不同接口处理
 * 
 * @param {string} syncDomian 
 * @param {number} syncUrlIndex 
 * @returns 
 */
function syncData(syncDomian, syncUrlIndex) {
    var allCheckedInputs = $('.chrome-ext-checkbox-wrap input[type="checkbox"]:checked');
    if (allCheckedInputs.length == 0) {
        layer.msg('请先选择需同步内容');
        return false;
    }
    $.ajax({
        type: "post",
        url: syncDomian + "/Home/GetIndexInfo",
        cache: false,
        contentType: "application/json; charset=utf-8",
        dataType: "json"
    }).done(function(data) {
        kadSyncConfig.loadingIndex = layer.load();
        for (var i = 0; i < allCheckedInputs.length; i++) {
            var element = allCheckedInputs[i];
            //TODO 需新增可同步内容时 ：3.新增对应接口处理同步数据
            switch (syncUrlIndex) {
                //字典
                case 0:
                    syncDict(syncDomian, element.value);
                    break;
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                    syncLayout(syncDomian, syncUrlIndex, element.value);
                    break;
                case 8:
                case 9:
                case 10:
                case 11:
                case 12:
                case 13:
                case 14:
                    syncWidget(syncDomian, syncUrlIndex, element.value);
                    break;
                default:
                    layer.msg('尚未新增相应处理接口');
                    break;
            }
        }
        setTimeout(function() {
            layer.close(kadSyncConfig.loadingIndex);
            layer.msg('大概也许可能应该同步完成了');
        }, 2000);
    }).fail(function(jqXHR) {
        layer.msg('请先登录此环境', {
            time: 2000,
        }, function() {
            window.open(syncDomian);
        });
    });
    return false;
}


//TODO 同步字典逻辑开始---------------------------------------------------------------------------------------------------------------------
/**
 * 从同步新字典配置到rc或正式
 * 
 * @param {string} syncDomian 需同步到的域名 
 * @param {string} key 字典编码 
 */
function syncDict(syncDomian, key) {
    var dictQueryPostData = { "filters": [{ "whereType": "equal", "field": "DictID", "value": key }], "sorts": [{ "field": "DictID", "isAsc": false }], "dbKey": null, "entityType": null, "page": 1, "pageSize": 1 };
    $.ajax({
        type: "post",
        url: "/Config/DictConfig/Query",
        data: JSON.stringify(dictQueryPostData),
        contentType: "application/json; charset=utf-8",
        cache: false,
        dataType: "json"
    }).done(function(dictRes) {
        if (dictRes && dictRes.Total > 0) {
            $.ajax({
                type: "post",
                url: syncDomian + "/Config/DictConfig/Query",
                data: JSON.stringify(dictQueryPostData),
                contentType: "application/json; charset=utf-8",
                cache: false,
                dataType: "json"
            }).done(function(existDictRes) {
                if (existDictRes && existDictRes.Total > 0) {
                    $.ajax({
                        type: "post",
                        url: syncDomian + "/Config/DictConfig/Delete",
                        data: JSON.stringify({ dictID: key }),
                        contentType: "application/json; charset=utf-8",
                        cache: false,
                        dataType: "json"
                    }).done(function(delRes) {
                        initAddDictData(syncDomian, dictRes.Rows[0], key);
                    }).fail(function(jqXHR) {
                        layer.msg('同步出现异常，请查看console');
                        console.error(jqXHR);
                    })
                } else {
                    initAddDictData(syncDomian, dictRes.Rows[0], key);
                }
            }).fail(function(jqXHR) {
                layer.msg('同步出现异常，请查看console');
                console.error(jqXHR);
            });
        }
    }).fail(function(jqXHR) {
        layer.msg('同步出现异常，请查看console');
        console.error(jqXHR);
    });
}

/**
 * 初始需新增的数据
 * 
 * @param {string} syncDomian 
 * @param {any} dictResult dictRes.Rows[0]
 * @param {string} key 
 */
function initAddDictData(syncDomian, dictResult, key) {
    var newDictPostData = { "DictID": dictResult.DictID, "DictType": dictResult.DictType, "Type": dictResult.Type, "GroupDesc": "普通", "ImplementType": dictResult.ImplementType, "DictDesc": dictResult.DictDesc };
    if (dictResult.Type == 1) {
        newDictPostData.GroupDesc = '树形';
    }
    addDict(syncDomian, newDictPostData, 1, function() {
        var dictDetailQueryPostData = {
            "filters": [{
                "field": "DictId",
                "whereType": "Equal",
                "value": key
            }],
            "sorts": [{
                "field": "OrderNo",
                "isAsc": false
            }],
            "dbKey": null,
            "entityType": null
        };
        $.ajax({
            type: "post",
            url: "/Config/DictItemConfig/Query",
            data: JSON.stringify(dictDetailQueryPostData),
            cache: false,
            contentType: "application/json; charset=utf-8",
            dataType: "json"
        }).done(function(response) {
            if (response.Total > 0) {
                var postDataArr = [];
                response.Rows.forEach((dict, i) => {
                    var postData = {
                        DictID: dict.DictID,
                        DictText: dict.DictText,
                        DictValue: dict.DictValue,
                        OrderNo: dict.OrderNo,
                        ParentValue: dict.ParentValue,
                        Property1: dict.Property1,
                        Property2: dict.Property2,
                        Property3: dict.Property3,
                        Property4: dict.Property4,
                        Property5: dict.Property5
                    };
                    addDict(syncDomian, postData, 2, function() {
                        if (dict.children && dict.children.length > 0) {
                            dict.children.forEach((childDict, j) => {
                                var childPostData = {
                                    DictID: childDict.DictID,
                                    DictText: childDict.DictText,
                                    DictValue: childDict.DictValue,
                                    OrderNo: childDict.OrderNo,
                                    ParentValue: childDict.ParentValue,
                                    Property1: childDict.Property1,
                                    Property2: childDict.Property2,
                                    Property3: childDict.Property3,
                                    Property4: childDict.Property4,
                                    Property5: childDict.Property5
                                };
                                addDict(syncDomian, childPostData, 2);
                            });
                        }
                    });
                })
            }
        }).fail(function(jqXHR) {
            layer.msg('同步出现异常，请查看console');
            console.error(jqXHR);
        });
    });
}

/**
 * 
 * 
 * @param {string} syncDomian 需同步到的域名
 * @param {any} postData 同步的数据
 * @param {number} dictType 1-DictConfig 2-DictItemConfig
 * @param {funcion} callback 成功回调
 */
function addDict(syncDomian, postData, dictType, callback) {
    var url = '';
    var dictConfigType = '';
    switch (dictType) {
        case 1:
            dictConfigType = 'DictConfig';
            break;
        case 2:
            dictConfigType = 'DictItemConfig';
            break;
    }
    url = syncDomian + '/Config/' + dictConfigType + '/Add';
    $.ajax({
        type: "post",
        url: url,
        cache: false,
        data: JSON.stringify(postData),
        contentType: "application/json; charset=utf-8",
        dataType: "json"
    }).done(function(data) {
        if (callback && typeof(callback) === 'function') {
            callback(data);
        }
    }).fail(function(jqXHR) {
        layer.msg('同步出现异常，请查看console');
        console.error(jqXHR);
    });
}
//同步字典逻辑结束---------------------------------------------------------------------------------------------------------------------

//TODO 同步布局模板逻辑开始------------------------------------------------------------------------------------------------------------------
/**
 * 布局模板同步
 * 
 * @param {string} syncDomian 
 * @param {number} syncUrlIndex 
 * @param {string} key 
 */
function syncLayout(syncDomian, syncUrlIndex, key) {
    var getFormDataUrl = ''; // /CMS/MLayout/GetFormData
    switch (syncUrlIndex) {
        case 1:
            getFormDataUrl = '/CMS/Layout/GetFormData';
            break;
        case 2:
            getFormDataUrl = '/CMS/MLayout/GetFormData';
            break;
        case 3:
            getFormDataUrl = '/CMS/ELayout/GetFormData';
            break;
        case 4:
            getFormDataUrl = '/CMS/VLayout/GetFormData';
            break;
        case 5:
            getFormDataUrl = '/CMS/TLayout/GetFormData';
            break;
        case 6:
            getFormDataUrl = '/CMS/TMLayout/GetFormData';
            break;
        case 7:
            getFormDataUrl = '/CMS/WSLayout/GetFormData';
            break;
    }
    var layoutQueryPostData = { "Id": key };
    $.ajax({
        type: "post",
        url: getFormDataUrl,
        data: JSON.stringify(layoutQueryPostData),
        contentType: "application/json; charset=utf-8",
        cache: false,
        dataType: "json"
    }).done(function(layoutRes) {
        if (layoutRes) {
            $.ajax({
                type: "post",
                url: syncDomian + getFormDataUrl,
                data: JSON.stringify(layoutQueryPostData),
                contentType: "application/json; charset=utf-8",
                cache: false,
                dataType: "json"
            }).done(function(existLayoutRes) {
                if (existLayoutRes) {
                    //修改
                    addOrEditLayout(syncDomian, syncUrlIndex, layoutRes, 1);
                } else {
                    //新增
                    addOrEditLayout(syncDomian, syncUrlIndex, layoutRes, 0);
                }
            }).fail(function(jqXHR) {
                layer.msg('同步出现异常，请查看console');
                console.error(jqXHR);
            })
        } else {
            layer.msg(`未找到布局模板${key}`);
        }
    }).fail(function(jqXHR) {
        layer.msg('同步出现异常，请查看console');
        console.error(jqXHR);
    })
}

/**
 * 新增或修改布局模板
 * 
 * @param {string} syncDomian 
 * @param {number} syncUrlIndex 
 * @param {any} sourceData 
 * @param {number} type 0-新增 1-修改
 */
function addOrEditLayout(syncDomian, syncUrlIndex, sourceData, type) {
    var url = '';
    switch (type) {
        //新增
        case 0:
            switch (syncUrlIndex) {
                case 1:
                    url = '/CMS/Layout/Add';
                    break;
                case 2:
                    url = '/CMS/MLayout/Add';
                    break;
                case 3:
                    url = '/CMS/ELayout/Add';
                    break;
                case 4:
                    url = '/CMS/VLayout/Add';
                    break;
                case 5:
                    url = '/CMS/TLayout/Add';
                    break;
                case 6:
                    url = '/CMS/TMLayout/Add';
                    break;
                case 7:
                    url = '/CMS/WSLayout/Add';
                    break;
            }
            break;
            //修改
        case 1:
            switch (syncUrlIndex) {
                case 1:
                    url = '/CMS/Layout/Edit';
                    break;
                case 2:
                    url = '/CMS/MLayout/Edit';
                    break;
                case 3:
                    url = '/CMS/ELayout/Edit';
                    break;
                case 4:
                    url = '/CMS/VLayout/Edit';
                    break;
                case 5:
                    url = '/CMS/TLayout/Edit';
                    break;
                case 6:
                    url = '/CMS/TMLayout/Edit';
                    break;
                case 7:
                    url = '/CMS/WSLayout/Edit';
                    break;
            }
            break;
    }
    var postData = {
        "Id": sourceData.Id,
        "LayoutGroup": sourceData.LayoutGroup,
        "HeadTemplate": sourceData.HeadTemplate,
        "isCustomBody": sourceData.isCustomBody,
        "Template": sourceData.Template,
        "Description": sourceData.Description
    };
    $.ajax({
        type: "post",
        url: syncDomian + url,
        data: JSON.stringify(postData),
        contentType: "application/json; charset=utf-8",
        cache: false,
        dataType: "json"
    }).done(function(addLayoutRes) {
        // {"Result":true,"Message":"保存成功！","Rows":null,"Total":0}
        if (!addLayoutRes.Result) {
            layer.msg('同步失败，' + addLayoutRes.Message);
        }
    }).fail(function(jqXHR) {
        layer.msg('同步出现异常，请查看console');
        console.error(jqXHR);
    })
}
//同步布局模板逻辑结束------------------------------------------------------------------------------------------------------------------


//TODO 同步部件模板逻辑开始------------------------------------------------------------------------------------------------------------------
/**
 * 部件同步
 * 
 * @param {string} syncDomian 
 * @param {number} syncUrlIndex 
 * @param {string} key 
 */
function syncWidget(syncDomian, syncUrlIndex, key) {
    var getFormDataUrl = ''; // /CMS/MWidget/GetFormData
    switch (syncUrlIndex) {
        case 8:
            getFormDataUrl = '/CMS/Widget/GetFormData';
            break;
        case 9:
            getFormDataUrl = '/CMS/MWidget/GetFormData';
            break;
        case 10:
            getFormDataUrl = '/CMS/EWidget/GetFormData';
            break;
        case 11:
            getFormDataUrl = '/CMS/VWidget/GetFormData';
            break;
        case 12:
            getFormDataUrl = '/CMS/TWidget/GetFormData';
            break;
        case 13:
            getFormDataUrl = '/CMS/TMWidget/GetFormData';
            break;
        case 14:
            getFormDataUrl = '/CMS/WSWidget/GetFormData';
            break;
    }
    var widgetQueryPostData = { "Id": key };
    $.ajax({
        type: "post",
        url: getFormDataUrl,
        data: JSON.stringify(widgetQueryPostData),
        contentType: "application/json; charset=utf-8",
        cache: false,
        dataType: "json"
    }).done(function(widgetRes) {
        if (widgetRes) {
            $.ajax({
                type: "post",
                url: syncDomian + getFormDataUrl,
                data: JSON.stringify(widgetQueryPostData),
                contentType: "application/json; charset=utf-8",
                cache: false,
                dataType: "json"
            }).done(function(existWidgetRes) {
                if (widgetRes.Pic) {
                    uploadImgToManage(syncDomian, widgetRes.Pic, function(newPicUrl) {
                        widgetRes.Pic = newPicUrl;
                        if (existWidgetRes) {
                            //修改
                            addOrEditWidget(syncDomian, syncUrlIndex, widgetRes, 1);
                        } else {
                            //新增
                            addOrEditWidget(syncDomian, syncUrlIndex, widgetRes, 0);
                        }
                    })
                } else {
                    if (existWidgetRes) {
                        //修改
                        addOrEditWidget(syncDomian, syncUrlIndex, widgetRes, 1);
                    } else {
                        //新增
                        addOrEditWidget(syncDomian, syncUrlIndex, widgetRes, 0);
                    }
                }
            }).fail(function(jqXHR) {
                layer.msg('同步出现异常，请查看console');
                console.error(jqXHR);
            })
        } else {
            layer.msg(`未找到布局模板${key}`);
        }
    }).fail(function(jqXHR) {
        layer.msg('同步出现异常，请查看console');
        console.error(jqXHR);
    })
}

/**
 * 新增或修改部件
 * 
 * @param {string} syncDomian 
 * @param {number} syncUrlIndex 
 * @param {any} sourceData 
 * @param {number} type 0-新增 1-修改
 */
function addOrEditWidget(syncDomian, syncUrlIndex, sourceData, type) {
    var url = '';
    switch (type) {
        //新增
        case 0:
            switch (syncUrlIndex) {
                case 8:
                    url = '/CMS/Widget/Add?type=' + sourceData.WidgetGroup;
                    break;
                case 9:
                    url = '/CMS/MWidget/Add?type=' + sourceData.WidgetGroup;
                    break;
                case 10:
                    url = '/CMS/EWidget/Add?type=' + sourceData.WidgetGroup;
                    break;
                case 11:
                    url = '/CMS/VWidget/Add?type=' + sourceData.WidgetGroup;
                    break;
                case 12:
                    url = '/CMS/TWidget/Add?type=' + sourceData.WidgetGroup;
                    break;
                case 13:
                    url = '/CMS/TMWidget/Add?type=' + sourceData.WidgetGroup;
                    break;
                case 14:
                    url = '/CMS/WSWidget/Add?type=' + sourceData.WidgetGroup;
                    break;
            }
            break;
            //修改
        case 1:
            switch (syncUrlIndex) {
                case 8:
                    url = '/CMS/Widget/Edit';
                    break;
                case 9:
                    url = '/CMS/MWidget/Edit';
                    break;
                case 10:
                    url = '/CMS/EWidget/Edit';
                    break;
                case 11:
                    url = '/CMS/VWidget/Edit';
                    break;
                case 12:
                    url = '/CMS/TWidget/Edit';
                    break;
                case 13:
                    url = '/CMS/TMWidget/Edit';
                    break;
                case 14:
                    url = '/CMS/WSWidget/Edit';
                    break;
            }
            break;
    }
    var postData = {
        "WidgetGroup": sourceData.WidgetGroup,
        "Id": sourceData.Id,
        "DataProvider": sourceData.DataProvider,
        "ProviderId": sourceData.ProviderId,
        "EnableWidths": sourceData.EnableWidths,
        "WidgetCss": sourceData.WidgetCss,
        "Template": sourceData.Template,
        "Description": sourceData.Description,
        "EnableVisualPageUse": sourceData.EnableVisualPageUse,
        "IsVisualWidget": sourceData.IsVisualWidget,
        "Pic": sourceData.Pic,
        "TemplateType": sourceData.TemplateType
    };
    $.ajax({
        type: "post",
        url: syncDomian + url,
        data: JSON.stringify(postData),
        contentType: "application/json; charset=utf-8",
        cache: false,
        dataType: "json"
    }).done(function(addWidgetRes) {
        // {"Result":true,"Message":"保存成功！","Rows":null,"Total":0}
        if (!addWidgetRes.Result) {
            layer.msg('同步失败，' + addWidgetRes.Message);
        }
    }).fail(function(jqXHR) {
        layer.msg('同步出现异常，请查看console');
        console.error(jqXHR);
    })
}
//同步部件模板逻辑结束------------------------------------------------------------------------------------------------------------------


//TODO 同步广告位及广告发布逻辑开始------------------------------------------------------------------------------------------------------------------
function syncAdPlace(syncDomian, syncUrlIndex, key) {
    var getFormDataUrl = ''; // /CMS/MWidget/GetFormData
    switch (syncUrlIndex) {
        case 8:
            getFormDataUrl = '/CMS/Widget/GetFormData';
            break;
        case 9:
            getFormDataUrl = '/CMS/MWidget/GetFormData';
            break;
        case 10:
            getFormDataUrl = '/CMS/EWidget/GetFormData';
            break;
        case 11:
            getFormDataUrl = '/CMS/VWidget/GetFormData';
            break;
        case 12:
            getFormDataUrl = '/CMS/TWidget/GetFormData';
            break;
        case 13:
            getFormDataUrl = '/CMS/TMWidget/GetFormData';
            break;
        case 14:
            getFormDataUrl = '/CMS/WSWidget/GetFormData';
            break;
    }
    var widgetQueryPostData = { "Id": key };
    $.ajax({
        type: "post",
        url: getFormDataUrl,
        data: JSON.stringify(widgetQueryPostData),
        contentType: "application/json; charset=utf-8",
        cache: false,
        dataType: "json"
    }).done(function(widgetRes) {
        if (widgetRes) {
            $.ajax({
                type: "post",
                url: syncDomian + getFormDataUrl,
                data: JSON.stringify(widgetQueryPostData),
                contentType: "application/json; charset=utf-8",
                cache: false,
                dataType: "json"
            }).done(function(existWidgetRes) {
                if (widgetRes.Pic) {
                    uploadImgToManage(syncDomian, widgetRes.Pic, function(newPicUrl) {
                        widgetRes.Pic = newPicUrl;
                        if (existWidgetRes) {
                            //修改
                            addOrEditWidget(syncDomian, syncUrlIndex, widgetRes, 1);
                        } else {
                            //新增
                            addOrEditWidget(syncDomian, syncUrlIndex, widgetRes, 0);
                        }
                    })
                } else {
                    if (existWidgetRes) {
                        //修改
                        addOrEditWidget(syncDomian, syncUrlIndex, widgetRes, 1);
                    } else {
                        //新增
                        addOrEditWidget(syncDomian, syncUrlIndex, widgetRes, 0);
                    }
                }
            }).fail(function(jqXHR) {
                layer.msg('同步出现异常，请查看console');
                console.error(jqXHR);
            })
        } else {
            layer.msg(`未找到布局模板${key}`);
        }
    }).fail(function(jqXHR) {
        layer.msg('同步出现异常，请查看console');
        console.error(jqXHR);
    })
}
//同步广告位及广告发布逻辑结束------------------------------------------------------------------------------------------------------------------


//TODO 图片上传开始-------------------------------------------------------------------------------------------------------------------------
/**
 * 同步在线图片
 * 
 * @param {string} syncDomian 要同步到的域
 * @param {string} onlineImgUrl 在线图片url
 * @param {any} successCallback 成功回调
 * @param {any} errorCallback 失败回调
 */
function uploadImgToManage(syncDomian, onlineImgUrl, successCallback, errorCallback) {
    if (!XMLHttpRequest.prototype.sendAsBinary) {
        XMLHttpRequest.prototype.sendAsBinary = function(sData) {
            var nBytes = sData.length,
                ui8Data = new Uint8Array(nBytes);
            for (var nIdx = 0; nIdx < nBytes; nIdx++) {
                ui8Data[nIdx] = sData.charCodeAt(nIdx) & 0xff;
            }
            /* send as ArrayBufferView...: */
            this.send(ui8Data);
            /* ...or as ArrayBuffer (legacy)...: this.send(ui8Data.buffer); */
        };
    }
    var downloadXHR = new XMLHttpRequest();
    downloadXHR.open('GET', onlineImgUrl, true);
    downloadXHR.responseType = 'blob'; //"arraybuffer";
    downloadXHR.onload = function() {
        if (this.status == 200) {
            var reader = new window.FileReader();
            reader.readAsDataURL(this.response);
            reader.onloadend = function() {
                var base64data = reader.result;
                //创建一个ajax请求：
                var uploadUrl = '/File/Upload';
                var uploadImgFileName = 'test.png';
                var uploadXHR = new XMLHttpRequest();
                uploadXHR.open('POST', uploadUrl, true);
                var boundary = '----------KM7cH2KM7KM7cH2ei4KM7ei4GI3KM7';
                uploadXHR.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);
                //上传
                var data = base64data.replace(/data:([\s\S]*);base64,/, '');
                uploadXHR.sendAsBinary(`\r\n\r\n--${boundary}\r\nContent-Disposition: form-data; name=\"Filename\"\r\n\r\n${uploadImgFileName}\r\n--${boundary}\r\nContent-Disposition: form-data; name=\"urlWithFileName\"\r\n\r\nfalse\r\n--${boundary}\r\nContent-Disposition: form-data; name=\"Filedata\"; filename=\"${uploadImgFileName}\"\r\nContent-Type: application/octet-stream\r\n\r\n${atob(data)}\n--${boundary}\r\nContent-Disposition: form-data; name=\"Upload\"\r\n\r\nSubmit Query\r\n--${boundary}--`);
                // 上传进度
                uploadXHR.upload.onprogress = function(event) {
                    if (event.lengthComputable) {
                        console.log((event.loaded / event.total) * 100);
                    }
                };
                //成功和失败回调 
                uploadXHR.onreadystatechange = function() {
                    if (this.readyState == 4) {
                        if (this.status == 200) {
                            successCallback(this.responseText);
                        } else {
                            errorCallback(this);
                            layer.msg('上传图片出现异常，请查看console');
                            console.error(this);
                        }
                    }
                };
            }
        } else {
            layer.msg('同步内容的图片获取出现异常，请查看console');
            console.error(this);
        }
    }
    downloadXHR.send();
}
//图片上传结束-----------------------------------------------------------------------------------------------------------------------------




//jq
// $.ajax({
//     type: "post",
//     url: "",
//     data: JSON.stringify(),
//     contentType: "application/json; charset=utf-8",
//     cache: false,
//     dataType: "json"
// }).done(function() {

// }).fail(function(jqXHR) {
//     layer.msg('同步出现异常，请查看console');
//     console.error(jqXHR);
// })