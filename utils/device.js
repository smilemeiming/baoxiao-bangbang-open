function isDesktopPlatform(platform) {
  return ['windows', 'mac'].indexOf(`${platform || ''}`.toLowerCase()) >= 0
}

function isDesktopWechat() {
  try {
    const info = wx.getDeviceInfo
      ? wx.getDeviceInfo()
      : wx.getSystemInfoSync()

    return isDesktopPlatform(info && info.platform)
  } catch (error) {
    return false
  }
}

module.exports = {
  isDesktopPlatform,
  isDesktopWechat
}
