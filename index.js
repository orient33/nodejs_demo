var StringFileParser = require('./lib/StringParser');
var ExcelParser = require('./lib/ExcelParser');
var Promise = require('bluebird');


exports = module.exports = function(opts) {
  var project_path = opts.project_path;
  var excel_path = opts.excel_path;

  var sParser = new StringFileParser();
  var eParser = new ExcelParser();

  // return Promise.all([
  //   sParser.read(project_path),
  //   eParser.read(excel_path)
  // ]).spread(function(sParser, eParser) {
  //   if (eParser.getLatestModified() > sParser.getLatestModified()) {
  //     sParser.setData(eParser.getData());
  //     return sParser.write(project_path);
  //   } else {
  //     eParser.setData(sParser.getData());
  //     return eParser.write(excel_path);
  //   }
  // });

  // return Promise.all([sParser.read(project_path)]).then(function(data){
  //   return sParser.write(project_path);
  // });
  return Promise.all([sParser.read(project_path), eParser.read(excel_path)])
    .spread(function(sData, eData){
      if (!sData && !eData) {
        throw new Error("no project and no excel found.");
      }

      console.log(" 读取结果: "+ (!sData)+",, "+(!eData));
      if (!sData) {
        console.log("xml empty. write xml from Excel.");
        sParser.setData(eData);
        return sParser.write(project_path);
      } else if (!eData) {
        console.log("Excel empty. write Excel from xml.");
        eParser.setData(sData);
        return eParser.write(excel_path);
      } else {
        console.log("Excel not empty, xml not empty! write each other!");
        var union = {};
        var parser1 = sParser;
        var parser2 = parser1 == sParser ? eParser : sParser;

        var key, type, value;
        var sorted_keys = [];
        var data = parser1.getData();
        for (key in data) {
          union[key] = data[key];
        }

        data = parser2.getData();
        for (key in data) {
          var item = data[key];
          for (type in item) {
            if (union[key] == undefined) {
              union[key] = {};
            }
            union[key][type] = item[type];
          }
        }

        sParser.setData(union);
        eParser.setData(union);

        return Promise.all([sParser.write(project_path), eParser.write(excel_path)]);
      }
    });
};
