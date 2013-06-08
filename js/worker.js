importScripts("functions.js");
importScripts("underscore-min.js");
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
      self.postMessage('WORKER INITIALIZED');
      break;
    case 'nextStep':
      config = data.config;
      grid.next();
      self.postMessage({'cmd': 'gridData', 'grid': grid.serialize()});
      break;
    case 'randomlyAddIll':
      config = data.config;
      grid.addRandomlyPlacedIll();
      self.postMessage('grid.addRandomlyPlacedIll() called');
      break;
    case 'addIncubatedToCell':
      config = data.config;
      grid.cells[data.cellId].addNewIncubated(data.value);
      self.postMessage({'cmd': 'incubatedAddedToCell', 'grid': grid.serialize()});
    default:
      self.postMessage('Unknown command: ' + data.msg);
  };
}, false);

