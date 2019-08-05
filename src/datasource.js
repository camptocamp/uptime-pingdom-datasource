import _ from "lodash";

export class GenericDatasource {

  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;

    this.credentials = {
      username: instanceSettings.jsonData.username,
      password: instanceSettings.jsonData.password,
      apiKey: instanceSettings.jsonData.apiKey,
    };

  }

  query(options) {
    return this.buildQueryParameters(options).then(query => {
      query.targets = query.targets.filter(t => !t.hide);
      let from = options.range.from.clone();
      let to = options.range.to.clone();
      return this.retrieveStats(query.targets, from.unix(), to.unix());
    });
  }

  retrieveStats(targets, from, to) {
    var targets_promises = [];

    targets.forEach((targetValue, targetIndex, targetArray) => {
      let params = "includeuptime=true&from="+from+"&to="+to;
      const promise = this.callApi("/summary.average/" + targetValue.checkID + "?" + params, "GET")
        .then(response => {
          let results = {
            "data": []
          };

          let totalup = response.data.summary.status.totalup;
          let totaldown = response.data.summary.status.totaldown;

          return { "target": targetValue.checkName, "datapoints": [[ totalup/(totalup + totaldown)*100, to ]] }
        });
      targets_promises.push(promise);
    });

    return Promise.all(targets_promises).then(targets => {
      return {
        "data": targets,
      };
    });
  }

  getCheckDetails(checkID) {
    return this.callApi("/checks/" + checkID, "GET")
    .then(response => {
      return response.data.description;
    });
  }

  callApi(endpoint, method, body = "") {
    return this.backendSrv.datasourceRequest({
      url: this.url + endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'App-Key': this.credentials.apiKey,
        'Authorization': 'Basic ' + btoa(this.credentials.username + ':' + this.credentials.password),
      },
    })
    .then(response => {
      return response;
   });
  }

  testDatasource() {
    return this.callApi("/checks", "GET")
      .then(response => {
        return { status: "success", message: "Data source is working", title: "Success" };
      })
      .catch(e => {
        console.log(e);
        return { status: "error", message: e.status + " " + e.statusText + " - " + e.data.message, title: "Error" };
     });
  }

  buildTargetsList(rawTargets) {
    return this.q(function(resolve, reject) {
      var promises = [];
      var targets = [];
      rawTargets.forEach((target, index, array) => {
        switch(target.filterType) {
          case 'Check ID':
            targets.push({
              target: target.filterValue,
              refId: target.refId,
              hide: target.hide,
              type: target.type || 'timeserie',
              checkID: target.filterValue,
              checkName: "",
            });
          case 'Tag':
            const promise = this.callApi("/checks?tags="+target.filterValue, "GET").then(response=> {
              response.data.checks.forEach((value, index, array) => {
              targets.push({
                  target: value.id,
                  refId: target.refId,
                  hide: target.hide,
                  type: target.type || 'timeserie',
                  checkID: value.id,
                  checkName: value.name,
                });
              });
            });
            promises.push(promise);
        }
        resolve(Promise.all(promises).then(function(){
          return targets;
        }));
      });
    }.bind(this));
  }

  buildQueryParameters(options) {
    //remove placeholder targets
    options.targets = _.filter(options.targets, target => {
      return target.filterValue !== undefined;
    });

    var promises = [];
    return this.buildTargetsList(options.targets).then(result => {
      result.forEach((value, index, array) => {
        const promise = this.getCheckDetails(value.checkID).then(name => {
          var target = value
          target.name = name
          target.legendFormat = name
          return target;
        });
        promises.push(promise);
      });

      return Promise.all(promises).then(targets => {
        options.targets = targets; 
        return options;
      });
    });
  }
}
