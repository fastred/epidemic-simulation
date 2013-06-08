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

  // Updates the map based on the current cells state.
  this.updateWithNewData = function(cells) {
    var maxInfected = 0;
    for(i = 0; i < cellsCount; i++) {
      var infected = (cells[i].infectiousCount() + cells[i].incubatedCount());
      if (infected > maxInfected) {
        maxInfected = infected;
      }
    }
    if (maxInfected > 0) {
      $("#scaleMiddle").html(parseInt(maxInfected/2, 10));
      $("#scaleMax").html(maxInfected);
    }
    for(i = 0; i < cellsCount; i++) {
      if (cells[i].populationLimit > 0) {
        var percentage;
        if (maxInfected === 0) {
          percentage = 0;
        } else {
          percentage = (cells[i].infectiousCount() + cells[i].incubatedCount()) / maxInfected;
        }
        ctx.fillStyle = "rgba(255,0,0," + percentage + ")";

        // debug
        //if (cells[i].populationLimit > 0) {
          //ctx.fillStyle = "rgba(111, 111, 111, 0.4)";
        //}
        ctx.clearRect((i % colsCount) * sizeX, Math.floor(i / colsCount) *
                      sizeY, sizeX, sizeY);
        ctx.fillRect((i % colsCount) * sizeX, Math.floor(i / colsCount) *
                     sizeY, sizeX, sizeY);
      }
    }
  };
}

