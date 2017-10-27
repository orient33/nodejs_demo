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

ExcelParser.prototype.read = function(file) {
  var self = this;
  return new Promise(function(resolve, reject){
    try {
      var latestModified = fs.statSync(file).mtime;
      var workbook = XLSX.readFile(file);
      var sheet = workbook.Sheets.strings;
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
        }
      }

      self._data = content;
      self._latestModified = latestModified;
      self.emitter.emit("read", content);
      resolve(content);
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
    var sheet = generateExcelContent(data);
    var workbook = xlsGen.generate({'strings': sheet});
    var dir = path.dirname(file);
    mkdirs(dir);
    xlsGen.writeFile(workbook, file);
  });
};

function generateExcelContent(data) {
  var sorted_keys = [];
  var columns = null;
  for (var key in data) {
    sorted_keys.push(key);
    if (!columns) {
      var value = data[key];
      columns = [];
      columns.push('id');
      for (var column in value) {
        columns.push(column);
      }
    }
  }
  sorted_keys.sort();

  var header_style = {
    alignment: {horizontal: 'center'},
    font: {bold: true}
  };

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
  for (i = 0; i < columns.length; i++) {
    sheet.header.columns.push({
      v: columns[i],
      s: header_style
    });
  }

  for (i = 0; i < sorted_keys.length; i++) {
    key = sorted_keys[i];
    items = [key];
    for (j = 0; j < columns.length; j++) {
      type = columns[j];
      val = data[key][type];
      if (val == undefined) {
        continue;
      }
      items.push(val);
    }
    sheet.data.rows.push(items);
  }
  return sheet;
}

exports = module.exports = ExcelParser;
