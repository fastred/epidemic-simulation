// Shuffles array
function shuffle(array) {
    var tmp, current, top = array.length;
    if(top) while(--top) {
      current = Math.floor(Math.random() * (top + 1));
      tmp = array[current];
      array[current] = array[top];
      array[top] = tmp;
    }
    return array;
}

function makeArrayOf(value, length) {
  var arr = [], i = length;
  while (i--) {
    arr[i] = value;
  }
  return arr;
}

function supports_html5_storage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}

function showAlert(msg) {
  $("#alertText").html(msg);
  $(".alert").show();
  setTimeout(function () {
    $(".alert").hide();
  }, 2000);
}


// Global config

var incubatedDays = 2;
var infectedDays = 4;
var recoveredIndex = 1 + incubatedDays + infectedDays;
var incubatedIndex = 1;
var infectedIndex = incubatedIndex + incubatedDays;
var statesCountLength = 2 + incubatedDays + infectedDays;
var newIncubatedDefaultPercentage = 0.05;
var averagePopulationCount = 26000;

//# Cell class
// This class represents one cell in the grid.
function Cell(_populationCount, _populationLimit) {
  // [0] is susceptible
  // [1..2] is incubated
  // [3..6] is infected
  // [7] is recovered
  this.statesCount = makeArrayOf(0, statesCountLength);
  this.statesCount[0] = _populationCount;
  this.populationLimit = _populationLimit;

  // Simulates natural deaths with given probability.
  this.simNaturalDeaths = function(prob) {
    for (var i = 0; i < statesCountLength; i++ ) {
      var diedToday = Math.round(this.statesCount[i] * prob);
      this.statesCount[i] -= diedToday;
    }
  }

  // Simulates deaths caused by the virus (with given probability).
  this.simVirusMorbidity= function(prob) {
    for (var i = incubatedIndex; i < infectedIndex + infectedDays; i++ ) {
      var diedToday = Math.round(this.statesCount[i] * prob);
      this.statesCount[i] -= diedToday;
    }
  }

  // Simulates new births with given probability.
  this.simBirths = function(prob) {
    for (var i = 0; i < statesCountLength; i++ ) {
      var newborns = Math.round(this.statesCount[i] * prob);
      this.statesCount[i] += newborns;
    }
  }

  // Simulates new infections (with given probability).
  this.simInfections = function(index, prob, immigrants) {
    if (this.populationCount() > 0) {
      var immigrantsSusceptible = 0;
      var immigrantsIncubated = 0;
      var immigrantsInfected = 0;
      var immigrantsRecovered = 0;
      var immigrantsPopulation = 0;
      // immigrant counts (coming from different neighbours)
      for (var i in immigrants) {
        immigrantsSusceptible += immigrants[i].susceptibleCount();
        immigrantsIncubated += immigrants[i].incubatedCount();
        immigrantsInfected += immigrants[i].infectedCount();
        immigrantsRecovered += immigrants[i].recoveredCount();
      }
      immigrantsPopulation += immigrantsSusceptible + immigrantsIncubated +
        immigrantsInfected + immigrantsRecovered;
      // probability of infection, uses local and immigrant population data
      var infectionProb = 1 - Math.exp(-prob * (this.infectedCount() + immigrantsInfected) /
        (this.populationCount() + immigrantsPopulation));

      // move people between states in the backward order
      for (var i = this.statesCount.length - 2; i >= 0; i--) {
        if (i === 0) {
          var infectedTodayInCell = Math.round(this.susceptibleCount() * infectionProb);
          this.statesCount[i + 1] += infectedTodayInCell;
          this.statesCount[i] -= infectedTodayInCell;
          // debug
          //if (index == 993) {
            //console.log("infectedtoday: " + infectedTodayInCell + "\nimmigrantsinfected " +
                        //immigrantsInfected + "\nthisinfected: " + this.infectedCount() +
                       //"\nimmigrantpopulation: " + immigrantsPopulation +
                       //"\nthispopulation: " + this.populationCount());
            //console.log(immigrants);
          //}
        } else {
          this.statesCount[i + 1] += this.statesCount[i];
          this.statesCount[i] = 0;
        }
        // advance state of immigrants, because they will get back to their cells
        // after infections are simulated
        for (var j in immigrants) {
          if (i === 0) {
            var infectedTodayImmigrantCell = Math.round(immigrants[j].susceptibleCount() *
                                                        infectionProb);
            immigrants[j].statesCount[i + 1] += infectedTodayImmigrantCell;
            immigrants[j].statesCount[i] -= infectedTodayImmigrantCell;
          } else {
            immigrants[j].statesCount[i + 1] += immigrants[j].statesCount[i];
            immigrants[j].statesCount[i] = 0;
          }
        }
      }
    }
  };

  this.susceptibleCount = function() {
    return this.statesCount[0];
  };

  this.setSusceptibleCount = function(value) {
    this.statesCount[0] = value;
  };

  this.recoveredCount = function() {
    return this.statesCount[recoveredIndex];
  };

  this.incubatedCount = function() {
    return _.reduce(this.statesCount.slice(incubatedIndex, incubatedIndex + incubatedDays),
                    function(memo, num) {
                      return memo + num;
                    }, 0);
  };

  this.infectedCount = function() {
    return _.reduce(this.statesCount.slice(infectedIndex, infectedIndex + infectedDays),
                    function(memo, num) {
                      return memo + num;
                    }, 0);
  };

  this.populationCount = function() {
    return _.reduce(this.statesCount,
                    function(memo, num) {
                      return memo + num;
                    }, 0);
  };

  this.addNewIncubated = function(percentage) {
    var infected = Math.round(this.statesCount[0] * percentage);
    this.statesCount[0] -= infected;
    this.statesCount[1] += infected;
  };
}

// # Grid class
// It represents grid of cells.
function Grid() {
  var rowsCount = 40;
  var colsCount = rowsCount;
  var cellsCount = rowsCount * colsCount;
  var cells = new Array(cellsCount);
  var populationOverallCount = 0;
  var incubatedOverallCount = 0;
  var infectedOverallCount = 0;
  var recoveredOverallCount = 0;
  var susceptibleOverallCount = 0;

  this.__defineGetter__("rowsCount", function(){
    return rowsCount;
  });
  this.__defineGetter__("colsCount", function(){
    return colsCount;
  });
  this.__defineGetter__("cells", function(){
    return cells;
  });
  this.__defineGetter__("populationOverallCount", function(){
    return populationOverallCount;
  });
  this.__defineGetter__("infectedOverallCount", function(){
    return infectedOverallCount;
  });
  this.__defineGetter__("incubatedOverallCount", function(){
    return incubatedOverallCount;
  });
  this.__defineGetter__("recoveredOverallCount", function(){
    return recoveredOverallCount;
  });
  this.__defineGetter__("susceptibleOverallCount", function(){
    return susceptibleOverallCount;
  });

  // Updates counts of total population and infected people.
  this.updateOverallCount = function() {
    populationOverallCount = _.reduce(cells, function(memo, cell) {
      return memo + cell.populationCount();
    }, 0);
    infectedOverallCount = _.reduce(cells, function(memo, cell) {
      return memo + cell.infectedCount();
    }, 0);
    incubatedOverallCount = _.reduce(cells, function(memo, cell) {
      return memo + cell.incubatedCount();
    }, 0);
    recoveredOverallCount = _.reduce(cells, function(memo, cell) {
      return memo + cell.recoveredCount();
    }, 0);
    susceptibleOverallCount = _.reduce(cells, function(memo, cell) {
      return memo + cell.susceptibleCount();
    }, 0);
  };

  // Returns indices of neighbouring cells.
  this.getNeighbours = function(index) {
    var neighbours = [];
    var possibleUp, possibleDown, possibleLeft, possibleRight;
    if (index / colsCount >= 1) {
      neighbours.push(index - colsCount); // up
      possibleUp = true;
    }
    if (index % colsCount != colsCount - 1) {
      neighbours.push(index + 1); // right
      possibleRight = true;
    }
    if (Math.floor(index / rowsCount) < rowsCount - 1) {
      neighbours.push(index + colsCount); // down
      possibleDown = true;
    }
    if (index % colsCount != 0) {
      neighbours.push(index - 1); //left
      possibleLeft = true;
    }
    // Moore neighbourhood
    if (possibleUp && possibleRight) {
      neighbours.push(index - colsCount + 1);
    }
    if (possibleUp && possibleLeft) {
      neighbours.push(index - colsCount - 1);
    }
    if (possibleDown && possibleRight) {
      neighbours.push(index + colsCount + 1);
    }
    if (possibleDown && possibleLeft) {
      neighbours.push(index + colsCount - 1);
    }

    return neighbours;
  };

  // breadth-first search of closest city
  this.findClosestBigCity = function() {
    var resultJsonText = "{";
    for (var i = 0; i < cells.length; i++) {
      if (cells[i].populationLimit > 0) {
        var queue = [];
        var queuedIndices = {};
        queuedIndices[i] = true;
        queue.push({ind: i, dist: 0});
        var cityFound = false;
        while (!cityFound) {
          var obj = queue.shift();
          var index = obj.ind;
          var distance = obj.dist;
          if (cells[index].populationCount() > averagePopulationCount && index != i) {
            cityFound = true;
            resultJsonText += i + ": {ind: " + index + ", dist: " + distance + "},\n";
          }
          var neighbours = this.getNeighbours(index);
          for (var j = 0; j < neighbours.length; j++) {
            if (!(neighbours[j] in queuedIndices) && cells[neighbours[j]].populationLimit > 0) {
              queue.push({ind: neighbours[j], dist: distance + 1});
              queuedIndices[neighbours[j]] = true;
            }
          }
        }
      }
    }
    resultJsonText += "}";
    console.log(resultJsonText);
  };


  // Simulates immigrations.
  // Algorithm:
  //
  // 1. Select random cell
  // 2. Get its neighbours and optionally large city in the vicinity
  // 3. Use Immigration rate, Ill Immigration rate & Big cities immigration percentage
  // to calculate the number of people that emigrate (to work/school) to neighbouring
  // cells
  // 4. Use additional datastructures to keep track of counts of people moving from
  // one cell to another. It's mandatory, because in simReturningImmigrations people
  // come back home.
  this.simImmigrations = function(config) {
    for(var i = 0; i < cells.length; i++) {
      var currCell = cells[i];
      if (currCell.populationLimit > 0) {
        var neighbours = this.getNeighbours(i);
        var closeCityObj = closestCity[i];
        var closeCityExists = false;
        if (currCell.populationCount() <= averagePopulationCount &&
            closeCityObj.dist >= 2 && closeCityObj <= 4) {
          neighbours.push(closeCityObj.ind);
          closeCityExists = true;
        }

        for(var j = 0; j < neighbours.length; j++) {
          var neighCell = cells[neighbours[j]];
          if (neighCell.populationLimit > 0) {
            if (!this.immigrants[neighbours[j]][i]) {
              this.immigrants[neighbours[j]][i] = new Cell(null, null);
            }
            for (var k = 0; k < statesCountLength; k++ ) {
              var immigrationRate = k > 0 && k < statesCountLength - 1 ? config.illImmigrationRate :
                config.immigrationRate;
              var toMove = Math.round(currCell.statesCount[k] * immigrationRate);
              if (closeCityExists) {
                if (neighbours[j] == closeCityObj.ind) {
                  toMove *= config.bigCityRate;
                } else {
                  // uniformly distribute among neighbouring cells
                  toMove *= (1 - config.bigCityRate) / (neighbours.length - 1);
                }
              } else {
                toMove /= neighbours.length;
              }
              toMove = Math.round(toMove);
              this.immigrants[neighbours[j]][i].statesCount[k] += toMove;
              currCell.statesCount[k] -= toMove;
            }
          }
        }
      }
    }
  };

  this.simReturningImmigrations = function(config) {
    for(var i = 0; i < cells.length; i++) {
      var currCell = cells[i];
      if (currCell.populationLimit > 0) {
        for(var key in this.immigrants[i]) {
          var neighCell = cells[key];
          if (neighCell.populationLimit > 0) {
            for (var k = 0; k < statesCountLength; k++ ) {
              // move people back from immigration to their origin cell
              neighCell.statesCount[k] += this.immigrants[i][key].statesCount[k];
              this.immigrants[i][key].statesCount[k] = 0;
            }
          }
        }
      }
    }
  };

  // Performs next step in the simulation.
  this.next = function(config) {
    this.simImmigrations(config);
    // Simulates natural deaths, deaths caused by the virus and new births.
    for(var i = 0; i < cellsCount; i++) {
      var currCell = cells[i];
      currCell.simNaturalDeaths(config.naturalDeathRate);
      currCell.simVirusMorbidity(config.virusMorbidity);
      currCell.simBirths(config.birthRate);
    }
    // Simulates infections and recoveries
    for(i = 0; i < cellsCount; i++) {
      var currCell = cells[i];
      currCell.simInfections(i, config.contactInfectionRate, this.immigrants[i]);
    }
    this.simReturningImmigrations(config);
    config.updateRecoveryRate();
    this.updateOverallCount();
  }

  this.setAsInfected = function(index) {
    cells[index].addNewIncubated(newIncubatedDefaultPercentage);
    this.updateOverallCount();
  }

  this.loadState = function(loaded) {
    for(var i = 0; i < cellsCount; i++) {
      cells[i].populationCount = loaded[i].populationCount;
      cells[i].infectedCount = loaded[i].infectedCount;
      cells[i].populationLimit = loaded[i].populationLimit;
    }
    this.updateOverallCount();
  }

  this.resetCells = function() {
    cells = new Array(cellsCount);
    this.init();
  }

  this.init = function() {
    // constructor
    for(var i = 0; i < cellsCount; i++) {
      cells[i] = new Cell(averagePopulationCount, averagePopulationCount * 2.5);
    }
    _.each(cellsPopulation, function(value, key) {
      cells[key].setSusceptibleCount(value);
      cells[key].populationLimit = value * 2.5;
    }, this);

    // access by [destination_cell][source_cell] returns Cell
    this.immigrants = _.map(makeArrayOf(null, cells.length), function () {
      return {};
    });
    for(var i = 0; i < cells.length; i++) {
      var currCell = cells[i];
      if (currCell.populationLimit > 0) {
        var neighbours = this.getNeighbours(i);

        for(var j = 0; j < neighbours.length; j++) {
          var neighCell = cells[neighbours[j]];
          if (neighCell.populationLimit > 0) {
            if (!this.immigrants[i][neighbours[j]]) {
              this.immigrants[i][neighbours[j]] = new Cell(null, null);
            }
          }
        }
      }
    }
    this.updateOverallCount();
  }
  this.init();
}

// # Picture class
// Shows map of Poland, gather mouse clicks.
function Picture(_cols, _rows) {
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
  this.getCellPosition = function(pageX, pageY) {
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
        var percentage = (cells[i].infectedCount() + cells[i].incubatedCount()) / cells[i].populationCount();
        ctx.fillStyle = "rgba(255,0,0," + percentage + ")";
        ctx.clearRect((i % rowsCount) * sizeX, Math.floor(i / rowsCount) *
                      sizeY, sizeX, sizeY);
        ctx.fillRect((i % rowsCount) * sizeX, Math.floor(i / rowsCount) *
                     sizeY, sizeX, sizeY);
      }
    }
  }

  // Returns the info about the cell from the given onclick event.
  this.getClickedCellPosition = function(event) {
    return this.getCellPosition(event.pageX, event.pageY);
  }

  // Exports the map picture as a data URI scheme, read more at:
  // http://tools.ietf.org/html/rfc2397
  this.exportImage = function() {
    // Create offscreen buffer.
    buffer = document.createElement('canvas');
    buffer.width = canvasWidth;
    buffer.height = canvasHeight;
    bx = buffer.getContext('2d');
    bx.drawImage(document.getElementById('poland_map'), 0, 0);
    bx.drawImage(canvas, 0, 0);

    var data = buffer.toDataURL("image/png");
    window.open(data);
  }
}

// # Plot class
function Plot() {
  var options = {
    series: { shadowSize: 0 }, // drawing is faster without shadows
    xaxis: { show: true }
  };
  this.historySusceptible = new Array();
  this.historyRecovered = new Array();
  this.historyInfected = new Array();
  var plot = $.plot($("#plot"), [], options);

  // Adds new data to the plot and refresh it.
  this.updateWithNewData = function(susceptible, infected, recovered) {
    var count = this.historySusceptible.length;
    this.historySusceptible.push([count, susceptible]);
    this.historyRecovered.push([count, recovered]);
    this.historyInfected.push([count, infected]);
    this.refresh();
  }

  this.refresh = function() {
    plot.setData([
      //{ label: "Recovered", color: "rgb(0, 185, 0)",
                 //data: this.historyRecovered },
      //{ label: "Susceptible", color: "rgb(0, 0, 0)",
                 //data: this.historySusceptible },
                 { label: "Incubated & Infected",
                   color: "rgb(185, 0, 0)",
                   data: this.historyInfected}]);
    plot.setupGrid();
    plot.draw();
  }
}

// # Configuration class
function Configuration() {

  var params = ["immigrationRate", "illImmigrationRate", "birthRate", "naturalDeathRate",
    "virusMorbidity", "contactInfectionRate", "bigCityRate"];
    

  // Generate getters and setters
  for(id in params) {
    var param = params[id];
    this[param] = function() {
      return this[param];
    };
    // Create a setter that checks whether 'val' is in the interval [0,1]
    this[param] = function(val) {
      if (val > 1) {
        val = 1;
      } else if (val < 0) {
        val = 0;
      }
      this[param] = val;
    };
  }

  // Calculates new recovery rate if the recovery improvement is set.
  this.updateRecoveryRate = function() {
    this.recoveryRate *= 1 + this.recoveryImprovement;
    // Round to 4 decimals -- we have to do that, because form uses input type
    // number with 'step' set to 0.0001, and it is the best precision available.
    this.recoveryRate = Math.round(this.recoveryRate*10000)/10000
    if (this.recoveryRate > 1) {
      this.recoveryRate = 1;
    }
    $("#recoveryRate").val(this.recoveryRate);
  }

  // Loads predefined (provided by authors) settings for few diseases.
  this.loadPredefinedSettings = function(id) {
    var values;
    if (id == 1) {
      // influenza
      values = [0.15, 0.1, 0.0001, 0.0001, 0.004, 0.6, 0.5];
    }
    //else if(id == 2) {
      //// smallpox
      //values = [0.01, 0.0001, 0.0001, 0.005, 0.3, 0.6, 0.1, 0.01];
    //} else if(id == 3) {
      //// zombie
      //values = [0.2, 0.0001, 0.0001, 0.005, 0, 0.06, 0.01, 0];
    //}
    for(var id in params) {
      var param = params[id];
      this[param] = values[id];
    }
    this.pushSettingsToForm();
  }

  // Loads settings entered by the user in the form.
  this.loadSettingsFromForm = function() {
    for (var id in params) {
      var param = params[id];
      this[param] = parseFloat($("#" + param).val());
    }
  }

  // Loads settings from the previously saved state.
  this.loadSavedSettings = function(loaded) {
    for (var id in params) {
      var param = params[id];
      this[param] = loaded[param];
    }
    this.pushSettingsToForm();
  }

  // Updates user-facing form with new values. It's used e.g. after loading one
  // of the default diseases.
  this.pushSettingsToForm = function() {
    for (var id in params) {
      var param = params[id];
      $("#" + param).val(this[param]);
    }
  }

  // constructor
  this.loadPredefinedSettings(1);
};

// # Epidemic class
function Epidemic(_config, _grid, _picture) {

  this.lastMouseOveredCell;
  this.lastMouseOveredIndex;

  this.init = function() {
    picture.updateWithNewData(grid.cells);
  }
  this.run = function() {
    running = true
    var that = this;
    this.interval = setInterval(function() { that.nextStep()}, 50 );
  }

  // Show current stats (day, population, infected) under the map.
  this.showStats = function() {
    var pop = Math.round(grid.populationOverallCount/10000)/100;
    var inc = Math.round(grid.incubatedOverallCount/10000)/100;
    var inf = Math.round(grid.infectedOverallCount/10000)/100;
    var rec = Math.round(grid.recoveredOverallCount/10000)/100;
    $("#iterationInfo div:eq(0)").html("Day:<br>" + iterationNumber);
    $("#iterationInfo div:eq(1)").html("Population:<br>" + pop + "M");
    $("#iterationInfo div:eq(2)").html("Incubated:<br>" + inc + "M");
    $("#iterationInfo div:eq(3)").html("Infected:<br>" + inf + "M");
    $("#iterationInfo div:eq(4)").html("Recovered:<br>" + rec + "M");
  }

  // Generates next step of the simulation.
  this.nextStep = function() {
    grid.next(config);
    picture.updateWithNewData(grid.cells);
    plot.updateWithNewData(grid.susceptibleOverallCount, grid.incubatedOverallCount +
                           grid.infectedOverallCount, grid.recoveredOverallCount);
    iterationNumber++;
    this.showStats();
    this.updateCellInfo(null, null);
  }

  this.pause = function() {
    running = false;
    clearInterval(this.interval);
  }

  // This method is called when user clicks on the map.
  this.infectedUpdated = function(event) {
    var pos = picture.getClickedCellPosition(event);
    grid.setAsInfected(pos.index);
    picture.updateWithNewData(grid.cells);
    this.showStats();
  }

  this.showCellInfo = function(event) {
    var pos = picture.getClickedCellPosition(event);
    var cell = grid.cells[pos.index];
    this.lastMouseOveredCell = cell;
    this.lastMouseOveredIndex = pos.index;
    this.updateCellInfo(event.pageX, event.pageY + 15);
  };

  this.updateCellInfo = function(posX, posY) {
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
                     cell.incubatedCount() + "<br>infected: " + cell.infectedCount() +
                     "<br>recovered: " + cell.recoveredCount());
    }
  };

  this.restart = function() {
    grid.resetCells();
    iterationNumber = 0;
    plot.historyOverall = new Array();
    plot.historyInfected = new Array();
    plot.refresh();
    this.init();
    this.showStats();
  }

  // Saves current state in the user browsers' localStorage.
  this.save = function() {
    var id = (new Date()).toGMTString();
    var state = {}
    state["cells"] = grid.cells;
    state["iterationNumber"] = iterationNumber;
    state["historyOverall"] = plot.historyOverall;
    state["historyInfected"] = plot.historyInfected;
    state["config"] = config;
    try {
      localStorage[id] = JSON.stringify(state);
      return true;
    } catch (e) {
      return false;
    }
  }

  this.savedStatesList = function() {
    var list = [];
    for (var prop in localStorage) {
      list.push(prop);
    }
    return list;
  }

  this.load = function(id) {
    try {
      var state = JSON.parse(localStorage[id]);
      grid.loadState(state.cells);
      iterationNumber = state.iterationNumber;
      plot.historyOverall = state["historyOverall"];
      plot.historyInfected = state["historyInfected"];
      config.loadSavedSettings(state["config"]);
      plot.refresh();
      this.init();
      this.showStats();
      return true;
    } catch (e) {
      return false;
    }
  }

  this.deleteSavedState = function(id) {
    delete localStorage[id];
  }

  // constructor
  var config = _config;
  var grid = _grid;
  var picture = _picture;
  var iterationNumber = 0;
  var running = false;
  var plot = new Plot();
  this.init();
}


$(document).ready(function(){
  var config = new Configuration();
  var grid = new Grid();
  var picture = new Picture(grid.colsCount, grid.rowsCount);

  var epidemic = new Epidemic(config, grid, picture);
  epidemic.showStats();

  // # Events.
  // ## Control buttons' events.
  var startButton = $("#start");
  var pauseButton = $("#pause");
  var oneStepButton = $("#oneStep");
  var exportImageButton = $("#exportImage");
  var saveStateButton = $("#saveState");
  var loadStateButton = $("#loadState");
  var restartButton = $("#restart");
  startButton.click(function(event) {
    event.preventDefault();
    if($(this).attr('disabled')) {
      return false;
    };
    if (!epidemic.running) {
      $(this).attr("disabled", "disabled");
      oneStepButton.attr("disabled", "disabled");
      pauseButton.removeAttr("disabled");
      epidemic.run();
    }
  });
  pauseButton.click(function(event) {
    if($(this).attr('disabled')) {
      return false;
    };
    event.preventDefault();
    startButton.removeAttr("disabled");
    oneStepButton.removeAttr("disabled");
    pauseButton.attr("disabled", "disabled");
    epidemic.pause();
  });
  oneStepButton.click(function(event) {
    if($(this).attr('disabled')) {
      return false;
    };
    event.preventDefault();
    epidemic.nextStep();
  });
  restartButton.click(function(event) {
    event.preventDefault();
    epidemic.restart();
    showAlert("Simulation has been restarted.");
  });

  // ## Import and export buttons' events.
  exportImageButton.click(function(event) {
    event.preventDefault();
    picture.exportImage();
  });
  // Saves state.
  saveStateButton.click(function(event) {
    event.preventDefault();
    if (!supports_html5_storage()) {
      showAlert("Your browser doesn't support local storage.");
      return false;
    }
    if (epidemic.save()) {
      showAlert("State has been saved.");
    } else {
      showAlert("Storage limit excedeed. Please delete old states.");
    }
  });
  // Show modal window for selecting saved state.
  loadStateButton.click(function(event) {
    event.preventDefault();
    if (!supports_html5_storage()) {
      showAlert("Your browser doesn't support local storage.");
      return false;
    }
    var list = epidemic.savedStatesList();
    var output = $("#loadStateList");
    if (list.length == 0) {
      output.html("<li>You don't have any saved models!</li>");
    } else {
      output.html("");
      for (var id in list) {
        output.append('<li><a href="#" class="loadStateLink">' + list[id] + '</a>' +
                    '<a class="btn btn-mini btn-danger stateDelete" href="#">' +
                    'delete</a></li>');
      }
    }
  });
  // Loads state selected from the list.
  $(".loadStateLink").live("click", function(event) {
    event.preventDefault();
    $('#savesList').modal('hide');
    var id = $(this).text();
    if (epidemic.load(id)) {
      showAlert("State " + id + " has been loaded.");
    } else {
      showAlert("There was an error while loading your state!");
    }
  });

  // Deletes saved state.
  $(".stateDelete").live("click", function(event) {
    event.preventDefault();
    var id = $(this).prev().text();
    epidemic.deleteSavedState(id);
    $(this).parent().remove();
  });

  var mouseHolding;
  $("#picture").mousedown(function(event){
    epidemic.infectedUpdated(event);
    mouseHolding = setInterval(function() {
      epidemic.infectedUpdated(event);
      epidemic.showCellInfo(event);
    }, 75 );
    epidemic.showCellInfo(event);
  }).bind('mouseup mouseleave', function() {
    clearInterval(mouseHolding);
  });

  $("#picture").mousemove(function(event) {
    epidemic.showCellInfo(event);
  }).mouseleave(function() {
    $("#cellInfo").hide();
  }).mouseenter(function() {
    $("#cellInfo").show();
  });




  $("input:radio[name=providedEpidemics]").change(function(event) {
    event.preventDefault();
    config.loadPredefinedSettings($(this).val());
    showAlert("Settings for " + $(this).next().text() + " epidemic have been loaded.");
  });

  $("#configuration").submit(function(event) {
    event.preventDefault();
    config.loadSettingsFromForm();
    $("input:radio[name=providedEpidemics]").prop('checked', false);
    showAlert("Settings have been saved.");
  });
});

