// Shows map of Poland
function PictureView(_cols, _rows) {
  var colsCount = _cols;
  var rowsCount = _rows;
  var cellsCount = colsCount * rowsCount;
  var canvas = document.getElementById('picture');
  var ctx = canvas.getContext('2d');
  var canvasWidth = canvas.width;
  var canvasHeight = canvas.height;
  var sizeX = canvas.width/colsCount;
  var sizeY = canvas.height/rowsCount;
  var maxPopulation = -1;

  // Returns info about the cell that is under the provided position on the page.
  this.getCellInfoByPosition = function(pageX, pageY) {
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
  };

  this.log10 = function(value) {
    return Math.log(value) / Math.log(10);
  };

  // Updates the map based on the current cells state.
  this.updateWithNewData = function(cells) {
    // if maxPopulation not yet set
    if (maxPopulation == -1 ) {
      for(i = 0; i < cellsCount; i++) {
        var population = cells[i].populationCount();
        if (population > maxPopulation) {
          maxPopulation = population;
        }
      }
    }
    var maxPopulationLog = this.log10(maxPopulation);

    if (maxPopulation > 0) {
      $("#scaleMiddle").html(Math.round(Math.pow(maxPopulationLog / 2, 10)));
      $("#scaleMax").html(maxPopulation);
    }

    for(i = 0; i < cellsCount; i++) {
      if (cells[i].populationLimit > 0) {
        var percentage = 0;
        if (cells[i].infectiousCount() + cells[i].incubatedCount() > 0) {
          percentage = this.log10(cells[i].infectiousCount() + cells[i].incubatedCount()) /
            maxPopulationLog;
        }
        ctx.fillStyle = "rgba(255,0,0," + percentage + ")";
        ctx.clearRect((i % colsCount) * sizeX, Math.floor(i / colsCount) *
                      sizeY, sizeX, sizeY);
        ctx.fillRect((i % colsCount) * sizeX, Math.floor(i / colsCount) *
                     sizeY, sizeX, sizeY);
      }
    }
  };
}

