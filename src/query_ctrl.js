import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!'

export class GenericDatasourceQueryCtrl extends QueryCtrl {
  constructor($scope, $injector) {
    super($scope, $injector);

    this.scope = $scope;
    this.filterTypes = ['Check ID', 'Tag'];

    this.target.target = this.target.target;
    this.target.filterType = this.target.filterType;
    this.target.filterValue = this.target.filterValue;
    this.target.type = this.target.type || 'timeserie';
  }

  getOptions(query) {
    return this.datasource.metricFindQuery(query || '');
  }

  toggleEditorMode() {
    this.target.rawQuery = !this.target.rawQuery;
  }

  onChangeInternal() {
    this.panelCtrl.refresh();
  }
}

GenericDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';
