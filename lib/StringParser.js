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
  return this._Rdata;
};

StringFileParser.prototype.setData = function(data) {
  this._Wdata = data;
};

StringFileParser.prototype.getPathMap = function() {
    return this._pathMap;
};

StringFileParser.prototype.getLatestModified = function (){
  return this._latestModified;
};

StringFileParser.prototype.read = function(configFile) {
  var self = this;
  return new Promise(function(resolve, reject){
    var log ="\n----------------StringParser.read() start---------\n";
    try {
      var temps = {};
      var paths = findEveryPluginStringFile(configFile);
      for(var key in paths){
        var basePath = paths[key];
        var files = findStringFileFrom(basePath);

        var temp = [];
        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          var type = path.dirname(file).split(path.sep).pop();
          var latestModified = fs.statSync(file).mtime;
          var content = readDataFrom(file);
          log += "plugin: "+key+", file : "+file+" type :"+type+ "\n";
          temp.push({
            file: file,
            type: type,
            latestModified: latestModified,
            content:content
          });
        }
        temps[key] = temp;
      }
      var data = {latestModified:0, content: {}};
      const r={};
      for(var key in temps) {
        var temp = temps[key];
        for (i = 0; i < temp.length; i++) {
          var item = temp[i];
          data.latestModified = data.latestModified < item.latestModified ? item.latestModified : data.latestModified;
          if(data.content[key] == undefined) {
            data.content[key] = {};
            r[key] ={};
          }
          for (var id in item.content) {
            if (data.content[key][id] == undefined) {
              data.content[key][id] = {};
              r[key][id]={};
            }
            data.content[key][id][item.type] = item.content[id];
            r[key][id][item.type] = item.content[id];
          //console.log(`String.xml read : [${key}][${id}][${item.type}] == ${item.content[id]}`);
          //输出: [account][trip_start_time_text][values-en] == Start Time
          }
        }
      }
	  log += "------------------StringParser.read() end-------------\n"
      console.log(log);
      self._latestModified = data.latestModified;
      self._ReadOnlyData = r;//只读的,不能被外部修改的map
      self._Rdata = data.content;
      self._pathMap = paths;
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
    var log = "\n--------------StringParser.write() start----------\n";
    var datas = self._Wdata;
    var pathMap = self._pathMap;
    if (!datas) {
      reject("no datas need to be write.");
      return;
    }
    if (!pathMap) {
        reject("no path map to be write.");
        return;
    }

    var content, type, contents = {};
    for (var key in datas) {
      var data = datas[key];
      for (var id in data) {
        content = data[id];
        if (contents[key] == undefined) {
          contents[key] = {};
        }
        for (type in content) {
          if (contents[key][type] == undefined) {
            contents[key][type] = {};
          }
          contents[key][type][id] = content[type];
        }
      }
    }

    //遍历,转换维度[plugin][id][type] -> [plugin][type][id]
    const rData = self._ReadOnlyData;
    var readDatas = {};
    for(var p in rData) {
        readDatas[p] = {};
        for(var id in rData[p]) {
            for(var type in rData[p][id]) {
                if(readDatas[p][type] == undefined) {
                    readDatas[p][type] = {};
                }
                readDatas[p][type][id] = rData[p][id][type];
                //console.log(`read.. ${p}${type}${id} : ${readDatas[p][type][id]}`);
            }
        }
    }
    
    for (var key in contents) {
      if(!pathMap[key]) {
         log += `ignore Plugin : ${key}, \n`;
         continue;
      } else {
          log += `write plugin : ${key}\n`;
      }
      for (type in contents[key]) {
        if (!isNeedWrite(readDatas[key],contents[key], key, type)){
            log += `key-value一致,无需重写 : ${key}, ${type}\n`;
            continue;
        }
        content = contents[key][type];
        var xml = buildStringsFile(content);
        var dir = path.join(pathMap[key], 'main/res/' + type);
        //log += "mkdirs if need : "+ dir+"\n";
        mkdirs(dir);
        fs.writeFile(path.join(dir, 'strings.xml'), xml);
      }
    }
    log += "--------------StringParser.write() end-----------\n";
    console.log(log);
  });
};

function findEveryPluginStringFile(configFile){
  var result = {};
  const xmlString = fs.readFileSync(configFile, "utf-8");
  const reader = XMLReader.create({stream: true});
  reader.on('tag', (name, data) => {
      const path = data.children[0].value;
//    console.log(`parse-- ${name} : `,  path);
      result[name] = path;
  });
  reader.parse(xmlString);
  return result
}

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
        if (item.attributes.translatable == "false"){
           console.log("不需要翻译: "+ name);
		} else{
            var value = stringifyXMLNodeContent(item);
            data[name] = value || '';
        }
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
	if(!(value.indexOf('"')==0 && value.lastIndexOf('"')==value.length-1)) {
		//如果string不被 双引号 修饰,则添加上双引号
		value = `"${value}"`;
	}
    try {
      xmlString += `    <string name="${key}">${value}</string>\n`;
    } catch (e) {
      console.error(key, value);
      console.error(e);
    }

  }
  xmlString += '</resources>';
  return xmlString;

}

//是否需要重写plugin的values-XX的strings.xml
function isNeedWrite(readValues, writeValues, key, type) {
    var need = 0
    var readValue, writeValue;
    for (var id in writeValues[type]) {
      writeValue = writeValues[type][id];
      if (readValues[type][id] == undefined) {
          console.log(` ${key}, ${type} 缺失 ${id}`);
          need += 1;
      } else {
          if (contain2quot(writeValue)) writeValue = writeValue.substr(1, writeValue.length-2);
          if (contain2quot(readValue = readValues[type][id])) readValue = readValue.substr(1, readValue.length-2);
          if (writeValue != readValue) {
              console.log(` ${key}, ${type}, ${id}不一致: ${readValue} vs ${value} `);
              need += 1;
          }
      }
    }
    return need > 0;
}

function contain2quot(value){
    return (value.indexOf('"')==0 && value.lastIndexOf('"')==value.length-1)
}
exports = module.exports = StringFileParser;
