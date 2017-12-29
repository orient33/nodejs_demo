var events = require('events');
var util = require('util');
var fs = require('fs');
var path = require('path');
var mkdirs = require('mkdirs');
var Promise = require('bluebird');
var xlsGen = require('js-xlsx-gen')();
var XLSX = require('xlsx');

function ExcelParser(){
  this.emitter = new events.EventEmitter(this);
}

util.inherits(ExcelParser, events.EventEmitter);

ExcelParser.prototype.setData = function (data) {
  this._data = data;
};

ExcelParser.prototype.getData = function() {
  return this._data;
};

ExcelParser.prototype.getLatestModified = function (){
  return this._latestModified;
};

// see https://github.com/SheetJS/js-xlsx/blob/master/bin/xlsx.njs
ExcelParser.prototype.read = function(file) {
  var self = this;
  return new Promise(function(resolve, reject){
    var log = "\n--------------ExcelParser.read() start------------\n";
    try {
      var latestModified = fs.statSync(file).mtime;
      var workbook = XLSX.readFile(file);
      var contents = {};

      for(var sheetName in workbook.Sheets) {

        log += "read sheet : "+sheetName+"\n";
		var sheet = workbook.Sheets[sheetName];
        var content = {}, types = {}, idCol = null;

        var cells = {}, value, row, col;
        var numOfRows = 0;
        for (var cellName in sheet) {
          if (!cellName.match(/[A-Z0-9]+/)) {
            continue;
          }

          row = parseInt(cellName.replace(/[A-Z]+/, ''));
          col = cellName.replace(/\d+/, '');
          value = sheet[cellName].v;
          //log += "cellName: "+cellName+" ,value:"+value+"\n";
          //cellName: A1 ,value:id
          //cellName: A2 ,value:app_name
          if (row == 1) {
            if ('id' === value) {
              idCol = col;
            } else {
              types[col] = value;
            }
          } else {
            cells[cellName] = value;
            numOfRows = row;
          }
        }

        for (var i = 2; i <= numOfRows; i++) {
          row = i;
          var cell = sheet[idCol + row];
          var id = cell ? cell.v : undefined;
          if (id == undefined) {
            continue;
          }

          for (col in types) {
            var type = types[col];
            value = cells[col+row];
            if (content[id] == undefined) {
              content[id] = {};
            }
            content[id][type] = value || "";
          //log += "content["+id+"]["+type+"] = "+(value||"") +"\n";
          //content[ac_air2_str][values] = 2档
          //content[ac_air2_str][values-en] = 2
          }
        }
		contents[sheetName] = content;
      }

      console.log(log+"-------------ExcelParser.read() end-------------------\n");
      self._data = contents;
      self._latestModified = latestModified;
      self.emitter.emit("read", contents);
      resolve(contents);
    } catch(e) {
      console.error(e);
      resolve(null);
    }
  });
};

ExcelParser.prototype.write = function(file) {
  var self = this;
  var data = self._data;
  return new Promise(function(resolve, reject){
    var log = "\n----------------ExcelParser.write() start---------\n";
    var sheet = generateExcelContent(data);
    var workbook = xlsGen.generate(sheet);
    var dir = path.dirname(file);
    mkdirs(dir);
    xlsGen.writeFile(workbook, file);
    log += "\n------------ExcelParser.write() end---------------\n";
    console.log(log);
  });
};

function generateExcelContent(datas) {
  var sheets = {};//每个plugin一个sheet
  for(var pluginName in datas){
    var data = datas[pluginName];
    var sorted_keys = [];
    var columns = new Set();
    columns.add("id");
    for (var stringId in data) {
      sorted_keys.push(stringId);
      var value = data[stringId];
      for (var column in value) {
          if (!columns.has(column)){
          columns.add(column);
        }
      }
    }
    sorted_keys.sort();

    var header_style = {
      alignment: {horizontal: 'center'},
      font: {bold: true}
    };

    //see https://github.com/panosoft/js-xlsx-gen
    var sheet = {
      header: {
        styles: {
          row: header_style
        },
        columns: []
      },
      data: {
        rows: []
      }
    };

    var i, j, items, type, val;
    for (var column of columns) {
      sheet.header.columns.push({
        v: column,
        s: header_style
      });
    }

    for (i = 0; i < sorted_keys.length; i++) {
      key = sorted_keys[i];
      items = [key];
      for (var language of columns) {
        type = language;
        val = data[key][type];
        if (val == undefined) {
          continue;
        }
        items.push(val);
      }
      sheet.data.rows.push(items);
    }
    sheets[pluginName] = sheet;
  }
  return sheets;
}

exports = module.exports = ExcelParser;
