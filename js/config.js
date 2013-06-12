var config = new function() {

  this.params = ["immigrationRate", "illImmigrationRate", "birthRate", "naturalDeathRate",
    "virusMorbidity", "contactInfectionRate", "bigCityRate", "varCoeff", "startingIllCount",
    "startingIllPerCell", "incubatedDays", "infectiousDays", "infectionFunction"];

  this.settingsChanged = new Observer(this);

  this.epidemics = {};
  this.epidemics['influenza-inf0.5var0.3'] = [0.05, 0.03, 0.0001, 0.0001, 0.004, 0.5, 0.4, 0.3, 300, 20,
    2, 4, 0];
  this.epidemics['influenza-inf0.5var0.5'] = [0.05, 0.03, 0.0001, 0.0001, 0.004, 0.5, 0.4, 0.5, 300, 20,
    2, 4, 0];
  this.epidemics['influenza-inf0.4var0.3'] = [0.05, 0.03, 0.0001, 0.0001, 0.004, 0.4, 0.4, 0.3, 300, 20,
    2, 4, 0];
  this.epidemics['influenza-inf0.4var0.5'] = [0.05, 0.03, 0.0001, 0.0001, 0.004, 0.4, 0.4, 0.5, 300, 20,
    2, 4, 0];

  // Generate getters and setters
  for(id in this.params) {
    var param = this.params[id];
    this[param] = function() {
      return this[param];
    };
    // Create a setter that checks whether 'val' is in the interval [0,1]
    this[param] = function(val) {
      this[param] = val;
    };
  }

  // Loads predefined (provided by authors) settings for few diseases.
  this.loadPredefinedSettings = function(epidemic_key) {
    for(var id in this.params) {
      var param = this.params[id];
      this[param] = this.epidemics[epidemic_key][id];
    }
    this.settingsChanged.notify();
  };

  // Loads settings entered by the user in the form.
  this.loadSettingsFromForm = function(inputNamesToValues) {
    for (var id in this.params) {
      var param = this.params[id];
      this[param] = inputNamesToValues[param];
    }
  };

  this.loadDefaultEpidemic = function() {
    this.loadPredefinedSettings(Object.keys(this.epidemics)[0]);
  };

  // static config
  this.__defineGetter__("recoveredIndex", function(){
    return 1 + this.incubatedDays + this.infectiousDays;
  });
  this.__defineGetter__("incubatedIndex", function(){
    return 1;
  });
  this.__defineGetter__("infectiousIndex", function(){
    return this.incubatedIndex + this.incubatedDays;
  });
  this.__defineGetter__("statesCountLength", function(){
    return 2 + this.incubatedDays + this.infectiousDays;
  });
  this.__defineGetter__("commutingCityTreshold", function(){
    return 80000;
  });
  this.__defineGetter__("minPopulationForRandomIll", function(){
    return 50000;
  });

  this.serialize = function() {
    var paramsWithValues = {};
    for(var i in this.params) {
      var paramName = this.params[i];
      paramsWithValues[paramName] = this[paramName];
    }
    paramsWithValues["recoveredIndex"] = this.recoveredIndex;
    paramsWithValues["incubatedIndex"] = this.incubatedIndex;
    paramsWithValues["infectiousIndex"] = this.infectiousIndex;
    paramsWithValues["statesCountLength"] = this.statesCountLength;
    paramsWithValues["commutingCityTreshold"] = this.commutingCityTreshold;
    paramsWithValues["minPopulationForRandomIll"] = this.minPopulationForRandomIll;
    return paramsWithValues;
  };

  this.textForHistoryFileName = function() {
    return "epi_hist_beta=" + this.contactInfectionRate + "_v=" + this.varCoeff +
      "_fun=" + this.infectionFunction + "_st=" + this.startingIllCount;
  };

  this.textForCellsStateFileName = function() {
    return "epi_cells_beta=" + this.contactInfectionRate + "_v=" + this.varCoeff +
      "_fun=" + this.infectionFunction + "_st=" + this.startingIllCount + "_t=";
  };
};

