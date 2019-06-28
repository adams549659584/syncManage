// 监听来自content-script的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('收到来自content-script的消息：');
    console.log(request, sender, sendResponse);
    sendResponse('我是后台，我已收到你的消息：' + JSON.stringify(request));
});

// web请求监听，最后一个参数表示阻塞式，需单独声明权限：webRequestBlocking
chrome.webRequest.onBeforeRequest.addListener(details => {
    console.log("onBeforeRequest:");
    console.log(details);
    if (details.url.indexOf("manage.360kad.com/Content/scripts/ligerUI/js/ligerui.all.js") > -1) {
        console.log('已替换');
        return {
            redirectUrl: chrome.extension.getURL("js/ligerui.all.js")
        };
    }
    // if (details.url.indexOf("http://manage.360kad.com/Home/GetMenus") > -1) {
    //     return {
    //         redirectUrl: 'http://tstmanage.360kad.com/Home/GetMenus'
    //     };
    // }
}, {
    urls: ["<all_urls>"],
    types: ["script", "xmlhttprequest"]
}, ["blocking"]);

chrome.webRequest.onResponseStarted.addListener(details => {
    console.log(`监听到响应：`);
    console.log(details);
}, {
    urls: ["<all_urls>"],
    types: ["script", "xmlhttprequest"]
}, ["responseHeaders"]);