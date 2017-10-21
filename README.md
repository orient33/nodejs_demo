Internationalization tool
=========================

该项目是为了减少翻译人员和开发人员之间的沟通工作以及频繁对多语言文件的配置工作。降低翻译人员的翻译门槛.

该项目可以抽取 AndroidStudio 项目中的语言文档，并合并成一份按照 alphabetical 排序的的 Excel 表. 表内包含了所有该AndroidStudio项目中涉及的多语言内容.

### 如何使用

#### 准备

-	Nodejs 本地环境.
-	一个 Android Studio 项目

#### 抽取项目中的多语言内容

```javascript
# 该项目的所在位置假定为 $TOOL_ROOT
# Android项目的所在位置假定为 $ANDROID_PROJECT
# Excel文档的所在位置假定为 $EXCEL_FILE
node $TOOL_ROOT/bin/i18n $ANDROID_PROJECT $EXCEL_FILE
```

#### 把Excel表中的多语言内容部署到Android项目中

```javascript
# 该项目的所在位置假定为 $TOOL_ROOT
# Android项目的所在位置假定为 $ANDROID_PROJECT
# Excel文档的所在位置假定为 $EXCEL_FILE
node $TOOL_ROOT/bin/i18n $ANDROID_PROJECT $EXCEL_FILE
```
