const SHARE_TITLE = '报销帮帮'
const SHARE_PATH = '/pages/index/index'

function enableShareMenu() {
  if (typeof wx === 'undefined' || !wx.showShareMenu) {
    return
  }

  wx.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline']
  })
}

function getShareAppMessage() {
  return {
    title: SHARE_TITLE,
    path: SHARE_PATH
  }
}

function getShareTimeline() {
  return {
    title: SHARE_TITLE,
    query: ''
  }
}

module.exports = {
  enableShareMenu,
  getShareAppMessage,
  getShareTimeline
}
