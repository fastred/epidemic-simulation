// Shuffles array
shuffle = function(o){ //v1.0
  for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
};
//## Cell class
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

// ## Grid class
// It represents grid of cells.
function Grid(_config) {
  var rowsCount = 40;
  var colsCount = rowsCount;
  var cellsCount = rowsCount * colsCount;
  var cells = new Array(cellsCount);
  var config = _config;
  var avg = 26000;
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
  this.simImmigrations = function() {
    var randIndexes = _.map(cells, function(val, key){ return key});
    randIndexes = shuffle(randIndexes);
    for(i = 0; i < randIndexes.length; i++) {
      var neighbours = this.getNeighbours(randIndexes[i]);
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
  // Performs next step in the simulation.
  this.next = function() {
    this.simImmigrations();
    // Virus can be spread only when it's present in neighbouring cells.
    // Probability rises when percentage of people infected in the neighbourhood
    // rises. This probability is calculated before other steps.
    var vectoredRates = new Array(cellsCount);
    for(i = 0; i < cellsCount; i++) {
      var currCell = cells[i];
      var neighbours = this.getNeighbours(i);
      var neighbourhoodCapacity = _.reduce(neighbours, function(memo, num) {
        return memo + cells[num].populationCount;
      }, 0, this);
      var neighbourhoodInfected = _.reduce(neighbours, function(memo, num) {
        return memo + cells[num].infectedCount;
      }, 0, this);
      vectoredRates[i] = (neighbourhoodCapacity > 0) ? (neighbourhoodInfected / neighbourhoodCapacity) *
        config.vectoredInfectionRate : 0;
    }
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
      var limitContactRate = Math.min(500 * currCell.infectedCount /
                                      currCell.populationCount, 1);
      var infectionRate = vectoredRates[i] +
        ((currCell.infectedCount > 0) ?
         limitContactRate*config.contactInfectionRate : 0);
      infectionRate * (Math.random()*0.1)+1;
      currCell.simInfections(infectionRate);
      currCell.simRecoveries(config.recoveryRate);
    }
    config.updateRecoveryRate();
    this.updateOverallCount();
  }

  this.setAsInfected = function(index) {
    cells[index].infectedCount = Math.round(cells[index].
                                                 populationCount/2);
    this.updateOverallCount();
  }

  for(i = 0; i < cellsCount; i++) {
    cells[i] = new Cell(avg, 0, avg * 2.5);
  }
  _.each(emptyCells, function(num) {
    cells[num].populationCount = 0;
    cells[num].infectedCount = 0;
    cells[num].populationLimit = 0;
  }, this);
  _.each(citiesPopulation, function(value, key) {
    cells[key].populationCount = value * 1000;
    cells[key].populationLimit = value * 1000 * 3;
  }, this);
  this.updateOverallCount();
}

// ## Picture class
// Shows map of Poland, gather mouse clicks.
function Picture(_cols, _rows) {
  var cols = _cols;
  var rows = _rows;
  var cellsCount = cols * rows;
  var canvas = document.getElementById('picture');
  var ctx = canvas.getContext('2d');
  var canvasWidth = canvas.width;
  var canvasHeight = canvas.height;
  var sizeX = canvas.width/cols;
  var sizeY = canvas.height/rows;
  var maxInfectedInHistory = 0;
  var colorHistory = _.map(new Array(_cols * _rows), function (val) {
    return -1;
  });

  this.getCellIndex = function(pageX, pageY) {
    var x = (pageX - $("#picture").offset().left);
    var y = (pageY - $("#picture").offset().top);
    var xCell = Math.floor(x/sizeX);
    var yCell = Math.floor(y/sizeY);
    var index = xCell + yCell * cols;
    return {
      index: index,
      xCell: xCell,
      yCell: yCell
    };
  }

  this.update = function(cells) {
    var sizeX = canvasWidth/cols;
    var sizeY = canvasHeight/rows;
    var maxInfectedInCell = _.max(cells, function(cell){
      return cell.infectedCount;
    }).infectedCount;
    if (maxInfectedInCell > maxInfectedInHistory) {
      maxInfectedInHistory = maxInfectedInCell;
    }
    for(i = 0; i < cellsCount; i++) {
      //var color = "rgb(100,100,100)";
      var color = 0;
        //var color = 100 - Math.round(cells[i].infectedCount /
        //maxInfectedInHistory * 80)
      color = 100 - Math.round(cells[i].infectedCount /
                               cells[i].populationCount * 80)
      //color = maxInfectedInHistory == 0 ? 100 : color;
      if (colorHistory[i] != color) {
        if (cells[i].populationLimit == 0) {
          ctx.fillStyle = "rgb(100,100,100)";
        } else {
          ctx.fillStyle = "hsl(0,100%," + color + "%)";
        }
        ctx.clearRect((i % rows) * sizeX, Math.floor(i / rows) *
                      sizeY, sizeX, sizeY);

        ctx.fillRect((i % rows) * sizeX, Math.floor(i / rows) *
                     sizeY, sizeX, sizeY);
      }
      colorHistory[i] = color;
    }
  }

  this.getGridPosition = function(e) {
    var cellInfo = this.getCellIndex(e.pageX, e.pageY);
    // Don't color empty cells - complexity O(n), could be replaced by hash table
    if ($.inArray(cellInfo.index, emptyCells) == -1) {
      ctx.fillStyle = "hsl(0,100%,50%)";
      ctx.fillRect(cellInfo.xCell * sizeX, cellInfo.yCell*sizeY, sizeX, sizeY);
    }
    return cellInfo.index;
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

  this.update = function(overall, infected) {
    var count = historyOverall.length;
    historyOverall.push([count, overall]);
    historyInfected.push([count, infected]);
    plot.setData([{ label: "Country population", color: "rgb(0, 185, 0)",
                 data: historyOverall},
                 { label: "Infected",
      color: "rgb(185, 0, 0)",
      data: historyInfected}]);
    plot.draw();
    plot.setupGrid();
  }
}

// ## Configuration class
function Configuration() {
  this.immigrationRate = 0.01;
  this.birthRate = 0.01;
  this.naturalDeathRate = 0.01;
  this.virusMorbidity = 0.03;
  this.vectoredInfectionRate = 0.1;
  this.contactInfectionRate = 0.5;
  this.recoveryRate = 0.2;
  this.recoveryImprovement = 0.01;

  // Calculates new recovery rate if the recovery improvement is set.
  this.updateRecoveryRate = function() {
    this.recoveryRate *= 1 + this.recoveryImprovement;
    if (this.recoveryRate > 1) {
      this.recoveryRate = 1;
    }
  }

};

$(document).ready(function(){
  // TODO: change to var
  config = new Configuration();
  var grid = new Grid(config);
  // ## epidemy object
  var epidemy = {
    grid: grid,
    iterationNumber: 0,
    running: false,
    picture: new Picture(grid.colsCount, grid.rowsCount),
    plot: new Plot(),
    init: function() {
      this.picture.update(grid.cells);
    },
    run: function() {
      this.running = true
      var that = this;
      this.interval = setInterval(function() { that.nextStep()}, 100 );
    },
    nextStep: function() {
      this.grid.next();
      this.picture.update(grid.cells);
      this.plot.update(grid.populationOverallCount, grid.infectedOverallCount);
      this.iterationNumber++;
      $("#iteration").html("Iteration: " + this.iterationNumber);
      $("#values").html("Population overall: " + grid.populationOverallCount +
      "<br />Infected overall: " + grid.infectedOverallCount +
      "<br />Infected percentage: " + (grid.infectedOverallCount /
                                       grid.populationOverallCount));
    },
    stop: function() {
      this.running = false;
      clearInterval(this.interval);
    },
    infectedUpdated: function (event) {
      var index = this.picture.getGridPosition(event);
      this.grid.setAsInfected(index);
    }
  };
  epidemy.init();

  // ## Events.
  var startButton = $("#start");
  var stopButton = $("#stop");
  var oneStepButton = $("#oneStep");
  startButton.click(function() {
    $(this).attr("disabled", "disabled");
    epidemy.run();
  });
  stopButton.click(function() {
    startButton.removeAttr("disabled");
    epidemy.stop();
  });
  oneStepButton.click(function() {
    epidemy.nextStep();
  });
  $("#picture").click(function(e){
    epidemy.infectedUpdated(e);
  });
});

