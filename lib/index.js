var child_process = require('child_process')
var path = require('path')
var fs = require('fs')

var request = require('superagent')
var unzip = require('unzip')

var DOWNLOAD_VERSION = '0.5.2'

var matches = {
  address: /VAULT_ADDR='(.+)'/,
  key: /Unseal Key: (.+)/,
  token: /Root Token: (.+)/
}

function spawn (opts, callback) {
  if (!opts) {
    opts = {}
  }
  if (typeof opts === 'string') {
    opts = { dir: opts }
  }
  if (!opts.file) {
    opts.file = 'vault'
  }
  if (!opts.dir) {
    opts.dir = process.cwd()
  }
  if (!opts.args) {
    opts.args = []
  }
  opts.args.unshift('server')
  opts.args.push('-dev')
  var proc = child_process.spawn(path.join(opts.dir, opts.file), opts.args)
  var out = {}
  out.process = proc
  var _count = 0
  proc.stdout.on('data', function (data) {
    _count++
    if (_count !== 1) return
    for (var k in matches) {
      out[k] = data.toString().match(matches[k])[1]
    }
    callback(null, out)
  })
}

function download (folder, callback) {
  var url = 'https://releases.hashicorp.com/vault/' + DOWNLOAD_VERSION + '/vault_' + DOWNLOAD_VERSION + '_platform_amd64.zip'
  switch (process.platform) {
    case 'darwin':
    case 'freebsd':
    case 'linux': {
      url = url.replace('platform', process.platform)
      break
    }
    case 'win32': {
      url = url.replace('platform', 'windows')
      break
    }
    default: {
      console.error('Unable to detect platform to download Vault, please open issue on spawn-dev-vault')
      process.exit(1)
    }
  }
  var ext = unzip.Extract({ path: folder + '/_vault' })
  ext.on('close', function () {
    fs.rename(path.join(folder + '/_vault/vault'), path.join(folder + '/vault'), function (err) {
      if (err) {
        return callback(new Error('error moving downloaded file'))
      }
      fs.rmdir(path.join(folder + '/_vault'), function (err) {
        if (err) {
          return callback(new Error('error removing temporary download folder'))
        }
        fs.chmod(path.join(folder + '/vault'), '0744', function (err) {
          if (err) {
            return callback(new Error('error marking vault as executable'))
          }
          return callback()
        })
      })
    })
  })
  var req = request.get(url)
  req.pipe(ext)
}

spawn.download = download

module.exports = spawn
