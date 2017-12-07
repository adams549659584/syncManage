$(function () {
    var kadSyncEnvConfig = {
        enabledTSTSync: false,
        enabledRCSync: false,
        enabledPRODSync: false,
        enabledModifyParams: false
    };
    chrome.storage.sync.get(kadSyncEnvConfig, function (items) {
        console.log(items);
        kadSyncEnvConfig = items;
        if (items.enabledTSTSync) {
            $('#btnEnabledTSTSync').attr("checked", true);
        } else {
            $('#btnEnabledTSTSync').attr("checked", false);
        }
        if (items.enabledRCSync) {
            $('#btnEnabledRCSync').attr("checked", true);
        } else {
            $('#btnEnabledRCSync').attr("checked", false);
        }
        if (items.enabledPRODSync) {
            $('#btnEnabledPRODSync').attr("checked", true);
        } else {
            $('#btnEnabledPRODSync').attr("checked", false);
        }
        if (items.enabledModifyParams) {
            $('#btnEnabledModifyParams').attr("checked", true);
        } else {
            $('#btnEnabledModifyParams').attr("checked", false);
        }
        sycnConfigToContentScript(kadSyncEnvConfig);
    });

    $('#btnEnabledTSTSync').click(function () {
        if ($(this).is(':checked')) {
            kadSyncEnvConfig.enabledTSTSync = true;
            $(this).attr("checked", true);
        } else {
            kadSyncEnvConfig.enabledTSTSync = false;
            $(this).attr("checked", false);
        }
        chrome.storage.sync.set(kadSyncEnvConfig, function () {
            console.log('保存成功！');
            sycnConfigToContentScript(kadSyncEnvConfig);
        });
    })
    $('#btnEnabledRCSync').click(function () {
        if ($(this).is(':checked')) {
            kadSyncEnvConfig.enabledRCSync = true;
            $(this).attr("checked", true);
        } else {
            kadSyncEnvConfig.enabledRCSync = false;
            $(this).attr("checked", false);
        }
        chrome.storage.sync.set(kadSyncEnvConfig, function () {
            console.log('保存成功！');
            sycnConfigToContentScript(kadSyncEnvConfig);
        });
    })
    $('#btnEnabledPRODSync').click(function () {
        if ($(this).is(':checked')) {
            kadSyncEnvConfig.enabledPRODSync = true;
            $(this).attr("checked", true);
        } else {
            kadSyncEnvConfig.enabledPRODSync = false;
            $(this).attr("checked", false);
        }
        chrome.storage.sync.set(kadSyncEnvConfig, function () {
            console.log('保存成功！');
            sycnConfigToContentScript(kadSyncEnvConfig);
        });
    })
    $('#btnEnabledModifyParams').click(function () {
        if ($(this).is(':checked')) {
            kadSyncEnvConfig.enabledModifyParams = true;
            $(this).attr("checked", true);
        } else {
            kadSyncEnvConfig.enabledModifyParams = false;
            $(this).attr("checked", false);
        }
        chrome.storage.sync.set(kadSyncEnvConfig, function () {
            console.log('保存成功！');
            sycnConfigToContentScript(kadSyncEnvConfig);
        });
    })
});

function sycnConfigToContentScript(kadSyncEnvConfig) {
    sendMessageToContentScript({
        key: "kadSyncEnvConfig",
        data: kadSyncEnvConfig
    }, (res) => {
        console.log('同步kadSyncEnvConfig到ContentScript结果：' + res);
    })
}

// popup主动发消息给content-script
$('#send_message_to_content_script').click(() => {
    sendMessageToContentScript('你好，我是popup！', (response) => {
        if (response) alert('收到来自content-script的回复：' + response);
    });
});

// 监听来自content-script的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('收到来自content-script的消息：');
    console.log(request, sender, sendResponse);
    sendResponse('我是popup，我已收到你的消息：' + JSON.stringify(request));
});

// popup与content-script建立长连接
$('#connect_to_content_script').click(() => {
    getCurrentTabId((tabId) => {
        var port = chrome.tabs.connect(tabId, {
            name: 'test-connect'
        });
        port.postMessage({
            question: '你是谁啊？'
        });
        port.onMessage.addListener(function (msg) {
            alert('收到长连接消息：' + msg.answer);
            if (msg.answer && msg.answer.startsWith('我是')) {
                port.postMessage({
                    question: '哦，原来是你啊！'
                });
            }
        });
    });
});

// 获取当前选项卡ID
function getCurrentTabId(callback) {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function (tabs) {
        if (callback) callback(tabs.length ? tabs[0].id : null);
    });
}

// 这2个获取当前选项卡id的方法大部分时候效果都一致，只有少部分时候会不一样
function getCurrentTabId2() {
    chrome.windows.getCurrent(function (currentWindow) {
        chrome.tabs.query({
            active: true,
            windowId: currentWindow.id
        }, function (tabs) {
            if (callback) callback(tabs.length ? tabs[0].id : null);
        });
    });
}

// 向content-script主动发送消息
function sendMessageToContentScript(message, callback) {
    getCurrentTabId((tabId) => {
        chrome.tabs.sendMessage(tabId, message, function (response) {
            if (callback) callback(response);
        });
    });
}

// 向content-script注入JS片段
function executeScriptToCurrentTab(code) {
    getCurrentTabId((tabId) => {
        chrome.tabs.executeScript(tabId, {
            code: code
        });
    });
}