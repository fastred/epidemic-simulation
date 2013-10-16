function Epidemic(_grid) {

  this.lastMouseOveredCell;
  this.lastMouseOveredIndex;
  this.automaticallyPaused = new Observer(this);
  this.dataChanged = new Observer(this);
  this.newDataForPlot = new Observer(this);
  this.history = new History();
  var grid = _grid;
  this.iterationNumber = 0;
  var running = false;

  this.run = function() {
    if (!running) {
      running = true;
      this.nextStep();
    }
  };

  // Generates next step of the simulation.
  this.nextStep = function() {
    this.oldInfectedCount = grid.incubatedOverallCount + grid.infectiousOverallCount;
    worker.postMessage({'cmd': 'nextStep', 'config': config.serialize()});
  };

  this.deserializeGrid = function(newSerializedGrid) {
    grid.unserialize(newSerializedGrid);
    grid.updateOverallCount();
  };

  this.addDataToHistory = function() {
    this.history.addNewData(grid.susceptibleOverallCount, grid.incubatedOverallCount,
                            grid.infectiousOverallCount, grid.recoveredOverallCount);
  };

  this.workerCompletedStep = function(newSerializedGrid) {
    // add data at step t=0
    if (this.iterationNumber === 0) {
      this.addDataToHistory();
    }
    this.deserializeGrid(newSerializedGrid);
    this.addDataToHistory();
    this.newDataForPlot.notify();
    this.iterationNumber++;
    var newInfectedCount = grid.incubatedOverallCount + grid.infectiousOverallCount;
    if (this.oldInfectedCount > 0 && newInfectedCount === 0) {
      this.pause();
      this.automaticallyPaused.notify();
    }
    this.dataChanged.notify();
    if (running) {
      this.nextStep();
    }
  };

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
  };

  this.restart = function() {
    this.history = new History();
    this.initWorker();
    this.iterationNumber = 0;
    this.dataChanged.notify();
  };

  this.exportCellsState = function() {
    return grid.exportCurrentState();
  };

  this.isRunning = function() {
    return running;
  };

  this.randomlyAddIll = function() {
    worker.postMessage({'cmd': 'randomlyAddIll', 'config': config.serialize()});
  };

  this.initWorker = function() {
    worker.postMessage({'cmd': 'init', 'config': config.serialize()});
  };

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
        break;
      }
    } else {
      debug(e.data);
    }
  }, false);
  this.initWorker();
}

