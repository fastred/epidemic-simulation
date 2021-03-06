importScripts("libs/underscore-min.js");
importScripts("functions.js");
importScripts("polish_data.js");
importScripts("cell.js");
importScripts("grid.js");
var config;
var grid;

self.addEventListener('message', function(e) {
  var data = e.data;
  switch (data.cmd) {
    case 'init':
      config = data.config;
      grid = new Grid();
      self.postMessage({'cmd': 'workerInitialized', 'grid': grid.serialize()});
      break;
    case 'nextStep':
      config = data.config;
      grid.next();
      self.postMessage({'cmd': 'gridData', 'grid': grid.serialize()});
      break;
    case 'randomlyAddIll':
      config = data.config;
      grid.addRandomlyPlacedIll();
      self.postMessage({'cmd': 'addedRandomlyPlacedIll', 'grid': grid.serialize()});
      break;
    case 'addIncubatedToCell':
      config = data.config;
      grid.cells[data.cellId].addNewIncubated(data.value);
      self.postMessage({'cmd': 'incubatedAddedToCell', 'grid': grid.serialize()});
      break;
    default:
      self.postMessage('Unknown command: ' + data.msg);
    break;
  }
}, false);

