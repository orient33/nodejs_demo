Internationalization tool
=========================

该项目是为了减少翻译人员和开发人员之间的沟通工作以及频繁对多语言文件的配置工作。降低翻译人员的翻译门槛.

该项目可以抽取 AndroidStudio 项目中的语言文档，并合并成一份按照 alphabetical 排序的的 Excel 表. 表内包含了所有该AndroidStudio项目中涉及的多语言内容.

### 如何使用

#### 准备

-	Nodejs 本地环境.
-	若干个 Android Studio 项目 形成的config.xml文件

#### 抽取项目中的多语言内容

```shell
# 该项目的所在位置假定为 $TOOL_ROOT
# config.xml文件所在位置为 $CONFIG_FILE
# Excel文档的所在位置假定为 $EXCEL_FILE
node $TOOL_ROOT/bin/i18n $CONFIG_FILE $EXCEL_FILE
```

#### 把Excel表中的多语言内容部署到Android项目中

```shell
# 该项目的所在位置假定为 $TOOL_ROOT
# config.xml文件所在位置为 $CONFIG_FILE
# Excel文档的所在位置假定为 $EXCEL_FILE
node $TOOL_ROOT/bin/i18n $CONFIG_FILE $EXCEL_FILE
```

config.xml文件配置标明工程(插件plugin)名和路径:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<resources>
  <pluginName1>pluginModulePath1</notification>
  <pluginName2>pluginModulePath2</notification>
<resources>

```
生成Excel表格文件如下:
一个工程(插件)对应Excel一张sheet:

| id       |   values   |  values-en  |
|:--------:|:----------:|:-----------:|
| appName  |   插件名   |  pluginName |
