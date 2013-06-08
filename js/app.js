function Observer(sender) {
    this._sender = sender;
    this._listeners = [];
}

Observer.prototype = {
    attach : function (listener) {
        this._listeners.push(listener);
    },
    notify : function (args) {
        var index;

        for (index = 0; index < this._listeners.length; index += 1) {
            this._listeners[index](this._sender, args);
        }
    }
};

// # Configuration class
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
  }

  // Loads settings entered by the user in the form.
  this.loadSettingsFromForm = function(inputNamesToValues) {
    for (var id in this.params) {
      var param = this.params[id];
      this[param] = inputNamesToValues[param];
    }
  }

  this.loadDefaultEpidemic = function() {
    this.loadPredefinedSettings(Object.keys(this.epidemics)[0]);
  }

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
    return paramsWithValues;
  }
};

// # PictureView class
// Shows map of Poland, gather mouse clicks.
function PictureView(_cols, _rows) {
  var colsCount = _cols;
  var rowsCount = _rows;
  var cellsCount = colsCount * rowsCount;
  var canvas = document.getElementById('picture');
  var ctx = canvas.getContext('2d');
  var canvasWidth = canvas.width;
  var canvasHeight = canvas.height;
  var sizeX = canvas.width/colsCount;
  var sizeY = canvas.height/rowsCount;

  // Returns info about the cell that is under the provided position on the page.
  this.getCellInfoByPosition = function(pageX, pageY) {
    var x = (pageX - canvas.offsetLeft);
    var y = (pageY - canvas.offsetTop);
    var col = Math.floor(x/sizeX);
    var row = Math.floor(y/sizeY);
    var index = col + row * colsCount;
    return {
      index: index,
      col: col,
      row: row
    };
  }

  // Updates the map based on the current cells state.
  this.updateWithNewData = function(cells) {
    for(i = 0; i < cellsCount; i++) {
      if (cells[i].populationLimit > 0) {
        var percentage = (cells[i].infectiousCount() + cells[i].incubatedCount()) / cells[i].populationCount();
        ctx.fillStyle = "rgba(255,0,0," + percentage + ")";

        // debug
        //if (cells[i].populationLimit > 0) {
          //ctx.fillStyle = "rgba(111, 111, 111, 0.4)";
        //}
        ctx.clearRect((i % colsCount) * sizeX, Math.floor(i / colsCount) *
                      sizeY, sizeX, sizeY);
        ctx.fillRect((i % colsCount) * sizeX, Math.floor(i / colsCount) *
                     sizeY, sizeX, sizeY);
      }
    }
  }
}

// # PlotView class
function PlotView() {
  var options = {
    series: { shadowSize: 0 }, // drawing is faster without shadows
    xaxis: { show: true }
  };
  this.historySusceptible = new Array();
  this.historyRecovered = new Array();
  this.historyIll = new Array();
  var plot = $.plot($("#plot"), [], options);

  // Adds new data to the plot and refresh it.
  this.updateWithNewData = function(susceptible, ill, recovered) {
    var count = this.historySusceptible.length;
    this.historySusceptible.push([count, susceptible]);
    this.historyRecovered.push([count, recovered]);
    this.historyIll.push([count, ill]);
    this.refresh();
  }

  this.refresh = function() {
    plot.setData([
      //{ label: "Recovered", color: "rgb(0, 185, 0)",
                 //data: this.historyRecovered },
      //{ label: "Susceptible", color: "rgb(0, 0, 0)",
                 //data: this.historySusceptible },
                 { label: "Incubated & Infectious",
                   color: "rgb(185, 0, 0)",
                   data: this.historyIll}]);
    plot.setupGrid();
    plot.draw();
  }

  this.exportHistory = function() {
    // TODO: move to epidemic object
    var result = "# day susceptible infected recovered population\n";
    for (var i=0; i < this.historySusceptible.length; i++) {
      var line = [(i + 1), this.historySusceptible[i][1], this.historyIll[i][1],
        this.historyRecovered[i][1], (this.historySusceptible[i][1] + this.historyIll[i][1] +
                                      this.historyRecovered[i][1])];
      result += line.join(" ") + "\n";
    }
    return result;
  };
}

// # Epidemic class
function Epidemic(_grid) {

  this.lastMouseOveredCell;
  this.lastMouseOveredIndex;
  this.automaticallyPaused = new Observer(this);
  this.dataChanged = new Observer(this);
  this.newDataForPlot = new Observer(this);

  this.run = function() {
    if (!running) {
      running = true
      this.nextStep();
    }
  }

  // Generates next step of the simulation.
  this.nextStep = function() {
    this.oldInfectedCount = grid.incubatedOverallCount + grid.infectiousOverallCount;
    worker.postMessage({'cmd': 'nextStep', 'config': config.serialize()});
  }

  this.deserializeGrid = function(newSerializedGrid) {
    grid.unserialize(newSerializedGrid);
    grid.updateOverallCount();
  }

  this.workerCompletedStep = function(newSerializedGrid) {
    this.deserializeGrid(newSerializedGrid);
    this.newDataForPlot.notify();
    this.iterationNumber++;
    var newInfectedCount = grid.incubatedOverallCount + grid.infectiousOverallCount;
    if (this.oldInfectedCount > 0 && newInfectedCount == 0) {
      this.pause();
      this.automaticallyPaused.notify();
    }
    this.dataChanged.notify();
    if (running) {
      this.nextStep();
    }
  }

  this.pause = function() {
    if (running) {
      running = false;
    }
  };

  this.advanceByOneStep = function() {
    if (!running) {
      this.nextStep();
    }
  };

  this.infectiousUpdate = function(cellId, value) {
    worker.postMessage({'cmd': 'addIncubatedToCell', 'cellId': cellId, 'value': value,
                       'config': config.serialize()});
  }

  this.restart = function() {
    this.initWorker();
    this.iterationNumber = 0;
    this.dataChanged.notify();
  }

  this.exportCellsState = function() {
    return grid.exportCurrentState();
  };

  this.isRunning = function() {
    return running;
  }

  this.randomlyAddIll = function() {
    worker.postMessage({'cmd': 'randomlyAddIll', 'config': config.serialize()});
  }

  this.initWorker = function() {
    worker.postMessage({'cmd': 'init', 'config': config.serialize()});
  }

  // constructor
  var grid = _grid;
  this.iterationNumber = 0;
  running = false;

  var that = this;
  var worker = new Worker("./js/worker.js");
  worker.addEventListener('message', function(e) {
    if (typeof e.data == "object") {
      switch (e.data.cmd) {
        case 'gridData':
          that.workerCompletedStep(e.data.grid);
          break;
        case 'incubatedAddedToCell':
        case 'workerInitialized':
        case 'addedRandomlyPlacedIll':
          that.deserializeGrid(e.data.grid);
          that.dataChanged.notify();
          break;
        default:
          debug("unknown command from worker");
      };
    } else {
      debug(e.data);
    }
  }, false);
  this.initWorker();
}

$(document).ready(function(){
  config.loadDefaultEpidemic();
  grid = new Grid();

  var epidemic = new Epidemic(grid);

  var controller = {
    epidemic: epidemic,
    startButton: $("#start"),
    pauseButton: $("#pause"),
    oneStepButton: $("#oneStep"),
    restartButton: $("#restart"),
    cellGettingNewInfectionsIndex: null,
    picture: null,
    plot: null,
    init: function() {
      var that = this;
      this.picture = new PictureView(grid.colsCount, grid.rowsCount);
      this.setupPlot();
      this.startButton.click(function(event) {
        event.preventDefault();
        epidemic.run();
        that.updateUI();
      });
      this.pauseButton.click(function(event) {
        event.preventDefault();
        epidemic.pause();
        that.updateUI();
      });
      this.oneStepButton.click(function(event) {
        event.preventDefault();
        that.epidemic.advanceByOneStep();
        that.updateUI();
      });
      this.restartButton.click(function(event) {
        event.preventDefault();
        that.restartSimulation();
        that.showAlert("Simulation has been restarted.");
      });
      $(document).keypress(function(event) {
        switch(event.which) {
          case 115: that.epidemic.run();
          break;
          case 112: that.epidemic.pause();
          break;
          case 110: that.epidemic.advanceByOneStep();
          break;
          case 114: that.restartSimulation();
          break;
        }
        that.updateUI();
      });

      // TODO: move this block to PictureView class
      $("#picture").mousemove(function(event) {
        that.showCellInfo(event);
      }).mouseleave(function() {
        $("#cellInfo").hide();
      }).mouseenter(function() {
        $("#cellInfo").show();
      });
      $("#picture").click(function(event) {
        var cellInfo = that.picture.getCellInfoByPosition(event.pageX, event.pageY);
        var cell = grid.cells[cellInfo.index];
        that.cellGettingNewInfectionsIndex = cellInfo.index;
        if (cell.populationLimit > 0) {
          $div = $("#cellAddIllForm");
          $div.show();
          $div.css("left", event.pageX);
          $div.css("top", event.pageY);
          $input = $("#illCount");
          $input.attr("min", 0);
          $input.attr("max", cell.susceptibleCount());
        }
      });
      $("#illCount").change(function() {
        $("#illSelectedCount").text($(this).val());
      });
      $("#illSubmit").click(function(event) {
        $("#cellAddIllForm").hide();
        that.epidemic.infectiousUpdate(that.cellGettingNewInfectionsIndex, parseInt($("#illCount").val(), 10));
        $("#illCount").attr("value", 0);
        $("#illSelectedCount").text(0);
        that.updateUI();
      });

      $("#randomlyAddIll").click(function(event) {
        epidemic.randomlyAddIll();
        that.showAlert("Randomly infected " + config.startingIllCount + " people.");
        that.updateUI();
      });

      $("#exportPlotData").click(function(event) {
        var blob = new Blob([that.plot.exportHistory()], {type: "text/plain;charset=utf-8"});
        var fileName = "epi_hist_beta=" + config.contactInfectionRate + "_v=" + config.varCoeff +
          "_fun=" + config.infectionFunction + "_st=" + config.startingIllCount;
        saveAs(blob, fileName + ".dat");
      });
      $("#exportCellsData").click(function(event) {
        var blob = new Blob([epidemic.exportCellsState ()], {type: "text/plain;charset=utf-8"});
        var fileName = "epi_cells_beta=" + config.contactInfectionRate + "_v=" + config.varCoeff +
          "_fun=" + config.infectionFunction + "_st=" + config.startingIllCount + "_t=" +
          epidemic.iterationNumber;
        saveAs(blob, fileName + ".dat");
      });

      // configuration
      $("input:radio[name=providedEpidemics]").live("change", function(event) {
        event.preventDefault();
        config.loadPredefinedSettings($(this).val());
        that.showAlert("Settings for " + $(this).next().text() + " epidemic have been loaded.");
      });
      $("#configuration input, #configuration select").change(function(event) {
        that.configurationFormUpdated();
      });
      $("#configuration").submit(function(event) {
        event.preventDefault();
        that.configurationFormUpdated();
      });
      // restart after changing lenghts of infection - it must perform after configuration update
      $("#incubatedDays, #infectiousDays").change(function() {
        that.restartSimulation();
      });

      this.setupDefaultEpidemics();
      this.setObservers();
      this.updateUI();
      config.settingsChanged.notify(); // push config values into form, because config
      //had to be loaded before controller
    },
    restartSimulation: function() {
      this.epidemic.restart();
      this.setupPlot();
      this.updateUI();
      this.showAlert("Simulation has been restarted.");
    },
    configurationFormUpdated: function() {
      var inputNamesToValues = {};
      $("#configuration input, #configuration select").each(function(index, item) {
        inputNamesToValues[$(item).attr("id")] = parseFloat($(item).val());
      });
      config.loadSettingsFromForm(inputNamesToValues);

      $("input:radio[name=providedEpidemics]").prop('checked', false);
      this.showAlert("Settings have been saved.");
      this.updateUI();
    },
    setupDefaultEpidemics: function() {
      var epidemicsHtml = "";
      var first = true;
      for (var key in config.epidemics) {
        epidemicsHtml += '<label class="radio inline"><input type="radio" name="providedEpidemics" value="'+
          key + '"' + (first ? 'checked' : '') + '><span>' + key + '</span></label>';
        first = false;
      }
      $("#defaultEpidemics").html(epidemicsHtml);
    },
    setupPlot: function() {
      this.plot = new PlotView();
      this.plot.refresh();
    },
    showCellInfo: function(event) {
      var cellInfo = this.picture.getCellInfoByPosition(event.pageX, event.pageY);
      var cell = grid.cells[cellInfo.index];
      this.lastMouseOveredCell = cell;
      this.lastMouseOveredIndex = cellInfo.index;
      this.updateCellInfo(event.pageX, event.pageY + 15);
    },
    updateCellInfo: function(posX, posY) {
      if (this.lastMouseOveredCell) {
        var cell = this.lastMouseOveredCell;
        var $cellInfo = $("#cellInfo");
        if (typeof posX !== 'undefined' && typeof posY !== 'undefined') {
          $cellInfo.css("left", posX);
          $cellInfo.css("top", posY);
        }
        $cellInfo.html("index: " + this.lastMouseOveredIndex +
                       "<br>population: " + cell.populationCount() +
                       "<br>susceptible: " + cell.susceptibleCount() + 
                       "<br>incubated: " +
                       cell.incubatedCount() + "<br>infectious: " + cell.infectiousCount() +
                       "<br>recovered: " + cell.recoveredCount());
        if (cell.populationLimit === 0) {
          $cellInfo.hide();
        } else {
          $cellInfo.show();
        }
      }
    },
    showAlert: function(msg) {
      $("#alertText").html(msg);
      $(".alert").show();
      setTimeout(function () {
        $(".alert").hide();
      }, 4000);
    },
    setObservers: function() {
      var that = this;
      this.epidemic.automaticallyPaused.attach(function () {
        that.updateUI();
        that.showAlert("Simulation has been automatically paused because epidemic spread finished");
      });
      this.epidemic.dataChanged.attach(function () {
        that.updateUI();
        that.picture.updateWithNewData(grid.cells);
      });
      this.epidemic.newDataForPlot.attach(function() {
        that.plot.updateWithNewData(grid.susceptibleOverallCount, grid.incubatedOverallCount +
                           grid.infectiousOverallCount, grid.recoveredOverallCount);
      });
      config.settingsChanged.attach(function () {
        for (var id in config.params) {
          var param = config.params[id];
          $("#" + param).val(config[param]);
        }
      });
    },
    updateUI: function() {
      if (!this.epidemic.isRunning()) {
        this.startButton.removeAttr("disabled");
        this.oneStepButton.removeAttr("disabled");
        this.pauseButton.attr("disabled", "disabled");
      } else {
        this.startButton.attr("disabled", "disabled");
        this.oneStepButton.attr("disabled", "disabled");
        this.pauseButton.removeAttr("disabled");
      }
      $("#randomlyAddIll").text("Distribute randomly " + config.startingIllCount + " ill");
      var pop = grid.populationOverallCount;
      var inc = grid.incubatedOverallCount;
      var inf = grid.infectiousOverallCount;
      var rec = grid.recoveredOverallCount;
      $("#iterationInfo tr:eq(0) td:eq(1)").html(this.epidemic.iterationNumber);
      $("#iterationInfo tr:eq(1) td:eq(1)").html(numberWithThousandsFormatted(pop));
      $("#iterationInfo tr:eq(2) td:eq(1)").html(numberWithThousandsFormatted(inc));
      $("#iterationInfo tr:eq(3) td:eq(1)").html(numberWithThousandsFormatted(inf));
      $("#iterationInfo tr:eq(4) td:eq(1)").html(numberWithThousandsFormatted(rec));
      this.updateCellInfo(null, null); // nulls keep cell at the same position
    },
  };

  controller.init();
});

