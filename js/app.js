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

  this.getRowsCount = function() {
    return rowsCount;
  }
  this.getColsCount = function() {
    return colsCount;
  }
  this.getCells = function() {
    return cells;
  }
  // Updates counts of total population and infected people.
  this.updateOverallCount = function() {
    this.populationOverallCount = _.reduce(cells, function(memo, num) {
      return memo + num.populationCount;
    }, 0);
    this.infectedOverallCount = _.reduce(cells, function(memo, num) {
      return memo + num.infectedCount;
    }, 0);
  };

  // Helper for showing results in tabular form.
  this.showValues = function() {
    var result = "Population overall: " + this.populationOverallCount +
      "<br />Infected overall: " + this.infectedOverallCount +
      "<br />Infected percentage: " + (this.infectedOverallCount /
                                       this.populationOverallCount)
    /*result += "<h3>Population:</h3><table>";
      for(i = 0; i < this.cellsCount; i++) {
      result += "<td width='30px'>" + this.cells[i].populationCount + "</td>";
      if((i + 1) % this.rowsCount === 0) { result += "</tr><tr>"; }
      }
      result += "</table><h3>Infected:</h3><table>";
      for(i = 0; i < this.cellsCount; i++) {
      result += "<td width='30px'>" + this.cells[i].infectedCount + "</td>";
      if((i + 1) % this.rowsCount === 0) { result += "</tr><tr>"; }
      }
      result += "</table>";*/
    $("#values").html(result);
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
    // Calculates new recovery rate if the recovery improvement is set.
    config.recoveryRate *= 1 + config.recoveryImprovement;
    if (config.recoveryRate > 1) {
      config.recoveryRate = 1;
    }
    this.updateOverallCount();
  }

  this.setAsInfected = function(index) {
    cells[index].infectedCount = Math.round(cells[index].
                                                 populationCount/2);
    this.updateOverallCount();
    this.showValues();
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
  this.canvas = document.getElementById('picture');
  this.ctx = this.canvas.getContext('2d');
  this.canvasWidth = this.canvas.width;
  this.canvasHeight = this.canvas.height;
  this.maxInfectedInHistory = 0;
  this.emptyCellColor = "rgb(100,100,100)";

  this.update = function(cells) {
    var cellWidth = this.canvasWidth/cols;
    var cellHeight = this.canvasHeight/rows;
    var cellsCount = cols * rows;
    var maxInfectedInCell = _.max(cells, function(cell){
      return cell.infectedCount;
    }).infectedCount;
    if (maxInfectedInCell > this.maxInfectedInHistory) {
      this.maxInfectedInHistory = maxInfectedInCell;
    }
    for(i = 0; i < cellsCount; i++) {
      if (cells[i].populationLimit == 0) {
        this.ctx.fillStyle = this.emptyCellColor;
      } else {
        //var color = 100 - Math.round(cells[i].infectedCount /
        //this.maxInfectedInHistory * 80)
        var color = 100 - Math.round(cells[i].infectedCount /
                                     cells[i].populationCount * 80)
        color = this.maxInfectedInHistory == 0 ? 100 : color;
        this.ctx.fillStyle = "hsl(0,100%," + color + "%)";
      }
      this.ctx.fillRect((i % rows) * cellWidth, Math.floor(i / rows) *
                        cellHeight, cellWidth, cellHeight);
    }
  }

  this.getGridPosition = function(e) {
    var x = (e.pageX - $("#picture").offset().left);
    var y = (e.pageY - $("#picture").offset().top);
    var sizeX = this.canvas.width/cols;
    var sizeY = this.canvas.height/rows;
    var xCell = Math.floor(x/sizeX);
    var yCell = Math.floor(y/sizeY);
    var index = xCell + yCell * cols;
    // Don't color empty cells - complexity O(n), could be replaced by hash table
    if ($.inArray(index, emptyCells) == -1) {
      this.ctx.fillStyle = "hsl(0,100%,50%)";
      this.ctx.fillRect(xCell*sizeX, yCell*sizeY, sizeX, sizeY);
    }
    return index;
  }
}

// # Plot class
function Plot() {
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
};

$(document).ready(function(){
  // TODO: change to var
  config = new Configuration();
  var grid = new Grid(config);
  console.log("population: " + grid.populationOverallCount);
  console.log("infected: " + grid.infectedOverallCount);
  // ## epidemy object
  var epidemy = {
    grid: grid,
    iterationNumber: 0,
    running: false,
    picture: new Picture(grid.getColsCount(), grid.getRowsCount()),
    init: function() {
      this.picture.update(grid.getCells());
    },
    run: function() {
      this.running = true
      var that = this;
      this.interval = setInterval(function() { that.nextStep()}, 100 );
    },
    nextStep: function() {
      this.grid.next();
      this.grid.showValues();
      this.picture.update(grid.getCells());
      this.iterationNumber++;
      $("#iteration").html("Iteration: " + this.iterationNumber);
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

