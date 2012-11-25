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

//# Cell class
// This class represents one cell in the grid.
// It contains three values:
//
// * population count
// * infected population count
// * population limit (limited e.g. by the number of houses or food
// availability)
function Cell(populationCount, infectedCount, populationLimit) {
  var populationCount = populationCount;
  var infectedCount = infectedCount;
  var populationLimit = populationLimit;

  this.__defineGetter__("populationCount", function(){
    return populationCount;
  });
  this.__defineSetter__("populationCount", function(val){
    populationCount = val;
  });
  this.__defineGetter__("infectedCount", function(){
    return infectedCount;
  });
  this.__defineSetter__("infectedCount", function(val){
    infectedCount = val;
  });
  this.__defineGetter__("populationLimit", function(){
    return populationLimit;
  });
  this.__defineSetter__("populationLimit", function(val){
    populationLimit = val;
  });

  // Simulates natural deaths with given probability.
  this.simNaturalDeaths = function(prob) {
    this.populationCount -= Math.round(this.populationCount * prob);
    this.infectedCount -= Math.round(this.infectedCount * prob);
  }

  // Simulates deaths caused by the virus (with given probability).
  this.simVirusMorbidity= function(prob) {
    if (Math.random() < prob) {
      var dead = Math.round(this.infectedCount / 5 * 4);
      this.populationCount -= dead;
      this.infectedCount -= dead;
    }
  }

  // Simulates new births with given probability.
  this.simBirths = function(prob) {
    var newborns = Math.round(this.populationCount * prob);
    if(this.populationCount + newborns > this.populationLimit) {
      newborns = this.populationLimit - this.populationCount;
    }
    this.populationCount += newborns;
  }

  // Simulates new infections (with given probability).
  this.simInfections = function(prob) {
    if (this.populationCount > 0) {
      var susceptible = this.populationCount - this.infectedCount;
      var infected = Math.round(susceptible * prob);
      this.infectedCount += infected;
    }
  }

  // Simulates recoveries (with given probability).
  this.simRecoveries = function(prob) {
    var recovered = Math.round(this.infectedCount * prob);
    this.infectedCount -= recovered;
  }
}

// # Grid class
// It represents grid of cells.
function Grid() {
  var rowsCount = 40;
  var colsCount = rowsCount;
  var cellsCount = rowsCount * colsCount;
  var cells = new Array(cellsCount);
  var populationOverallCount = 0;
  var infectedOverallCount = 0;

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

  // Updates counts of total population and infected people.
  this.updateOverallCount = function() {
    populationOverallCount = _.reduce(cells, function(memo, num) {
      return memo + num.populationCount;
    }, 0);
    infectedOverallCount = _.reduce(cells, function(memo, num) {
      return memo + num.infectedCount;
    }, 0);
  };

  // Returns indices of neighbouring cells.
  this.getNeighbours = function(index) {
    var neighbours = [];
    if (index / colsCount >= 1) {
      neighbours.push(index - colsCount); // up
    }
    if (index % colsCount != colsCount - 1) {
      neighbours.push(index + 1); // right
    }
    if (Math.floor(index / rowsCount) < rowsCount - 1) {
      neighbours.push(index + colsCount); // down
    }
    if (index % colsCount != 0) {
      neighbours.push(index - 1); //left
    }
    return neighbours;
  }


  // Simulates immigrations.
  // Algorithm:
  //
  // 1. Select random cell
  // 2. Get its neighbours
  // 3. Calculate number of people (overall and infected) to emmigrate to one
  // neighbouring cell
  // 4. Move people to all neighbouring cell
  // 5. Repeat until all cells were chosen
  this.simImmigrations = function(config) {
    var randIndexes = _.map(cells, function(val, key){ return key});
    randIndexes = shuffle(randIndexes);
    for(i = 0; i < randIndexes.length; i++) {
      var neighbours = shuffle(this.getNeighbours(randIndexes[i]));
      var currCell = cells[randIndexes[i]];
      var toMove = Math.round(config.immigrationRate *
                              currCell.populationCount / neighbours.length);
      var toMoveInfected = Math.round(config.immigrationRate *
                                      currCell.infectedCount / neighbours.length);
      for(j = 0; j < neighbours.length; j++) {
        var neighCell = cells[neighbours[j]];
        if (neighCell.populationCount + toMove > neighCell.populationLimit) {
          toMove = neighCell.populationLimit - neighCell.populationCount;
          if (toMoveInfected > toMove) { toMoveInfected = toMove; }
        }
        neighCell.populationCount += toMove;
        neighCell.infectedCount += toMoveInfected;
        currCell.populationCount -= toMove;
        currCell.infectedCount -= toMoveInfected;
      }
    }
  }

  // Virus can be spread only when it's present in neighbouring cells.
  // Probability rises when percentage of people infected in the neighbourhood
  // rises. This probability is calculated before other steps.
  this.calculateVectoredRates = function(config) {
    var vectoredRates = makeArrayOf(0, cellsCount);
    for(i = 0; i < cellsCount; i++) {
      var currCell = cells[i];
      var neighbours = this.getNeighbours(i);
      var neighbourhoodCapacity = _.reduce(neighbours, function(memo, num) {
        return memo + cells[num].populationCount;
      }, 0, this);
      if (neighbourhoodCapacity > 0) {
        var neighbourhoodInfected = _.reduce(neighbours, function(memo, num) {
          return memo + cells[num].infectedCount;
        }, 0, this);
        vectoredRates[i] = (neighbourhoodInfected / neighbourhoodCapacity) *
          config.vectoredInfectionRate;
      }
    }
    return vectoredRates;
  }

  // Performs next step in the simulation.
  this.next = function(config) {
    this.simImmigrations(config);
    var vectoredRates = this.calculateVectoredRates(config);
    // Simulates natural deaths, deaths caused by the virus and new births.
    for(i = 0; i < cellsCount; i++) {
      var currCell = cells[i];
      currCell.simNaturalDeaths(config.naturalDeathRate);
      currCell.simVirusMorbidity(config.virusMorbidity);
      currCell.simBirths(config.birthRate);
    }
    // Simulates new contact and vectored infections. Then simulates recoveries.
    for(i = 0; i < cellsCount; i++) {
      var currCell = cells[i];
      var limitContactRate = currCell.infectedCount / currCell.populationCount;
      var contactRate = limitContactRate * config.contactInfectionRate
      currCell.simInfections(vectoredRates[i] + contactRate);
      currCell.simRecoveries(config.recoveryRate);
    }
    config.updateRecoveryRate();
    this.updateOverallCount();
  }

  this.setAsInfected = function(index) {
    cells[index].infectedCount = cells[index].populationCount;
    this.updateOverallCount();
  }

  this.loadState = function(loaded) {
    for(i = 0; i < cellsCount; i++) {
      cells[i].populationCount = loaded[i].populationCount;
      cells[i].infectedCount = loaded[i].infectedCount;
      cells[i].populationLimit = loaded[i].populationLimit;
    }
  }

  this.resetCells = function() {
    cells = new Array(cellsCount);
    this.init();
  }

  this.init = function() {
    // constructor
    var avg = 26000;
    for(i = 0; i < cellsCount; i++) {
      cells[i] = new Cell(avg, 0, avg * 2.5);
    }
    _.each(cellsPopulation, function(value, key) {
      cells[key].populationCount = value;
      cells[key].populationLimit = value * 2.5;
    }, this);
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
        var percentage = cells[i].infectedCount / cells[i].populationCount;
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

  // Changes the color of the current cell to indicate that it's now infected.
  this.setAsInfected = function(index, col, row) {
    if (cellsPopulation[index] != 0) {
      ctx.fillStyle = "rgba(255,0,0,100)";
      ctx.fillRect(row * sizeX, col * sizeY, sizeX, sizeY);
    }
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
  var historyOverall = new Array();
  var historyInfected = new Array();
  var plot = $.plot($("#plot"), [], options);

  this.__defineGetter__("historyOverall", function(){
    return historyOverall;
  });
  this.__defineSetter__("historyOverall", function(val){
    historyOverall = val;
  });
  this.__defineGetter__("historyInfected", function(){
    return historyInfected;
  });
  this.__defineSetter__("historyInfected", function(val){
    historyInfected = val;
  });

  // Adds new data to the plot and refresh it.
  this.updateWithNewData = function(overall, infected) {
    var count = historyOverall.length;
    historyOverall.push([count, overall]);
    historyInfected.push([count, infected]);
    this.refresh();
  }

  this.refresh = function() {
    plot.setData([{ label: "Country population", color: "rgb(0, 185, 0)",
                 data: historyOverall },
                 { label: "Infected",
                   color: "rgb(185, 0, 0)",
                   data: historyInfected}]);
    plot.setupGrid();
    plot.draw();
  }
}

// # Configuration class
function Configuration() {

  var params = ["immigrationRate", "birthRate", "naturalDeathRate",
    "virusMorbidity", "vectoredInfectionRate", "contactInfectionRate",
    "recoveryRate", "recoveryImprovement"];

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
      values = [0.01, 0.0001, 0.0001, 0.001, 0.3, 0.6, 0.1, 0.008];
    } else if(id == 2) {
      // smallpox
      values = [0.01, 0.0001, 0.0001, 0.005, 0.3, 0.6, 0.1, 0.01];
    } else if(id == 3) {
      // zombie
      values = [0.2, 0.0001, 0.0001, 0.005, 0, 0.06, 0.01, 0];
    }
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
    var inf = Math.round(grid.infectedOverallCount/10000)/100;
    $("#iterationInfo div:eq(0)").html("Day: " + iterationNumber);
    $("#iterationInfo div:eq(1)").html("Population: " + pop + "M");
    $("#iterationInfo div:eq(2)").html("Infected population: " + inf + "M");
  }

  // Generates next step of the simulation.
  this.nextStep = function() {
    grid.next(config);
    picture.updateWithNewData(grid.cells);
    plot.updateWithNewData(grid.populationOverallCount, grid.infectedOverallCount);
    iterationNumber++;
    this.showStats();
  }

  this.pause = function() {
    running = false;
    clearInterval(this.interval);
  }

  // This method is called when user clicks on the map.
  this.infectedUpdated = function(event) {
    var pos = picture.getClickedCellPosition(event);
    grid.setAsInfected(pos.index);
    picture.setAsInfected(pos.index, pos.row, pos.col);
    this.showStats();
  }

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
  var grid = new Grid(config);
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
    if (!epidemic.running) {
      $(this).attr("disabled", "disabled");
      oneStepButton.attr("disabled", "disabled");
      pauseButton.removeAttr("disabled");
      epidemic.run();
    }
  });
  pauseButton.click(function(event) {
    event.preventDefault();
    startButton.removeAttr("disabled");
    oneStepButton.removeAttr("disabled");
    pauseButton.attr("disabled", "disabled");
    epidemic.pause();
  });
  oneStepButton.click(function(event) {
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
  $("#picture").click(function(event){
    epidemic.infectedUpdated(event);
  });
  $("#providedEpidemics a").click(function(event) {
    event.preventDefault();
    config.loadPredefinedSettings($(this).data("id"));
    showAlert("Settings for " + $(this).text() + " epidemic have been loaded.");
  });
  $("#configuration").submit(function(event) {
    event.preventDefault();
    config.loadSettingsFromForm();
    showAlert("Settings have been saved.");
  });
});

