"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GenericDatasource = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GenericDatasource = exports.GenericDatasource = function () {
  function GenericDatasource(instanceSettings, $q, backendSrv, templateSrv) {
    _classCallCheck(this, GenericDatasource);

    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;

    this.credentials = {
      username: instanceSettings.jsonData.username,
      password: instanceSettings.jsonData.password,
      apiKey: instanceSettings.jsonData.apiKey
    };
  }

  _createClass(GenericDatasource, [{
    key: "query",
    value: function query(options) {
      var _this = this;

      return this.buildQueryParameters(options).then(function (query) {
        query.targets = query.targets.filter(function (t) {
          return !t.hide;
        });
        var from = options.range.from.clone();
        var to = options.range.to.clone();
        return _this.retrieveStats(query.targets, from.unix(), to.unix());
      });
    }
  }, {
    key: "retrieveStats",
    value: function retrieveStats(targets, from, to) {
      var _this2 = this;

      var targets_promises = [];

      targets.forEach(function (targetValue, targetIndex, targetArray) {
        var params = "includeuptime=true&from=" + from + "&to=" + to;
        var promise = _this2.callApi("/summary.average/" + targetValue.checkID + "?" + params, "GET").then(function (response) {
          var results = {
            "data": []
          };

          var totalup = response.data.summary.status.totalup;
          var totaldown = response.data.summary.status.totaldown;

          return { "target": targetValue.checkName, "datapoints": [[totalup / (totalup + totaldown) * 100, to]] };
        });
        targets_promises.push(promise);
      });

      return Promise.all(targets_promises).then(function (targets) {
        console.log(targets);
        return {
          "data": targets
        };
      });
    }
  }, {
    key: "getCheckDetails",
    value: function getCheckDetails(checkID) {
      return this.callApi("/checks/" + checkID, "GET").then(function (response) {
        return response.data.description;
      });
    }
  }, {
    key: "callApi",
    value: function callApi(endpoint, method) {
      var body = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";

      return this.backendSrv.datasourceRequest({
        url: this.url + endpoint,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'App-Key': this.credentials.apiKey,
          'Authorization': 'Basic ' + btoa(this.credentials.username + ':' + this.credentials.password)
        }
      }).then(function (response) {
        return response;
      });
    }
  }, {
    key: "testDatasource",
    value: function testDatasource() {
      return this.callApi("/checks", "GET").then(function (response) {
        return { status: "success", message: "Data source is working", title: "Success" };
      }).catch(function (e) {
        console.log(e);
        return { status: "error", message: e.status + " " + e.statusText + " - " + e.data.message, title: "Error" };
      });
    }
  }, {
    key: "buildTargetsList",
    value: function buildTargetsList(rawTargets) {
      return this.q(function (resolve, reject) {
        var _this3 = this;

        var promises = [];
        var targets = [];
        rawTargets.forEach(function (target, index, array) {
          switch (target.filterType) {
            case 'Check ID':
              targets.push({
                target: target.filterValue,
                refId: target.refId,
                hide: target.hide,
                type: target.type || 'timeserie',
                checkID: target.filterValue,
                checkName: ""
              });
            case 'Tag':
              var promise = _this3.callApi("/checks?tags=" + target.filterValue, "GET").then(function (response) {
                response.data.checks.forEach(function (value, index, array) {
                  targets.push({
                    target: value.id,
                    refId: target.refId,
                    hide: target.hide,
                    type: target.type || 'timeserie',
                    checkID: value.id,
                    checkName: value.name
                  });
                });
              });
              promises.push(promise);
          }
          resolve(Promise.all(promises).then(function () {
            return targets;
          }));
        });
      }.bind(this));
    }
  }, {
    key: "buildQueryParameters",
    value: function buildQueryParameters(options) {
      var _this4 = this;

      //remove placeholder targets
      options.targets = _lodash2.default.filter(options.targets, function (target) {
        return target.filterValue !== undefined;
      });

      var promises = [];
      return this.buildTargetsList(options.targets).then(function (result) {
        result.forEach(function (value, index, array) {
          var promise = _this4.getCheckDetails(value.checkID).then(function (name) {
            var target = value;
            target.name = name;
            target.legendFormat = name;
            return target;
          });
          promises.push(promise);
        });

        return Promise.all(promises).then(function (targets) {
          options.targets = targets;
          return options;
        });
      });
    }
  }]);

  return GenericDatasource;
}();
//# sourceMappingURL=datasource.js.map
