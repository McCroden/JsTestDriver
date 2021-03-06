/*
 * Copyright 2009 Google Inc.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
jstestdriver.SERVER_URL = "/query/";


jstestdriver.listen = function() {
  var id = jstestdriver.extractId(window.location.toString());
  var url = jstestdriver.SERVER_URL + id;

  jstestdriver.initializeTestCaseManager();
  new jstestdriver.CommandExecutor(parseInt(id), url, jstestdriver.convertToJson(jQuery.post),
      jstestdriver.testCaseManager).listen();
};


jstestdriver.TIMEOUT = 500;


jstestdriver.CommandExecutor = function(id, url, sendRequest, testCaseManager) {
  this.__id = id;
  this.__url = url;
  this.__sendRequest = sendRequest;
  this.__testCaseManager = testCaseManager;
  this.__boundExecuteCommand = jstestdriver.bind(this, this.executeCommand);
  this.__boundExecute = jstestdriver.bind(this, this.execute);
  this.__boundEvaluateCommand = jstestdriver.bind(this, this.evaluateCommand);
  this.__boundSendData = jstestdriver.bind(this, this.sendData);
  this.boundCleanTestManager = jstestdriver.bind(this, this.cleanTestManager);
  this.boundOnFileLoaded_ = jstestdriver.bind(this, this.onFileLoaded);
  this.commandMap_ = {
      loadLibraries: jstestdriver.bind(this, this.loadLibraries),
      execute: jstestdriver.bind(this, this.execute),
      runAllTests: jstestdriver.bind(this, this.runAllTests),
      runTests: jstestdriver.bind(this, this.runTests),
      loadTest: jstestdriver.bind(this, this.loadTest),
      reset: jstestdriver.bind(this, this.reset),
      registerCommand: jstestdriver.bind(this, this.registerCommand)
  };
  this.boundOnTestDone = jstestdriver.bind(this, this.onTestDone_);
  this.boundOnComplete = jstestdriver.bind(this, this.onComplete_);
  this.boundSendTestResults = jstestdriver.bind(this, this.sendTestResults_);
  this.boundOnDataSent = jstestdriver.bind(this, this.onDataSent_);
  this.testsDone_ = [];
  this.sentOn_ = -1;
  this.done_ = false;
  jstestdriver.executor = this;
};


jstestdriver.CommandExecutor.prototype.executeCommand = function(jsonCommand) {
  if (jsonCommand == 'noop') {
    this.__sendRequest(this.__url, null, this.__boundExecuteCommand);
  } else {
    var command = jsonParse(jsonCommand);

    this.commandMap_[command.command](command.parameters);
  }
};


jstestdriver.CommandExecutor.prototype.sendData = function(data) {
  this.__sendRequest(this.__url, data, this.__boundExecuteCommand);
};


jstestdriver.CommandExecutor.prototype.execute = function(cmd) {
  var data = {
    done: '',
    response: {
      response: this.__boundEvaluateCommand(cmd),
      browser: {
        "id": this.__id,
        "name": jstestdriver.getBrowserFriendlyName(),
        "version": jstestdriver.getBrowserFriendlyVersion(),
        "os": navigator.platform
      }
    }
  };
  this.sendData(data);
};


jstestdriver.CommandExecutor.prototype.findScriptTagsToRemove_ = function(dom, files) {
  var scripts = dom.getElementsByTagName('script');
  var filesSize = files.length;
  var scriptsSize = scripts.length;
  var scriptTagsToRemove = [];

  for (var i = 0; i < filesSize; i++) {
    var f = files[i];

    for (var j = 0; j < scriptsSize; j++) {
      var s = scripts[j];

      if (s.src.indexOf(f) != -1) {
        scriptTagsToRemove.push(s);
        break;
      }
    }
  }
  return scriptTagsToRemove;
};


jstestdriver.CommandExecutor.prototype.removeScriptTags_ = function(dom, scriptTagsToRemove) {
  var head = dom.getElementsByTagName('head')[0];
  var size = scriptTagsToRemove.length;

  for (var i = 0; i < size; i++) {
    var script = scriptTagsToRemove[i];

    head.removeChild(script);
  }
};


jstestdriver.CommandExecutor.prototype.removeScripts = function(dom, files) {
  this.removeScriptTags_(dom, this.findScriptTagsToRemove_(dom, files));
};


jstestdriver.CommandExecutor.prototype.loadTest = function(files) {
  this.removeScripts(document, files);
  var fileLoader = new jstestdriver.FileLoader(document);

  fileLoader.load(files, this.boundOnFileLoaded_);
};


jstestdriver.CommandExecutor.prototype.onFileLoaded = function(status) {
  var data = {
      done: '',
      response: {
        response: status,
        browser: {
          "id": this.__id,
          "name": jstestdriver.getBrowserFriendlyName(),
          "version": jstestdriver.getBrowserFriendlyVersion(),
          "os": navigator.platform
        }
      }
  };

  this.sendData(data);
};


jstestdriver.CommandExecutor.prototype.runAllTests = function(captureConsole) {
  this.runTestCases_(this.__testCaseManager.getTestCases(), captureConsole == "true" ? true :
    false);
};


jstestdriver.CommandExecutor.prototype.runTests = function(args) {
  var testCases = args[0];
  var captureConsole = args[1];

  this.runTestCases_(jsonParse('{"testCases":' + testCases + '}').testCases,
      captureConsole == "true" ? true : false);
};


jstestdriver.CommandExecutor.prototype.runTestCases_ = function(testCases, captureConsole) {
  this.startTestInterval_(jstestdriver.TIMEOUT);
  this.__testCaseManager.runTests(testCases, this.boundOnTestDone, this.boundOnComplete,
      captureConsole);  
};


jstestdriver.CommandExecutor.prototype.startTestInterval_ = function(interval) {
  this.timeout_ = setTimeout('jstestdriver.executor.boundSendTestResults()', interval);
};


jstestdriver.CommandExecutor.prototype.stopTestInterval_ = function() {
  clearTimeout(this.timeout_);
};


jstestdriver.CommandExecutor.prototype.onDataSent_ = function() {
  if (this.done_) {
    this.sendTestResultsOnComplete_();
  } else if (this.sentOn_ != -1) {
    var elapsed = new Date().getTime() - this.sentOn_;
    this.sentOn_ = -1;

    if (elapsed < jstestdriver.TIMEOUT) {
      this.startTestInterval_(jstestdriver.TIMEOUT - elapsed);
    } else {
      this.sendTestResults_();
    }
  }
};


jstestdriver.CommandExecutor.prototype.sendTestResults_ = function() {
  this.stopTestInterval_();
  if (this.testsDone_.length > 0) {
    var data = {
        response: {
          response: JSON.stringify(this.testsDone_),
          browser: {
            "id": this.__id,
            "name": jstestdriver.getBrowserFriendlyName(),
            "version": jstestdriver.getBrowserFriendlyVersion(),
            "os": navigator.platform
          }
        }
    };

    this.testsDone_ = [];
    this.sentOn_ = new Date().getTime();
    this.__sendRequest(this.__url, data, this.boundOnDataSent);
  }
};


jstestdriver.CommandExecutor.prototype.onTestDone_ = function(result) {
  this.testsDone_.push(result);
  if ((result.result == 'error' || result.log != '') && this.sentOn_ == -1) {
    this.sendTestResults_();
  }
};


jstestdriver.CommandExecutor.prototype.sendTestResultsOnComplete_ = function() {
  this.stopTestInterval_();
  this.done_ = false;
  this.sentOn_ = -1;
  var data = {
      done: '',
      response: {
          response: JSON.stringify(this.testsDone_),
          browser: {
            "id": this.__id,
            "name": jstestdriver.getBrowserFriendlyName(),
            "version": jstestdriver.getBrowserFriendlyVersion(),
            "os": navigator.platform
          }
      }
  };

  this.testsDone_ = [];
  this.__sendRequest(this.__url, data, this.__boundExecuteCommand);  
};

jstestdriver.CommandExecutor.prototype.onComplete_ = function(result) {
  if (result) {
    this.testsDone_.push(result);
  }
  this.done_ = true;
  if (this.sentOn_ == -1) {
    this.sendTestResultsOnComplete_();
  }
};


jstestdriver.CommandExecutor.prototype.evaluateCommand = function(cmd) {
  var res = '';

  try {
    var evaluatedCmd = eval('(' + cmd + ')');

    if (evaluatedCmd) {
      res = evaluatedCmd.toString();
    }
  } catch (e) {
    res = 'Exception ' + e.name + ': ' + e.message + '\n' + e.fileName + '(' + e.lineNumber +
        '):\n' + e.stack;
  }
  return res;
};


jstestdriver.CommandExecutor.prototype.reset = function() {
  if (window.location.href.search('\\?refresh') != -1) {
    window.location.reload();
  } else {
    window.location.replace(window.location.href + '?refresh');
  }
};


jstestdriver.CommandExecutor.prototype.registerCommand = function(name, func) {
  this[name] = jstestdriver.bind(this, func);
  this.sendData({
    response: {
      response: 'Command ' + name + ' registered.',
      browser: {
        "id": this.__id,
        "name": jstestdriver.getBrowserFriendlyName(),
        "version": jstestdriver.getBrowserFriendlyVersion(),
        "os": navigator.platform
      }
    }
  });
};


jstestdriver.CommandExecutor.prototype.listen = function() {
  if (window.location.href.search('\\?refresh') != -1) {
    var data = {
      done: '',
      response: {
        response: 'Runner reset.',
        browser: {
          "id": this.__id,
          "name": jstestdriver.getBrowserFriendlyName(),
          "version": jstestdriver.getBrowserFriendlyVersion(),
          "os": navigator.platform
        }
      }
    };
    this.__sendRequest(this.__url + '?start', data, this.__boundExecuteCommand);
  } else {
    this.__sendRequest(this.__url + '?start', null, this.__boundExecuteCommand);
  }
};
