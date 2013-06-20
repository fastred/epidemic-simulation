// simulation in node.js
// command line parameters:
// - R0 - runs simulation of R0 parameter
// - main - runs main simulation
// - cells - generate cells' state screenshots

var fs = require('fs');
var sys = require('sys');
var _ = require('underscore');
// TODO: remove those ugly evals
eval(fs.readFileSync('js/functions.js').toString());
eval(fs.readFileSync('js/polish_data.js').toString());
eval(fs.readFileSync('js/cell.js').toString());
eval(fs.readFileSync('js/grid.js').toString());
eval(fs.readFileSync('js/observer.js').toString());
eval(fs.readFileSync('js/history.js').toString());
eval(fs.readFileSync('js/config.js').toString());

var gridStartingConfFileName = "output/grid.json";
if (!fs.existsSync(gridStartingConfFileName)) {
  // create initial config if it doesn't exist
  var grid = new Grid();
  grid.addRandomlyPlacedIll();
  fs.writeFileSync(gridStartingConfFileName, JSON.stringify(grid.serialize()));
}

// initial config for all simulations
var GRID_DATA_AT_T_0 = JSON.parse(fs.readFileSync(gridStartingConfFileName));

config.loadDefaultEpidemic();

var vOptions = [0, 0.5, 1];
var betaOptions = [0.1, 0.2, 0.25, 0.35, 0.4, 0.5, 0.6, 0.7, 0.8];
//var betaOptions = [0.3];
var runs = 10;
config.infectionFunction = 0;
var runR0Simulation = false;
var runMainSimulation = false;
var runCellsStateSimulation = false;

// uses global data
function numberOfRuns() {
  // uses 0.1 because it can be float
  return config.varCoeff < 0.1 ? 1 : runs;
}

process.argv.forEach(function (val, index, array) {
  console.log(index + ': ' + val);
  if (val == "R0") {
    runR0Simulation = true;
  }
  if (val == "main") {
    runMainSimulation = true;
  }
  if (val == "cells") {
    runCellsStateSimulation = true;
  }
});

if (runR0Simulation) {
  var oldInfectiousIndex = config.infectiousIndex;
  config.incubatedDays = 4;
  for (var vIdx in vOptions) {
    config.varCoeff = vOptions[vIdx];
    var result = "# beta R0\n";
    for (var beta = 0; beta <= 1.01; beta += 0.05) {
      config.contactInfectionRate = beta;

      var histories = [];
      for (var runNum=0; runNum < numberOfRuns(); runNum++) {
        var grid = new Grid();

        // in archived initial state length of incubated state is set to 2 days
        // here we change it to 4, so we have to manully adjust it to proper array index
        for (var cellId in grid.cells) {
          grid.cells[cellId].addNewInfectious(
            GRID_DATA_AT_T_0[cellId][oldInfectiousIndex]);
        }

        var history = new History();
        for (var iteration=0; iteration < 5; iteration++) {
          history.addNewData(
            grid.susceptibleOverallCount, grid.incubatedOverallCount,
            grid.infectiousOverallCount, grid.recoveredOverallCount);
            var infectedCount = grid.incubatedOverallCount + grid.infectiousOverallCount;
            grid.next();
        }
        histories.push(history);
      }

      var averagedHistory = History.average(histories);
      var testingDay = 4;
      var inc = averagedHistory.data[testingDay].incubated;
      var rec = averagedHistory.data[testingDay].recovered;
      var averagedR0 = inc/rec;
      var variance = _.reduce(histories, function(memo, history) {
        var R0 = history.data[testingDay].incubated / history.data[testingDay].recovered;
        return memo + Math.pow(R0 - averagedR0, 2);
      }, 0) / histories.length;
      console.log("v=" + config.varCoeff + " beta=" + config.contactInfectionRate +
                  "    avg= " + averagedR0.toFixed(3) +" stddev = " +
                  Math.sqrt(variance).toFixed(3));
      result += beta + " " + averagedR0 + " " + Math.sqrt(variance) + "\n";
    }
    fs.writeFileSync("output/R0_v_" + config.varCoeff + ".dat", result);
  }
}

if (runMainSimulation) {
  config.incubatedDays = 2;
  for (var vIdx in vOptions) {
    config.varCoeff = vOptions[vIdx];
    for (var betaIdx in betaOptions) {
      config.contactInfectionRate = betaOptions[betaIdx];
      console.log(config.textForHistoryFileName());

      var histories = [];
      for (var runNum=0; runNum < numberOfRuns(); runNum++) {
        console.log("runNum: " + runNum);
        var grid = new Grid();
        grid.unserialize(GRID_DATA_AT_T_0);

        var history = new History();
        var iteration = 0;
        do {
          history.addNewData(
            grid.susceptibleOverallCount, grid.incubatedOverallCount,
            grid.infectiousOverallCount, grid.recoveredOverallCount);
            var infectedCount = grid.incubatedOverallCount + grid.infectiousOverallCount;
            grid.next();
            iteration++;
            if (iteration % 100 === 0) {
              console.log("iteration: " + iteration);
            }
        } while (infectedCount > 0);
        histories.push(history);
      }

      var averagedHistory = History.average(histories);
      var fileName = "output/" + config.textForHistoryFileName().toString() + ".dat";
      fs.writeFileSync(fileName, averagedHistory.exportData());
    }
  }
}

if (runCellsStateSimulation) {
  config.incubatedDays = 2;
  // we do cell's state graphs only with beta = 0.6
  config.contactInfectionRate = 0.6;

  var screenshotInterval = 40;

  for (var vIdx in vOptions) {
    config.varCoeff = vOptions[vIdx];

    var grid = new Grid();
    grid.unserialize(GRID_DATA_AT_T_0);

    var iteration = 0;
    do {
      var infectedCount = grid.incubatedOverallCount + grid.infectiousOverallCount;
      if (iteration % screenshotInterval === 0) {
        console.log("iteration: " + iteration);
        var fileName = "output/" + config.textForCellsStateFileName() + iteration + ".dat";
        fs.writeFileSync(fileName, grid.exportCurrentState());
      }

      grid.next();
      iteration++;
    } while (infectedCount > 0);
  }
}
