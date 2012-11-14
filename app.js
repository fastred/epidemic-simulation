 $(document).ready(function(){
   function Cell(populationCount, infectedCount, populationLimit) {
     this.populationCount = populationCount;
     this.infectedCount = infectedCount;
     this.populationLimit = populationLimit;
   }

   function Grid(config) {
     this.rowsCount = 30;
     this.colsCount = this.rowsCount;
     this.cellsCount = this.rowsCount * this.colsCount;
     this.cells = new Array(this.cellsCount);
     this.config = config;
     // TODO: change to actual number of people in given regions
     this.avg = Math.round(38500001/this.cellsCount);
     for(i = 0; i < this.cellsCount; i++) {
       this.cells[i] = new Cell(this. avg, 1000, this.avg * 2.5);
     }
     this.updateOverallCount();
   }
   Grid.prototype.updateOverallCount = function() {
     this.populationOverallCount =
       _.reduce(this.cells, function(memo, num){
        return memo + num.populationCount; }, 0);
     this.infectedOverallCount =
       _.reduce(this.cells, function(memo, num){
        return memo + num.infectedCount; }, 0);
   };
   Grid.prototype.showValues = function() {
     console.log("calculating values");
     var result = "";
     console.log(this.cells.length);
     for(i = 0; i < this.cellsCount; i++) {
       result += " " + Math.round(this.cells[i].infectedCount /
                                  this.cells[i].populationCount*100)/100;
       if((i + 1) % this.rowsCount === 0) {
         result += "<br />";
       }
     }
     $("#values").html(result);
   };
   Grid.prototype.next = function() {
     // move between cells
     //var newCells = this.cells.slice(0);


   }

   function Configuration() {
     this.immigrationRate = 0.01;
     this.birthRate = 0.01;
     this.naturalDeathRate = 0.01;
     this.virusMorbidity = 0.05;
     this.vectoredInfectionRate = 0.2;
     this.contactInfectionRate = 0.4;
     this.recoveryRate = 0.1;
   };

   var config = new Configuration();

   var grid = new Grid(config);
   console.log("population: " + grid.populationOverallCount);
   console.log("infected: " + grid.infectedOverallCount);
   var epidemy = { grid: grid,
     config: "config object",
     iterationNumber: 0,
     running: false,
     picture: "picture object (maybe)",
     run: function() {
       this.running = true;
       var that = this;
       this.interval = setInterval(function() {that.nextStep()}, 500);
     },
     nextStep: function() {
       console.log("some work");
       console.log(this.running);
       this.grid.showValues();
       //console.log(grid.populationOverallCount);
     },
     stop: function() {
       this.running = false;
       clearInterval(this.interval);
       console.log("stop called");
     }

   };

   var startButton = $("#start");
   var stopButton = $("#stop");
   startButton.click(function() {
     $(this).attr("disabled", "disabled");
     epidemy.run();
   });
   stopButton.click(function() {
     startButton.removeAttr("disabled");
     epidemy.stop();
   });
 });

