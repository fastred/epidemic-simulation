
// # Grid class
// It represents grid of cells.
function Grid() {
  var rowsCount = 36;
  var colsCount = 36;
  var cellsCount = rowsCount * colsCount;
  var cells = new Array(cellsCount);
  var populationOverallCount = 0;
  var incubatedOverallCount = 0;
  var infectiousOverallCount = 0;
  var recoveredOverallCount = 0;
  var susceptibleOverallCount = 0;
  var closestCity;

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
  this.__defineGetter__("infectiousOverallCount", function(){
    return infectiousOverallCount;
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

  // Updates counts of total population and infectious people.
  this.updateOverallCount = function() {
    populationOverallCount = _.reduce(cells, function(memo, cell) {
      return memo + cell.populationCount();
    }, 0);
    infectiousOverallCount = _.reduce(cells, function(memo, cell) {
      return memo + cell.infectiousCount();
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
    closestCity = {};
    for (var i = 0; i < cells.length; i++) {
      if (cells[i].populationLimit > 0) {
        var queue = [];
        var queuedIndices = {};
        queuedIndices[i] = true;
        queue.push({ind: i, dist: 0});
        var cityFound = false;
        while (!cityFound && queue.length > 0) {
          var obj = queue.shift();
          var index = obj.ind;
          var distance = obj.dist;
          if (cells[index].populationCount() > config.commutingCityTreshold && index != i) {
            cityFound = true;
            closestCity[i] = {ind: index, dist: distance};
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
  this.simImmigrations = function() {
    for(var i = 0; i < cells.length; i++) {
      var currCell = cells[i];
      if (currCell.populationLimit > 0) {
        var neighbours = this.getNeighbours(i);
        var closeCityObj = closestCity[i];
        var closeCityExists = false;
        if (currCell.populationCount() <= config.commutingCityTreshold && closeCityObj &&
            closeCityObj.dist >= 1 && closeCityObj.dist <= 3) {
          // if dist == 1 then city is already in neighbours
          if (closeCityObj.dist > 1) {
            neighbours.push(closeCityObj.ind);
          }
          closeCityExists = true;
        }

        // precalculate counts of immigrants and then execute
        var precalculatedMoves = {}

        for(var j = 0; j < neighbours.length; j++) {
          var neighCell = cells[neighbours[j]];
          if (neighCell.populationLimit > 0) {
            if (!this.immigrants[neighbours[j]][i]) {
              this.immigrants[neighbours[j]][i] = new Cell(null, null);
            }
            for (var k = 0; k < config.statesCountLength; k++ ) {
              var immigrationRate = k > 0 && k < config.statesCountLength - 1 ? config.illImmigrationRate :
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
              toMove = Math.floor(toMove);
              if (!(neighbours[j] in precalculatedMoves)) {
                precalculatedMoves[neighbours[j]] = {};
              }
              precalculatedMoves[neighbours[j]][k] = toMove;
            }
          }
        }
        for (var neighbourId in precalculatedMoves) {
          for (var stateId in precalculatedMoves[neighbourId]) {
            if (cells[neighbourId].populationCount() + precalculatedMoves[neighbourId][stateId] <
                cells[neighbourId].populationLimit) {
                  this.immigrants[neighbourId][i].statesCount[stateId] +=
                    precalculatedMoves[neighbourId][stateId];
                  currCell.statesCount[stateId] -=
                    precalculatedMoves[neighbourId][stateId];
                }
            if (currCell.statesCount[stateId] < 0) {
              throw new Error("Fatal error in simImmigrations!");
            }
          }
        }
      }
    }
  };

  this.simReturningImmigrations = function() {
    for(var i = 0; i < cells.length; i++) {
      var currCell = cells[i];
      if (currCell.populationLimit > 0) {
        for(var key in this.immigrants[i]) {
          var neighCell = cells[key];
          if (neighCell.populationLimit > 0) {
            for (var k = 0; k < config.statesCountLength; k++ ) {
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
  this.next = function() {
    this.simImmigrations();
    // Simulates natural deaths, deaths caused by the virus and new births.
    for(var i = 0; i < cellsCount; i++) {
      var currCell = cells[i];
      currCell.simBirthsAndDeaths(config.birthRate, config.naturalDeathRate,
                                  config.virusMorbidity);
    }
    // Simulates infections and recoveries
    for(i = 0; i < cellsCount; i++) {
      var currCell = cells[i];
      currCell.simInfections(i, this.immigrants[i]);
    }
    this.simReturningImmigrations();
    this.updateOverallCount();
  }

  this.addRandomlyPlacedIll = function() {
    for (var i = 0; i < Math.floor(config.startingIllCount/config.startingIllPerCell); i++) {
      var cellId = this.cellsForRandomIll[Math.floor(Math.random()*this.cellsForRandomIll.length)];
      cells[cellId].statesCount[config.infectiousIndex] += config.startingIllPerCell ;
      cells[cellId].statesCount[0] -= config.startingIllPerCell ;
    }
    this.updateOverallCount();
  };

  this.exportCurrentState = function() {
    var result = "";
    for (var x=0; x < colsCount; x++) {
      for (var y=0; y < rowsCount; y++) {
        var cell = cells[(rowsCount - 1 - y)*rowsCount + x];
        result += x + " " + y + " " + (cell.incubatedCount() +
                                       cell.infectiousCount()) + "\n";
      }
      result += "\n";
    }
    return result;
  }

  this.init = function() {
    this.cellsForRandomIll = [];
    _.each(cellsPopulation, function(value, key) {
      cells[key] = new Cell(value, value * 2.5);
      if (value > config.minPopulationForRandomIll) {
        this.cellsForRandomIll.push(key);
      }
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
    this.findClosestBigCity();
    this.updateOverallCount();
  }

  this.serialize = function() {
    var data = {}
    for (var i=0; i < cells.length; i++) {
      data[i] = cells[i].serialize();
    }
    return data;
  }

  this.unserialize = function(data) {
    for (var i=0; i < cells.length; i++) {
      cells[i].unserialize(data[i]);
    }
  }
  this.init();
}
