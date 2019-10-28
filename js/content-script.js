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
    '/CMS/APPAdPlace/Query', //广告位 22
    '/Config/ConfigItem/Query', //常量配置23

    '/CMS/KTMLayout/Query', //太安堂M布局模板 24
    '/CMS/KTMWidget/Query', //太安堂M内容部件 25
    '/CMS/KTMAdPlace/Query', //广告位 26

    '/Config/DictItemConfig/Query' //字典项 27
  ],
  syncData: null,
  syncPopIndex: 0,
  loadingIndex: 0,
  needSyncDictItemCount: [],
  finishedSyncDictItemCount: []
}

// 注意，必须设置了run_at=document_start 此段代码才会生效
document.addEventListener('DOMContentLoaded', function() {
  // 注入自定义JS
  // injectCustomJs();
})

// 向页面注入JS
function injectCustomJs(jsPath) {
  jsPath = jsPath || 'js/inject.js'
  var temp = document.createElement('script')
  temp.setAttribute('type', 'text/javascript')
  // 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
  temp.src = chrome.extension.getURL(jsPath)
  temp.onload = function() {
    // 放在页面不好看，执行完后移除掉
    this.parentNode.removeChild(this)
  }
  document.body.appendChild(temp)
}

var alreadyInject = false

function initKadSyncEnvConfigFromContentScript(request) {
  var syncConfigKey = 'kadSyncEnvConfig'
  if (request && request.key === syncConfigKey) {
    var kadSyncEnvConfig = request.data
    window.sessionStorage &&
      window.sessionStorage.setItem(
        syncConfigKey,
        JSON.stringify(kadSyncEnvConfig)
      )
  }
}

// 接收来自后台的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  kadSyncConfig.enabledSync = true
  // console.log('收到来自 ' + (sender.tab ? "content-script(" + sender.tab.url + ")" : "popup或者background") + ' 的消息：', request);
  if (request.cmd == 'update_font_size') {
    var ele = document.createElement('style')
    ele.innerHTML = `* {font-size: ${request.size}px !important;}`
    document.head.appendChild(ele)
  } else if (request.key === 'kadAutoLogin') {
    var domainReg = /^http(s)?:\/\/(.*?)\//
    location.href = domainReg.exec(location.href)[1]
    return
  } else {
    initKadSyncEnvConfigFromContentScript(request)
    // layer.msg(JSON.stringify(request));
    sendResponse('我收到你的消息了：' + JSON.stringify(request))
  }
})

// 主动发送消息给后台
// 要演示此功能，请打开控制台主动执行sendMessageToBackground()
function sendMessageToBackground(message) {
  chrome.runtime.sendMessage(
    {
      greeting: message || '你好，我是content-script呀，我主动发消息给后台！'
    },
    function(response) {
      // layer.msg('收到来自后台的回复：' + response);
    }
  )
}

// 监听长连接
chrome.runtime.onConnect.addListener(function(port) {
  console.log(port)
  if (port.name == 'test-connect') {
    port.onMessage.addListener(function(msg) {
      console.log('收到长连接消息：', msg)
      // layer.msg('收到长连接消息：' + JSON.stringify(msg));
      if (msg.question == '你是谁啊？')
        port.postMessage({
          answer: '我是你爸！'
        })
    })
  }
})

window.addEventListener(
  'message',
  function(e) {
    // console.log('收到消息：', e.data);
    if (e.data && e.data.cmd == 'invoke') {
      eval('(' + e.data.code + ')')
    } else if (e.data && e.data.cmd == 'message') {
      kadSyncConfig.syncData = e.data.data
      initSyncPop()
    }
  },
  false
)

function initSyncPop() {
  chrome.storage.sync.get(kadSyncConfig.envConfig, function(items) {
    Object.assign(kadSyncConfig.envConfig, items)

    if (!kadSyncConfig.syncData || kadSyncConfig.syncData.resData.Total == 0) {
      return
    }
    var syncUrlIndex = kadSyncConfig.canSyncUrl.indexOf(
      kadSyncConfig.syncData.url
    )
    if (syncUrlIndex == -1) {
      return
    }

    var btnArr = []
    var btn1SyncDomain = ''
    var btn2SyncDomain = ''
    switch (location.host) {
      case 'tstmanage.360kad.com':
        if (!kadSyncConfig.envConfig.enabledTSTSync) {
          return
        }
        btnArr = ['同步到RC', '同步到正式', '取消']
        // btnArr = ['同步到RC', '取消'];
        btn1SyncDomain = 'https://rcmanage.360kad.com'
        btn2SyncDomain = 'http://manage.360kad.com'
        break
      case 'rcmanage.360kad.com':
        if (!kadSyncConfig.envConfig.enabledRCSync) {
          return
        }
        btnArr = ['同步到TST', '同步到正式', '取消']
        // btnArr = ['同步到TST', '取消'];
        btn1SyncDomain = 'https://tstmanage.360kad.com'
        btn2SyncDomain = 'http://manage.360kad.com'
        break
      case 'manage.360kad.com':
        if (!kadSyncConfig.envConfig.enabledPRODSync) {
          return
        }
        btnArr = ['同步到TST', '同步到RC', '取消']
        btn1SyncDomain = 'https://tstmanage.360kad.com'
        btn2SyncDomain = 'https://rcmanage.360kad.com'
        break
    }
    var titile = ''
    var contentHtml = '<div class="chrome-ext-checkbox-wrap">'
    //TODO 需新增可同步内容时 ：2.处理可同步的数据选择展示
    switch (syncUrlIndex) {
      //字典
      case 0:
        titile = '请选择需同步的字典(同步会覆盖原数据，请注意风险)'
        for (var i = 0; i < kadSyncConfig.syncData.resData.Rows.length; i++) {
          var element = kadSyncConfig.syncData.resData.Rows[i]
          contentHtml +=
            '<input type="checkbox" value="' +
            element.DictID +
            '" name="choose-sync-data" id="syncdata-' +
            element.DictID +
            '">' +
            '<label for="syncdata-' +
            element.DictID +
            '" title="' +
            element.DictID +
            '">' +
            element.DictID +
            '</label>'
        }
        break
      //字典项
      case 27:
        titile = '请选择需同步的字典值编码(同步会覆盖原数据，请注意风险)'
        for (var i = 0; i < kadSyncConfig.syncData.resData.Rows.length; i++) {
          var element = kadSyncConfig.syncData.resData.Rows[i]
          contentHtml +=
            '<input type="checkbox" value="' +
            element.DictValue +
            '" name="choose-sync-data" id="syncdata-' +
            element.DictValue +
            '">' +
            '<label for="syncdata-' +
            element.DictValue +
            '" title="' +
            element.DictValue +
            '(' +
            element.DictText +
            ')' +
            '">' +
            element.DictValue +
            '(' +
            element.DictText +
            ')' +
            '</label>'
        }
        break
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 24:
        titile = '请选择需同步的布局模板(同步会覆盖原数据，请注意风险)'
        for (var i = 0; i < kadSyncConfig.syncData.resData.Rows.length; i++) {
          var element = kadSyncConfig.syncData.resData.Rows[i]
          contentHtml +=
            '<input type="checkbox" value="' +
            element.Id +
            '" name="choose-sync-data" id="syncdata-' +
            element.Id +
            '">' +
            '<label for="syncdata-' +
            element.Id +
            '" title="' +
            element.Id +
            '">' +
            element.Id +
            '</label>'
        }
        break
      case 8:
      case 9:
      case 10:
      case 11:
      case 12:
      case 13:
      case 14:
      case 25:
        titile = '请选择需同步的部件(同步会覆盖原数据，请注意风险)'
        for (var i = 0; i < kadSyncConfig.syncData.resData.Rows.length; i++) {
          var element = kadSyncConfig.syncData.resData.Rows[i]
          contentHtml +=
            '<input type="checkbox" value="' +
            element.Id +
            '" name="choose-sync-data" id="syncdata-' +
            element.Id +
            '">' +
            '<label for="syncdata-' +
            element.Id +
            '" title="' +
            element.Id +
            '">' +
            element.Id +
            '</label>'
        }
        break
      case 15:
      case 16:
      case 17:
      case 18:
      case 19:
      case 20:
      case 21:
      case 22:
      case 26:
        titile =
          '请选择需同步的广告位(广告位、广告部件及广告发布会一起同步，同步会覆盖原数据)'
        for (var i = 0; i < kadSyncConfig.syncData.resData.Rows.length; i++) {
          var element = kadSyncConfig.syncData.resData.Rows[i]
          contentHtml +=
            '<input type="checkbox" value="' +
            element.Id +
            '" name="choose-sync-data" id="syncdata-' +
            element.Id +
            '">' +
            '<label for="syncdata-' +
            element.Id +
            '" title="' +
            element.Id +
            '">' +
            element.Id +
            '</label>'
        }
        break
      case 23:
        titile = '请选择需同步的常量(同步会覆盖原数据，请注意风险)'
        for (var i = 0; i < kadSyncConfig.syncData.resData.Rows.length; i++) {
          var element = kadSyncConfig.syncData.resData.Rows[i]
          contentHtml +=
            '<input type="checkbox" value="' +
            element.ConfigKey +
            '" name="choose-sync-data" id="syncdata-' +
            element.ConfigKey +
            '">' +
            '<label for="syncdata-' +
            element.ConfigKey +
            '" title="' +
            element.ConfigKey +
            '">' +
            element.ConfigKey +
            '</label>'
        }
        break
      default:
        layer.msg('尚未新增相应展示处理')
        break
    }
    contentHtml += '</div>'
    kadSyncConfig.syncPopIndex = layer.open({
      type: 1,
      title: titile,
      skin: 'layui-layer-rim', //加上边框
      area: ['600px', '350px'], //宽高
      content: contentHtml,
      btn: btnArr,
      yes: function() {
        return syncData(btn1SyncDomain, syncUrlIndex)
      },
      btn2: function() {
        if (btnArr.length == 3) {
          return syncData(btn2SyncDomain, syncUrlIndex)
        } else {
          layer.msg('取消同步')
        }
      },
      btn3: function() {
        layer.msg('取消同步')
      },
      cancel: function() {
        layer.msg('关闭同步窗')
      },
      btnAlign: 'c'
    })
  })
}

/**
 * 数据分发不同接口处理
 *
 * @param {string} syncDomian
 * @param {number} syncUrlIndex
 * @returns
 */
function syncData(syncDomian, syncUrlIndex) {
  var allCheckedInputs = $(
    '.chrome-ext-checkbox-wrap input[type="checkbox"]:checked'
  )
  if (allCheckedInputs.length == 0) {
    layer.msg('请先选择需同步内容')
    return false
  }
  $.ajax({
    type: 'post',
    url: syncDomian + '/Home/GetIndexInfo',
    cache: false,
    contentType: 'application/json; charset=utf-8',
    dataType: 'json'
  })
    .done(function(data) {
      kadSyncConfig.loadingIndex = layer.load()
      var syncResultArr = []
      for (var i = 0; i < allCheckedInputs.length; i++) {
        var element = allCheckedInputs[i]
        //TODO 需新增可同步内容时 ：3.新增对应接口处理同步数据
        switch (syncUrlIndex) {
          //字典
          case 0:
            syncDict(syncDomian, element.value, function(syncResult) {
              syncResultArr.push(syncResult)
              finishSync(allCheckedInputs, syncResultArr)
            })
            break
          case 27:
            syncDictItems(syncDomian, element.value, function(syncResult) {
              syncResultArr.push(syncResult)
              finishSync(allCheckedInputs, syncResultArr)
            })
            break
          case 1:
          case 2:
          case 3:
          case 4:
          case 5:
          case 6:
          case 7:
          case 24:
            syncLayout(syncDomian, syncUrlIndex, element.value, function(
              syncResult
            ) {
              syncResultArr.push(syncResult)
              finishSync(allCheckedInputs, syncResultArr)
            })
            break
          case 8:
          case 9:
          case 10:
          case 11:
          case 12:
          case 13:
          case 14:
          case 25:
            syncWidget(syncDomian, syncUrlIndex, element.value, function(
              syncResult
            ) {
              syncResultArr.push(syncResult)
              finishSync(allCheckedInputs, syncResultArr)
            })
            break
          case 15:
          case 16:
          case 17:
          case 18:
          case 19:
          case 20:
          case 21:
          case 22:
          case 26:
            syncAdPlace(syncDomian, syncUrlIndex, element.value, function(
              syncResult
            ) {
              syncResultArr.push(syncResult)
              finishSync(allCheckedInputs, syncResultArr)
            })
            break
          case 23:
            syncConfigItem(syncDomian, syncUrlIndex, element.value, function(
              syncResult
            ) {
              syncResultArr.push(syncResult)
              finishSync(allCheckedInputs, syncResultArr)
            })
            break
          default:
            layer.msg('尚未新增相应处理接口')
            break
        }
      }
    })
    .fail(function(jqXHR) {
      layer.msg(
        '请先登录此环境',
        {
          time: 2000
        },
        function() {
          window.open(syncDomian)
        }
      )
    })
  return false
}

/**
 * 完成同步
 *
 * @param {array} checkedArr
 * @param {array} syncResultArr
 */
function finishSync(checkedArr, syncResultArr) {
  if (checkedArr.length == syncResultArr.length) {
    var successArr = []
    var failedArr = []
    for (var i = 0; i < syncResultArr.length; i++) {
      var element = syncResultArr[i]
      if (element.Res.Result) {
        successArr.push(element.Id)
      } else {
        failedArr.push(element.Id)
      }
    }
    var str = ''
    if (successArr.length > 0) {
      str += `${successArr.join('、')}同步完成`
      if (failedArr.length > 0) {
        str += '<br />'
      } else {
        str += '，具体结果请查看console'
      }
    }
    if (failedArr.length > 0) {
      str += `${failedArr.join('、')}同步失败，具体结果请查看console`
    }
    layer.msg(str, {
      time: 5000
    })
    console.log('同步结果如下:')
    console.log(syncResultArr)
  }
  layer.close(kadSyncConfig.loadingIndex)
}

//TODO 同步字典逻辑开始---------------------------------------------------------------------------------------------------------------------
/**
 * 同步新字典配置到rc或正式
 *
 * @param {string} syncDomian 需同步到的域名
 * @param {string} key 字典编码
 */
function syncDict(syncDomian, key, successCallback) {
  var dictQueryPostData = {
    filters: [
      {
        whereType: 'equal',
        field: 'DictID',
        value: key
      }
    ],
    sorts: [
      {
        field: 'DictID',
        isAsc: false
      }
    ],
    dbKey: null,
    entityType: null,
    page: 1,
    pageSize: 1
  }
  $.ajax({
    type: 'post',
    url: '/Config/DictConfig/Query',
    data: JSON.stringify(dictQueryPostData),
    contentType: 'application/json; charset=utf-8',
    cache: false,
    dataType: 'json'
  })
    .done(function(dictRes) {
      if (dictRes && dictRes.Total > 0) {
        $.ajax({
          type: 'post',
          url: syncDomian + '/Config/DictConfig/Query',
          data: JSON.stringify(dictQueryPostData),
          contentType: 'application/json; charset=utf-8',
          cache: false,
          dataType: 'json'
        })
          .done(function(existDictRes) {
            if (existDictRes && existDictRes.Total > 0) {
              $.ajax({
                type: 'post',
                url: syncDomian + '/Config/DictConfig/Delete',
                data: JSON.stringify({
                  dictID: key
                }),
                contentType: 'application/json; charset=utf-8',
                cache: false,
                dataType: 'json'
              })
                .done(function(delRes) {
                  initAddDictData(
                    syncDomian,
                    dictRes.Rows[0],
                    key,
                    successCallback
                  )
                })
                .fail(function(jqXHR) {
                  layer.msg('同步出现异常，请查看console')
                  console.error(jqXHR)
                })
            } else {
              initAddDictData(syncDomian, dictRes.Rows[0], key, successCallback)
            }
          })
          .fail(function(jqXHR) {
            layer.msg('同步出现异常，请查看console')
            console.error(jqXHR)
          })
      }
    })
    .fail(function(jqXHR) {
      layer.msg('同步出现异常，请查看console')
      console.error(jqXHR)
    })
}

/**
 * 初始需新增的数据
 *
 * @param {string} syncDomian
 * @param {any} dictResult dictRes.Rows[0]
 * @param {string} key
 */
function initAddDictData(syncDomian, dictResult, key, successCallback) {
  var newDictPostData = {
    DictID: dictResult.DictID,
    DictType: dictResult.DictType,
    Type: dictResult.Type,
    GroupDesc: '普通',
    ImplementType: dictResult.ImplementType,
    DictDesc: dictResult.DictDesc
  }
  if (dictResult.Type == 1) {
    newDictPostData.GroupDesc = '树形'
  }
  addDict(syncDomian, newDictPostData, function() {
    var dictDetailQueryPostData = {
      filters: [
        {
          field: 'DictID',
          whereType: 'Equal',
          value: key
        }
      ],
      sorts: [
        {
          field: 'OrderNo',
          isAsc: true
        }
      ],
      dbKey: null,
      entityType: null,
      page: 1,
      pageSize: 99999
    }
    $.ajax({
      type: 'post',
      url: '/Config/DictItemConfig/Query',
      data: JSON.stringify(dictDetailQueryPostData),
      cache: false,
      contentType: 'application/json; charset=utf-8',
      dataType: 'json'
    })
      .done(function(response) {
        //todo 字典项选择
        if (response.Total > 0) {
          var dictItemConfigIndex = 'index-' + new Date().getTime().toString() //简单保证下异步设置唯一的字典
          kadSyncConfig.needSyncDictItemCount[dictItemConfigIndex] = 0
          kadSyncConfig.finishedSyncDictItemCount[dictItemConfigIndex] = 0
          addDictItem(
            syncDomian,
            response.Rows,
            dictItemConfigIndex,
            function() {
              successCallback({
                Id: key,
                Res: {
                  Result: true
                }
              })
            }
          )
        } else {
          successCallback({
            Id: key,
            Res: {
              Result: true
            }
          })
        }
      })
      .fail(function(jqXHR) {
        layer.msg('同步出现异常，请查看console')
        console.error(jqXHR)
      })
  })
}

/**
 * 添加字典
 *
 * @param {string} syncDomian 需同步到的域名
 * @param {any} postData 同步的数据
 * @param {funcion} callback 成功回调
 */
function addDict(syncDomian, postData, callback) {
  var url = syncDomian + '/Config/DictConfig/Add'
  $.ajax({
    type: 'post',
    url: url,
    cache: false,
    data: JSON.stringify(postData),
    contentType: 'application/json; charset=utf-8',
    dataType: 'json'
  })
    .done(function(data) {
      if (callback && typeof callback === 'function') {
        callback(data)
      }
    })
    .fail(function(jqXHR) {
      layer.msg('同步出现异常，请查看console')
      console.error(jqXHR)
    })
}

/**
 * 添加字典项
 *
 * @param {string} syncDomian 需同步到的域名
 * @param {array} dictArr 同步的数据
 * @param {funcion} callback 成功回调
 */
function addDictItem(syncDomian, dictArr, dictItemConfigIndex, callback) {
  var url = syncDomian + '/Config/DictItemConfig/Add'
  kadSyncConfig.needSyncDictItemCount[dictItemConfigIndex] += dictArr.length
  dictArr.forEach((dict, i) => {
    var postData = { ...dict }
    $.ajax({
      type: 'post',
      url: url,
      cache: false,
      data: JSON.stringify(postData),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json'
    })
      .done(function(data) {
        kadSyncConfig.finishedSyncDictItemCount[dictItemConfigIndex] += 1
        if (dict.children && dict.children.length > 0) {
          addDictItem(syncDomian, dict.children, dictItemConfigIndex, callback)
        } else {
          // console.log(`needSyncDictItemCount:${kadSyncConfig.needSyncDictItemCount[dictItemConfigIndex]},finishedSyncDictItemCount:${kadSyncConfig.finishedSyncDictItemCount[dictItemConfigIndex]}`);
          if (
            kadSyncConfig.needSyncDictItemCount[dictItemConfigIndex] ==
            kadSyncConfig.finishedSyncDictItemCount[dictItemConfigIndex]
          ) {
            callback()
          }
        }
      })
      .fail(function(jqXHR) {
        layer.msg('同步出现异常，请查看console')
        console.error(jqXHR)
      })
  })
}

/**
 * 同步新字典项配置到rc或正式
 *
 * @param {string} syncDomian 需同步到的域名
 * @param {string} key 字典值编码
 */
function syncDictItems(syncDomian, key, successCallback) {
  var rows = kadSyncConfig.syncData.resData.Rows.filter(
    x => x.DictValue === key
  )
  var thatDictItem = rows[0]
  ajaxPost(syncDomian + '/Config/DictItemConfig/Query', {
    filters: [
      { whereType: 'Equal', field: 'DictValue', value: key },
      { field: 'DictID', whereType: 'Equal', value: thatDictItem.DictID }
    ],
    sorts: [{ field: 'OrderNo', isAsc: true }],
    Type: 0,
    dbKey: null,
    entityType: null,
    page: 1,
    pageSize: 1
  })
    .done(function(existDictItemRes) {
      var initAddDictItem = function() {
        var dictItemConfigIndex = 'index-' + new Date().getTime().toString() //简单保证下异步设置唯一的字典
        kadSyncConfig.needSyncDictItemCount[dictItemConfigIndex] = 0
        kadSyncConfig.finishedSyncDictItemCount[dictItemConfigIndex] = 0
        addDictItem(syncDomian, rows, dictItemConfigIndex, function() {
          successCallback({
            Id: key,
            Res: {
              Result: true
            }
          })
        })
      }
      if (existDictItemRes.Total > 0) {
        ajaxPost(syncDomian + '/Config/DictItemConfig/Delete', {
          DictID: thatDictItem.DictID,
          Id: key
        })
          .done(function(delRes) {
            initAddDictItem()
          })
          .fail(function(jqXHR) {
            initAddDictItem()
          })
      } else {
        initAddDictItem()
      }
    })
    .fail(function(jqXHR) {
      layer.msg('同步出现异常，请查看console')
      console.error(jqXHR)
    })
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
function syncLayout(syncDomian, syncUrlIndex, key, successCallback) {
  var getFormDataUrl = '' // /CMS/MLayout/GetFormData
  switch (syncUrlIndex) {
    case 1:
      getFormDataUrl = '/CMS/Layout/GetFormData'
      break
    case 2:
      getFormDataUrl = '/CMS/MLayout/GetFormData'
      break
    case 3:
      getFormDataUrl = '/CMS/ELayout/GetFormData'
      break
    case 4:
      getFormDataUrl = '/CMS/VLayout/GetFormData'
      break
    case 5:
      getFormDataUrl = '/CMS/TLayout/GetFormData'
      break
    case 6:
      getFormDataUrl = '/CMS/TMLayout/GetFormData'
      break
    case 7:
      getFormDataUrl = '/CMS/WSLayout/GetFormData'
      break
    case 24:
      getFormDataUrl = '/CMS/KTMLayout/GetFormData'
      break
  }
  var layoutQueryPostData = {
    Id: key
  }
  $.ajax({
    type: 'post',
    url: getFormDataUrl,
    data: JSON.stringify(layoutQueryPostData),
    contentType: 'application/json; charset=utf-8',
    cache: false,
    dataType: 'json'
  })
    .done(function(layoutRes) {
      if (layoutRes) {
        $.ajax({
          type: 'post',
          url: syncDomian + getFormDataUrl,
          data: JSON.stringify(layoutQueryPostData),
          contentType: 'application/json; charset=utf-8',
          cache: false,
          dataType: 'json'
        })
          .done(function(existLayoutRes) {
            if (existLayoutRes) {
              //修改
              addOrEditLayout(
                syncDomian,
                syncUrlIndex,
                layoutRes,
                1,
                successCallback
              )
            } else {
              //新增
              addOrEditLayout(
                syncDomian,
                syncUrlIndex,
                layoutRes,
                0,
                successCallback
              )
            }
          })
          .fail(function(jqXHR) {
            layer.msg('同步出现异常，请查看console')
            console.error(jqXHR)
          })
      } else {
        layer.msg(`未找到布局模板${key}`)
      }
    })
    .fail(function(jqXHR) {
      layer.msg('同步出现异常，请查看console')
      console.error(jqXHR)
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
function addOrEditLayout(
  syncDomian,
  syncUrlIndex,
  sourceData,
  type,
  successCallback
) {
  var url = ''
  switch (type) {
    //新增
    case 0:
      switch (syncUrlIndex) {
        case 1:
          url = '/CMS/Layout/Add'
          break
        case 2:
          url = '/CMS/MLayout/Add'
          break
        case 3:
          url = '/CMS/ELayout/Add'
          break
        case 4:
          url = '/CMS/VLayout/Add'
          break
        case 5:
          url = '/CMS/TLayout/Add'
          break
        case 6:
          url = '/CMS/TMLayout/Add'
          break
        case 7:
          url = '/CMS/WSLayout/Add'
          break
        case 24:
          url = '/CMS/KTMLayout/Add'
          break
      }
      break
    //修改
    case 1:
      switch (syncUrlIndex) {
        case 1:
          url = '/CMS/Layout/Edit'
          break
        case 2:
          url = '/CMS/MLayout/Edit'
          break
        case 3:
          url = '/CMS/ELayout/Edit'
          break
        case 4:
          url = '/CMS/VLayout/Edit'
          break
        case 5:
          url = '/CMS/TLayout/Edit'
          break
        case 6:
          url = '/CMS/TMLayout/Edit'
          break
        case 7:
          url = '/CMS/WSLayout/Edit'
          break
        case 24:
          url = '/CMS/KTMLayout/Edit'
          break
      }
      break
  }
  var postData = {
    ...sourceData
  }
  $.ajax({
    type: 'post',
    url: syncDomian + url,
    data: JSON.stringify(postData),
    contentType: 'application/json; charset=utf-8',
    cache: false,
    dataType: 'json'
  })
    .done(function(addLayoutRes) {
      // {"Result":true,"Message":"保存成功！","Rows":null,"Total":0}
      if (!addLayoutRes.Result) {
        layer.msg('同步失败，' + addLayoutRes.Message)
      }
      successCallback({
        Id: postData.Id,
        Res: addLayoutRes
      })
    })
    .fail(function(jqXHR) {
      layer.msg('同步出现异常，请查看console')
      console.error(jqXHR)
    })
}
//同步布局模板逻辑结束------------------------------------------------------------------------------------------------------------------

//TODO 同步部件逻辑开始------------------------------------------------------------------------------------------------------------------
/**
 * 部件同步
 *
 * @param {string} syncDomian
 * @param {number} syncUrlIndex
 * @param {string} key
 */
function syncWidget(syncDomian, syncUrlIndex, key, successCallback) {
  var getFormDataUrl = '' // /CMS/MWidget/GetFormData
  switch (syncUrlIndex) {
    case 8:
      getFormDataUrl = '/CMS/Widget/GetFormData'
      break
    case 9:
      getFormDataUrl = '/CMS/MWidget/GetFormData'
      break
    case 10:
      getFormDataUrl = '/CMS/EWidget/GetFormData'
      break
    case 11:
      getFormDataUrl = '/CMS/VWidget/GetFormData'
      break
    case 12:
      getFormDataUrl = '/CMS/TWidget/GetFormData'
      break
    case 13:
      getFormDataUrl = '/CMS/TMWidget/GetFormData'
      break
    case 14:
      getFormDataUrl = '/CMS/WSWidget/GetFormData'
      break
    case 25:
      getFormDataUrl = '/CMS/KTMWidget/GetFormData'
      break
  }
  var widgetQueryPostData = {
    Id: key
  }
  $.ajax({
    type: 'post',
    url: getFormDataUrl,
    data: JSON.stringify(widgetQueryPostData),
    contentType: 'application/json; charset=utf-8',
    cache: false,
    dataType: 'json'
  })
    .done(function(widgetRes) {
      if (widgetRes) {
        $.ajax({
          type: 'post',
          url: syncDomian + getFormDataUrl,
          data: JSON.stringify(widgetQueryPostData),
          contentType: 'application/json; charset=utf-8',
          cache: false,
          dataType: 'json'
        })
          .done(function(existWidgetRes) {
            ;(function(initPicCallback) {
              if (widgetRes.Pic && widgetRes.Pic.length > 0) {
                uploadImgToManage(syncDomian, widgetRes.Pic, function(
                  newPicUrl
                ) {
                  widgetRes.Pic = newPicUrl
                  initPicCallback()
                })
              } else {
                initPicCallback()
              }
            })(function() {
              if (existWidgetRes) {
                //修改
                addOrEditWidget(
                  syncDomian,
                  syncUrlIndex,
                  widgetRes,
                  1,
                  successCallback
                )
              } else {
                //新增
                addOrEditWidget(
                  syncDomian,
                  syncUrlIndex,
                  widgetRes,
                  0,
                  successCallback
                )
              }
            })
          })
          .fail(function(jqXHR) {
            layer.msg('同步出现异常，请查看console')
            console.error(jqXHR)
          })
      } else {
        layer.msg(`未找到部件${key}`)
      }
    })
    .fail(function(jqXHR) {
      layer.msg('同步出现异常，请查看console')
      console.error(jqXHR)
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
function addOrEditWidget(
  syncDomian,
  syncUrlIndex,
  sourceData,
  type,
  successCallback
) {
  var url = ''
  switch (type) {
    //新增
    case 0:
      switch (syncUrlIndex) {
        case 8:
          url = '/CMS/Widget/Add?type=' + sourceData.WidgetGroup
          break
        case 9:
          url = '/CMS/MWidget/Add?type=' + sourceData.WidgetGroup
          break
        case 10:
          url = '/CMS/EWidget/Add?type=' + sourceData.WidgetGroup
          break
        case 11:
          url = '/CMS/VWidget/Add?type=' + sourceData.WidgetGroup
          break
        case 12:
          url = '/CMS/TWidget/Add?type=' + sourceData.WidgetGroup
          break
        case 13:
          url = '/CMS/TMWidget/Add?type=' + sourceData.WidgetGroup
          break
        case 14:
          url = '/CMS/WSWidget/Add?type=' + sourceData.WidgetGroup
          break
        case 25:
          url = '/CMS/KTMWidget/Add?type=' + sourceData.WidgetGroup
          break
      }
      break
    //修改
    case 1:
      switch (syncUrlIndex) {
        case 8:
          url = '/CMS/Widget/Edit'
          break
        case 9:
          url = '/CMS/MWidget/Edit'
          break
        case 10:
          url = '/CMS/EWidget/Edit'
          break
        case 11:
          url = '/CMS/VWidget/Edit'
          break
        case 12:
          url = '/CMS/TWidget/Edit'
          break
        case 13:
          url = '/CMS/TMWidget/Edit'
          break
        case 14:
          url = '/CMS/WSWidget/Edit'
          break
        case 25:
          url = '/CMS/KTMWidget/Edit'
          break
      }
      break
  }
  var postData = { ...sourceData }
  $.ajax({
    type: 'post',
    url: syncDomian + url,
    data: JSON.stringify(postData),
    contentType: 'application/json',
    cache: false,
    dataType: 'json'
  })
    .done(function(addWidgetRes) {
      // {"Result":true,"Message":"保存成功！","Rows":null,"Total":0}
      if (!addWidgetRes.Result) {
        layer.msg('同步失败，' + addWidgetRes.Message)
      }
      successCallback({
        Id: postData.Id,
        Res: addWidgetRes
      })
    })
    .fail(function(jqXHR) {
      layer.msg('同步出现异常，请查看console')
      console.error(jqXHR)
    })
}
//同步部件模板结束------------------------------------------------------------------------------------------------------------------

//TODO 同步广告位及广告发布逻辑开始------------------------------------------------------------------------------------------------------------------
/**
 * 广告位同步
 *
 * @param {string} syncDomian
 * @param {number} syncUrlIndex
 * @param {string} key
 */
function syncAdPlace(syncDomian, syncUrlIndex, key, successCallback) {
  var getFormDataUrl = '' // /CMS/AdPlace/GetFormData
  switch (syncUrlIndex) {
    case 15:
      getFormDataUrl = '/CMS/AdPlace/GetFormData'
      break
    case 16:
      getFormDataUrl = '/CMS/MAdPlace/GetFormData'
      break
    case 17:
      getFormDataUrl = '/CMS/EAdPlace/GetFormData'
      break
    case 18:
      getFormDataUrl = '/CMS/VAdPlace/GetFormData'
      break
    case 19:
      getFormDataUrl = '/CMS/TAdPlace/GetFormData'
      break
    case 20:
      getFormDataUrl = '/CMS/TMAdPlace/GetFormData'
      break
    case 21:
      getFormDataUrl = '/CMS/WSAdPlace/GetFormData'
      break
    case 22:
      getFormDataUrl = '/CMS/APPAdPlace/GetFormData'
      break
    case 26:
      getFormDataUrl = '/CMS/KTMAdPlace/GetFormData'
      break
  }
  var adPlaceQueryPostData = {
    Id: key
  }
  $.ajax({
    type: 'post',
    url: getFormDataUrl,
    data: JSON.stringify(adPlaceQueryPostData),
    contentType: 'application/json; charset=utf-8',
    cache: false,
    dataType: 'json'
  })
    .done(function(adPlaceRes) {
      console.log(`adPlaceRes:`)
      console.log(adPlaceRes)
      if (adPlaceRes) {
        $.ajax({
          type: 'post',
          url: syncDomian + getFormDataUrl,
          data: JSON.stringify(adPlaceQueryPostData),
          contentType: 'application/json; charset=utf-8',
          cache: false,
          dataType: 'json'
        })
          .done(function(existAdPlaceRes) {
            console.log(`existAdPlaceRes:`)
            console.log(existAdPlaceRes)
            if (existAdPlaceRes) {
              //修改
              addOrEditAdPlace(
                syncDomian,
                syncUrlIndex,
                adPlaceRes,
                1,
                function() {
                  syncAd(syncDomian, syncUrlIndex, key, function() {
                    successCallback({
                      Id: key,
                      Res: {
                        Result: true
                      }
                    })
                  })
                }
              )
            } else {
              //新增
              addOrEditAdPlace(
                syncDomian,
                syncUrlIndex,
                adPlaceRes,
                0,
                function() {
                  syncAd(syncDomian, syncUrlIndex, key, function() {
                    successCallback({
                      Id: key,
                      Res: {
                        Result: true
                      }
                    })
                  })
                }
              )
            }
          })
          .fail(function(jqXHR) {
            layer.msg('同步出现异常，请查看console')
            console.error(jqXHR)
          })
      } else {
        layer.msg(`未找到广告位${key}`)
      }
    })
    .fail(function(jqXHR) {
      layer.msg('同步出现异常，请查看console')
      console.error(jqXHR)
    })
}

/**
 * 新增或修改广告位及广告部件
 *
 * @param {string} syncDomian
 * @param {number} syncUrlIndex
 * @param {any} sourceData
 * @param {number} type 0-新增 1-修改
 */
function addOrEditAdPlace(
  syncDomian,
  syncUrlIndex,
  sourceData,
  type,
  successCallback
) {
  var url = ''
  switch (type) {
    //新增
    case 0:
      switch (syncUrlIndex) {
        case 15:
          url = '/CMS/AdPlace/Add'
          break
        case 16:
          url = '/CMS/MAdPlace/Add'
          break
        case 17:
          url = '/CMS/EAdPlace/Add'
          break
        case 18:
          url = '/CMS/VAdPlace/Add'
          break
        case 19:
          url = '/CMS/TAdPlace/Add'
          break
        case 20:
          url = '/CMS/TMAdPlace/Add'
          break
        case 21:
          url = '/CMS/WSAdPlace/Add'
          break
        case 22:
          url = '/CMS/APPAdPlace/Add'
          break
        case 26:
          url = '/CMS/KTMAdPlace/Add'
          break
      }
      break
    //修改
    case 1:
      switch (syncUrlIndex) {
        case 15:
          url = '/CMS/AdPlace/Edit'
          break
        case 16:
          url = '/CMS/MAdPlace/Edit'
          break
        case 17:
          url = '/CMS/EAdPlace/Edit'
          break
        case 18:
          url = '/CMS/VAdPlace/Edit'
          break
        case 19:
          url = '/CMS/TAdPlace/Edit'
          break
        case 20:
          url = '/CMS/TMAdPlace/Edit'
          break
        case 21:
          url = '/CMS/WSAdPlace/Edit'
          break
        case 22:
          url = '/CMS/APPAdPlace/Edit'
          break
        case 26:
          url = '/CMS/APPAdPlace/Edit'
          break
      }
      break
  }
  var postData = {
    ...sourceData
  }
  ;(function(initWidgetCallback) {
    if (postData.WidgetId && postData.WidgetId.length > 0) {
      var widgetUrlIndex = 0
      switch (syncUrlIndex) {
        case 15:
          widgetUrlIndex = 8
          break
        case 16:
          widgetUrlIndex = 9
          break
        case 17:
          widgetUrlIndex = 10
          break
        case 18:
          widgetUrlIndex = 11
          break
        case 19:
          widgetUrlIndex = 12
          break
        case 20:
          widgetUrlIndex = 13
          break
        case 21:
          widgetUrlIndex = 14
          break
        case 26:
          widgetUrlIndex = 25
          break
      }
      syncWidget(syncDomian, widgetUrlIndex, postData.WidgetId, function() {
        console.log(`广告位关联广告部件${postData.WidgetId}同步完成`)
        initWidgetCallback()
      })
    } else {
      initWidgetCallback()
    }
  })(function() {
    $.ajax({
      type: 'post',
      url: syncDomian + url,
      data: JSON.stringify(postData),
      contentType: 'application/json; charset=utf-8',
      cache: false,
      dataType: 'json'
    })
      .done(function(addAdPlaceRes) {
        // {"Result":true,"Message":"保存成功！","Rows":null,"Total":0}
        if (!addAdPlaceRes.Result) {
          layer.msg('同步失败，' + addAdPlaceRes.Message)
        }
        successCallback({
          Id: postData.Id,
          Res: addAdPlaceRes
        })
      })
      .fail(function(jqXHR) {
        layer.msg('同步出现异常，请查看console')
        console.error(jqXHR)
      })
  })
}

/**
 * 广告发布同步
 *
 * @param {string} syncDomian
 * @param {number} syncUrlIndex
 * @param {string} key
 */
function syncAd(syncDomian, syncUrlIndex, key, successCallback) {
  // {"filters":[{"whereType":"equal","field":"IsDelete","value":"0"},{"whereType":"equal","field":"AdPlaceId","value":"adp_117_preview_1_0"},{"field":"PlatForm","whereType":"Equal","value":"pc"}],"sorts":[{"field":"ADSort","isAsc":true},{"field":"CreateTime","isAsc":false}],"dbKey":null,"entityType":null,"page":1,"pageSize":20}
  var adQueryUrl = '/CMS/Ad/Query'
  var adQueryPostData = {
    filters: [
      {
        whereType: 'equal',
        field: 'AdPlaceId',
        value: key
      }
    ],
    sorts: [
      {
        field: 'ADSort',
        isAsc: true
      },
      {
        field: 'CreateTime',
        isAsc: false
      }
    ],
    dbKey: null,
    entityType: null,
    page: 1,
    pageSize: 50
  }
  $.ajax({
    type: 'post',
    url: adQueryUrl,
    data: JSON.stringify(adQueryPostData),
    contentType: 'application/json; charset=utf-8',
    cache: false,
    dataType: 'json'
  })
    .done(function(adRes) {
      console.log(`adRes:`)
      console.log(adRes)
      if (adRes && adRes.Total > 0) {
        $.ajax({
          type: 'post',
          url: syncDomian + adQueryUrl,
          data: JSON.stringify(adQueryPostData),
          contentType: 'application/json; charset=utf-8',
          cache: false,
          dataType: 'json'
        })
          .done(function(existAdRes) {
            console.log(`existAdRes:`)
            console.log(existAdRes)
            var addAdResultArr = []
            ;(function(finishAddAdCallback) {
              adRes.Rows.forEach((adInfo, i) => {
                var thatExistAds = []
                if (existAdRes && existAdRes.Total > 0) {
                  thatExistAds = existAdRes.Rows.filter(
                    ad => ad.Id == adInfo.Id
                  )
                }
                if (thatExistAds.length > 0) {
                  //修改
                  addOrEditAd(syncDomian, syncUrlIndex, adInfo, 1, function(
                    syncResult
                  ) {
                    addAdResultArr.push(syncResult)
                    finishAddAdCallback()
                  })
                } else {
                  //新增
                  addOrEditAd(syncDomian, syncUrlIndex, adInfo, 0, function(
                    syncResult
                  ) {
                    addAdResultArr.push(syncResult)
                    finishAddAdCallback()
                  })
                }
              })
            })(function() {
              if (adRes.Rows.length == addAdResultArr.length) {
                successCallback({
                  Id: key,
                  Res: {
                    Result: true
                  }
                })
              }
            })
          })
          .fail(function(jqXHR) {
            layer.msg('同步出现异常，请查看console')
            console.error(jqXHR)
          })
      } else {
        layer.msg(`${key}未找到需同步的广告发布`)
        successCallback({
          Id: key,
          Res: {
            Result: true
          }
        })
      }
    })
    .fail(function(jqXHR) {
      layer.msg('同步出现异常，请查看console')
      console.error(jqXHR)
    })
}

/**
 * 新增或修改广告发布
 *
 * @param {string} syncDomian
 * @param {number} syncUrlIndex
 * @param {any} sourceData
 * @param {number} type 0-新增 1-修改
 */
function addOrEditAd(
  syncDomian,
  syncUrlIndex,
  sourceData,
  type,
  successCallback
) {
  var url = ''
  switch (type) {
    //新增
    case 0:
      switch (syncUrlIndex) {
        case 15:
          url = '/CMS/Ad/Add'
          break
        case 16:
          url = '/CMS/MAd/Add'
          break
        case 17:
          url = '/CMS/EAd/Add'
          break
        case 18:
          url = '/CMS/VAd/Add'
          break
        case 19:
          url = '/CMS/TAd/Add'
          break
        case 20:
          url = '/CMS/TMAd/Add'
          break
        case 21:
          url = '/CMS/WSAd/Add'
          break
        case 22:
          url = '/CMS/APPAd/Add'
          break
        case 26:
          url = '/CMS/KTMAd/Add'
          break
      }
      break
    //修改
    case 1:
      switch (syncUrlIndex) {
        case 15:
          url = '/CMS/Ad/Edit'
          break
        case 16:
          url = '/CMS/MAd/Edit'
          break
        case 17:
          url = '/CMS/EAd/Edit'
          break
        case 18:
          url = '/CMS/VAd/Edit'
          break
        case 19:
          url = '/CMS/TAd/Edit'
          break
        case 20:
          url = '/CMS/TMAd/Edit'
          break
        case 21:
          url = '/CMS/WSAd/Edit'
          break
        case 22:
          url = '/CMS/APPAd/Edit'
          break
        case 26:
          url = '/CMS/KTMAd/Edit'
          break
      }
      break
  }
  //sourceData: {"ROWNUMBER__":1.0,"Id":"m_home_floor_nanke_video_02","Name":"首页楼层男科视频2","PlatForm":"m","Description":"性福蓝皮书视频","Type":"2","Pic":"http://tstimage.360kad.com/group1/M00/15/E3/wKgBEFmvqGKALBtjAABBg-XZhiY512.jpg","Text":null,"Link":"http://m.360kad.com/jknews/jksc/sp/3714205.shtml?kzone=souye_nanke_shiping","HtmlContent":null,"AdPlaceId":"m_home_floor_nanke_video","BeginTime":"2017/08/28 17:11:00","EndTime":"2022/08/31 11:05:00","IsEnable":1.0,"IsDelete":0.0,"CreateTime":"2017/09/06 15:49:06","CreateUser":"ljh1026@@","EditTime":"2017/09/26 15:32:14","EditUser":"adams5496","CateName":"M站首页楼层男科-视频","SiteId":"m","PlaceId":"m_home_floor_nanke_video","WidgetId":"m_home_floor","ADSort":0.0}
  var postData = {
    ...sourceData,
    IsEnable: sourceData.IsEnable == 1 ? true : false
  }
  ;(function(initPicCallback) {
    if (postData.Pic && postData.Pic.length > 0) {
      uploadImgToManage(syncDomian, postData.Pic, function(newPicUrl) {
        postData.Pic = newPicUrl
        initPicCallback()
      })
    } else {
      initPicCallback()
    }
  })(function() {
    $.ajax({
      type: 'post',
      url: syncDomian + url,
      data: JSON.stringify(postData),
      contentType: 'application/json; charset=utf-8',
      cache: false,
      dataType: 'json'
    })
      .done(function(addAdRes) {
        // {"Result":true,"Message":"保存成功！","Rows":null,"Total":0}
        if (!addAdRes.Result) {
          layer.msg('同步失败，' + addAdRes.Message)
        }
        successCallback({
          Id: postData.Id,
          Res: addAdRes
        })
      })
      .fail(function(jqXHR) {
        layer.msg('同步出现异常，请查看console')
        console.error(jqXHR)
      })
  })
}
//同步广告位及广告发布逻辑结束------------------------------------------------------------------------------------------------------------------

//TODO 同步常量逻辑开始------------------------------------------------------------------------------------------------------------------
/**
 * 广告位同步
 *
 * @param {string} syncDomian
 * @param {number} syncUrlIndex
 * @param {string} key
 */
function syncConfigItem(syncDomian, syncUrlIndex, key, successCallback) {
  var getFormDataUrl = '/Config/ConfigItem/Query'
  var configItemQueryPostData = {
    filters: [
      {
        whereType: 'Equal',
        field: 'ConfigKey',
        value: key
      }
    ],
    sorts: [
      {
        field: 'ModifyDate',
        isAsc: false
      }
    ],
    dbKey: null,
    entityType: null,
    page: 1,
    pageSize: 1
  }
  $.ajax({
    type: 'post',
    url: getFormDataUrl,
    data: JSON.stringify(configItemQueryPostData),
    contentType: 'application/json; charset=utf-8',
    cache: false,
    dataType: 'json'
  })
    .done(function(configItemRes) {
      console.log(`configItemRes:`)
      console.log(configItemRes)
      if (
        configItemRes &&
        configItemRes.Rows &&
        configItemRes.Rows.length > 0
      ) {
        $.ajax({
          type: 'post',
          url: syncDomian + getFormDataUrl,
          data: JSON.stringify(configItemQueryPostData),
          contentType: 'application/json; charset=utf-8',
          cache: false,
          dataType: 'json'
        })
          .done(function(existConfigItemRes) {
            console.log(`existConfigItemRes:`)
            console.log(existConfigItemRes)
            if (
              existConfigItemRes &&
              existConfigItemRes.Rows &&
              existConfigItemRes.Rows.length > 0
            ) {
              //修改
              addOrEditConfigItem(
                syncDomian,
                syncUrlIndex,
                configItemRes.Rows[0],
                1,
                successCallback
              )
            } else {
              //新增
              addOrEditConfigItem(
                syncDomian,
                syncUrlIndex,
                configItemRes.Rows[0],
                0,
                successCallback
              )
            }
          })
          .fail(function(jqXHR) {
            layer.msg('同步出现异常，请查看console')
            console.error(jqXHR)
          })
      } else {
        layer.msg(`未找到常量${key}`)
      }
    })
    .fail(function(jqXHR) {
      layer.msg('同步出现异常，请查看console')
      console.error(jqXHR)
    })
}

/**
 * 新增或修改常量
 *
 * @param {string} syncDomian
 * @param {number} syncUrlIndex
 * @param {any} sourceData
 * @param {number} type 0-新增 1-修改
 */
function addOrEditConfigItem(
  syncDomian,
  syncUrlIndex,
  sourceData,
  type,
  successCallback
) {
  var url = ''
  switch (type) {
    //新增
    case 0:
      url = '/Config/WebConstantConfig/Add'
      break
    //修改
    case 1:
      url = '/Config/WebConstantConfig/Edit'
      break
  }
  var postData = {
    ...sourceData
  }
  $.ajax({
    type: 'post',
    url: syncDomian + url,
    data: JSON.stringify(postData),
    contentType: 'application/json; charset=utf-8',
    cache: false,
    dataType: 'json'
  })
    .done(function(result) {
      successCallback({
        Id: postData.ConfigKey,
        Res: {
          Result: true
        }
      })
    })
    .fail(function(jqXHR) {
      layer.msg('同步出现异常，请查看console')
      console.error(jqXHR)
    })
}
//TODO 同步常量逻辑结束------------------------------------------------------------------------------------------------------------------

//TODO 图片上传开始-------------------------------------------------------------------------------------------------------------------------
/**
 * 同步在线图片
 *
 * @param {string} syncDomian 要同步到的域
 * @param {string} onlineImgUrl 在线图片url
 * @param {any} successCallback 成功回调
 * @param {any} errorCallback 失败回调
 */
function uploadImgToManage(
  syncDomian,
  onlineImgUrl,
  successCallback,
  errorCallback
) {
  if (!XMLHttpRequest.prototype.sendAsBinary) {
    XMLHttpRequest.prototype.sendAsBinary = function(sData) {
      var nBytes = sData.length,
        ui8Data = new Uint8Array(nBytes)
      for (var nIdx = 0; nIdx < nBytes; nIdx++) {
        ui8Data[nIdx] = sData.charCodeAt(nIdx) & 0xff
      }
      /* send as ArrayBufferView...: */
      this.send(ui8Data)
      /* ...or as ArrayBuffer (legacy)...: this.send(ui8Data.buffer); */
    }
  }
  var downloadXHR = new XMLHttpRequest()
  downloadXHR.open('GET', onlineImgUrl, true)
  downloadXHR.responseType = 'blob' //"arraybuffer";
  downloadXHR.onload = function() {
    if (this.status == 200) {
      var reader = new window.FileReader()
      reader.readAsDataURL(this.response)
      reader.onloadend = function() {
        var base64data = reader.result
        //创建一个ajax请求：
        var uploadUrl = '/File/Upload'
        var uploadImgFileName = 'test.png'
        var uploadXHR = new XMLHttpRequest()
        uploadXHR.open('POST', uploadUrl, true)
        var boundary = '----------KM7cH2KM7KM7cH2ei4KM7ei4GI3KM7'
        uploadXHR.setRequestHeader(
          'Content-Type',
          'multipart/form-data; boundary=' + boundary
        )
        //上传
        var data = base64data.replace(/data:([\s\S]*);base64,/, '')
        uploadXHR.sendAsBinary(
          `\r\n\r\n--${boundary}\r\nContent-Disposition: form-data; name=\"Filename\"\r\n\r\n${uploadImgFileName}\r\n--${boundary}\r\nContent-Disposition: form-data; name=\"urlWithFileName\"\r\n\r\nfalse\r\n--${boundary}\r\nContent-Disposition: form-data; name=\"Filedata\"; filename=\"${uploadImgFileName}\"\r\nContent-Type: application/octet-stream\r\n\r\n${atob(
            data
          )}\n--${boundary}\r\nContent-Disposition: form-data; name=\"Upload\"\r\n\r\nSubmit Query\r\n--${boundary}--`
        )
        // 上传进度
        uploadXHR.upload.onprogress = function(event) {
          if (event.lengthComputable) {
            console.log((event.loaded / event.total) * 100)
          }
        }
        //成功和失败回调
        uploadXHR.onreadystatechange = function() {
          if (this.readyState == 4) {
            if (this.status == 200) {
              successCallback(this.responseText)
            } else {
              errorCallback(this)
              layer.msg('上传图片出现异常，请查看console')
              console.error(this)
            }
          }
        }
      }
    } else {
      layer.msg('同步内容的图片获取出现异常，请查看console')
      console.error(this)
    }
  }
  downloadXHR.send()
}

/**
 * 同步在线图片
 *
 * @param {string} syncDomian 要同步到的域
 * @param {string} onlineImgUrl 在线图片url
 * @param {any} successCallback 成功回调
 * @param {any} errorCallback 失败回调
 */
function uploadImgToManage2(
  syncDomian,
  onlineImgUrl,
  successCallback,
  errorCallback
) {
  var downloadXHR = new XMLHttpRequest()
  downloadXHR.open('GET', onlineImgUrl, true)
  downloadXHR.responseType = 'blob'
  downloadXHR.onload = function() {
    if (this.status == 200) {
      var blob = this.response
      var fileNameExt = onlineImgUrl.substring(
        onlineImgUrl.lastIndexOf('.'),
        onlineImgUrl.length
      )
      var imgFileName = 'test' + fileNameExt
      var form = new FormData()
      form.append('uploadImg', blob, imgFileName)
      var uploadXHR = new XMLHttpRequest()
      uploadXHR.open('POST', syncDomian + 'File/Upload')
      uploadXHR.onloadend = function() {
        if (this.status == 200) {
          successCallback(
            this.responseText.replace('?filename=' + imgFileName, '')
          )
        } else {
          errorCallback(this)
        }
      }
      uploadXHR.send(form)
    } else {
      errorCallback(this)
    }
  }
  downloadXHR.send()
}
//图片上传结束-----------------------------------------------------------------------------------------------------------------------------

function ajaxPost(url, data) {
  return $.ajax({
    type: 'post',
    url: url,
    data: JSON.stringify(data),
    cache: false,
    contentType: 'application/json; charset=utf-8',
    dataType: 'json'
  })
}
function fetchPost(url, data) {
  return fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(res => res.json())
}
