// simulation in node.js

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

config.loadDefaultEpidemic();

var vOptions = [0, 0.3, 0.6, 1];
var betaOptions = [0.2, 0.4, 0.6, 0.8];
var runs = 10;

for (var vIdx in vOptions) {
  config.varCoeff = vOptions[vIdx];
  for (var betaIdx in betaOptions) {
    config.contactInfectionRate = betaOptions[betaIdx];
    console.log(config.textForHistoryFileName());

    var histories = [];
    for (var runNum=0; runNum < runs; runNum++) {
      console.log("runNum: " + runNum);
      var grid = new Grid();
      grid.addRandomlyPlacedIll();

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

