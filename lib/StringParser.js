var events = require('events');
var util = require('util');
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var XMLReader = require('xml-reader');
var XMLBuilder = require('xml');
var mkdirs = require('mkdirs');


function StringFileParser(){
  this.emitter = new events.EventEmitter(this);
}

util.inherits(StringFileParser, events.EventEmitter);

StringFileParser.prototype.getData = function() {
  return this._data;
};

StringFileParser.prototype.setData = function(data) {
  this._data = data;
};

StringFileParser.prototype.getLatestModified = function (){
  return this._latestModified;
};

StringFileParser.prototype.read = function(basePath) {
  var self = this;
  return new Promise(function(resolve, reject){
    try {
      var files = findStringFileFrom(basePath);

      var temp = [];

      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var type = path.dirname(file).split(path.sep).pop();
        var latestModified = fs.statSync(file).mtime;
        var content = readDataFrom(file);
        temp.push({
            file: file,
            type: type,
            latestModified: latestModified,
            content:content
        });
      }
      var data = {latestModified:0, content: {}};
      for (i = 0; i < temp.length; i++) {
        var item = temp[i];
        data.latestModified = data.latestModified < item.latestModified ? item.latestModified : data.latestModified;
        for (var id in item.content) {
          if (data.content[id] == undefined) {
            data.content[id] = {};
          }
          data.content[id][item.type] = item.content[id];
        }
      }

      self._latestModified = data.latestModified;
      self._data = data.content;
      self.emitter.emit('read', data.content);
      resolve(data.content);
    } catch (e) {
      reject(e);
    }
  });
};

StringFileParser.prototype.write = function(projectPath) {
  var self = this;
  return new Promise(function(resolve, reject){
    var data = self._data;
    if (!data) {
      reject("no data need to be write.");
      return;
    }

    var content, type, contents = {};
    for (var id in data) {
      content = data[id];
      for (type in content) {
        if (contents[type] == undefined) {
          contents[type] = {};
        }
        contents[type][id] = content[type];
      }
    }

    for (type in contents) {
      content = contents[type];
      var xml = buildStringsFile(content);
      var dir = path.join(projectPath, 'src/main/res/' + type);
      mkdirs(dir);
      fs.writeFile(path.join(dir, 'strings.xml'), xml);
    }
  });
};

function findStringFileFrom(base_path) {
  var target = "strings.xml";
  var stats = fs.statSync(base_path);
  var ret = [];
  if (stats.isDirectory()) {
      var files = fs.readdirSync(base_path);
      var ignored = ["build"];
      for (var i = 0; i < files.length; i++) {
        var filename = files[i];
        if (-1 < ignored.indexOf(filename)) {
          continue;
        } else {
          var list = findStringFileFrom(path.join(base_path, filename));
          if (0 < list.length) {
            ret.push.apply(ret, list);
          }
        }
      }
  } else if(path.basename(base_path) === target) {
      ret.push(base_path);
  }
  return ret;
}

function readDataFrom(file) {
  var data = {};
  var xmlString = fs.readFileSync(file, "utf-8");
  var reader = XMLReader.create();
  reader.on('done', function(dom){
    var items = dom.children;
    items.forEach(function(item) {
      if (item.name != 'string') {
        console.error('无法识别的内容: ');
        console.dir(item);

      } else {
        var name = item.attributes.name;
        var value = stringifyXMLNodeContent(item);
        data[name] = value || '';
      }
    });
  });
  reader.parse(xmlString);
  return data;
}

function stringifyXMLNodeContent(node){
  if (node.type == 'text') {
    return node.value;
  } else {

    var ret = "";

    if (node.name !== 'string') {
        ret += "<" + node.name + ">";
    }

    if (node.name === 'Data') {
      ret += "<![CDATA[";
    }

    var children = node.children;
    if (children && 0 < children.length) {
      children.forEach(function(child) {
        ret += stringifyXMLNodeContent(child);
      });
    }

    if (node.name === 'Data') {
      ret += "]]>";
    }

    if (node.name !== 'string') {
      ret += "</" + node.name + ">";
    }

    return ret;
  }
}

function buildStringsFile(content) {
  var xmlString = "<resources>\n";
  for (var key in content) {
    var value = content[key];
    try {
      xmlString += '\t<string name="' + key + '">' + value + '</string>\n';
    } catch (e) {
      console.error(key, value);
      console.error(e);
    }

  }
  xmlString += '</resources>';
  return xmlString;

}

exports = module.exports = StringFileParser;
